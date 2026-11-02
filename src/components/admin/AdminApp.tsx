"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicSlot, Reservation } from "@/lib/types";
import { api } from "./api";
import ListTab from "./ListTab";
import Login from "./Login";
import ReservationsTab from "./ReservationsTab";
import SettingsTab from "./SettingsTab";
import SlotsTab from "./SlotsTab";

const TABS = [
  { id: "reservations", label: "예약 확인" },
  { id: "slots", label: "슬롯 설정" },
  { id: "list", label: "전체 목록" },
  { id: "settings", label: "설정" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export type AdminData = {
  slots: PublicSlot[];
  reservations: Reservation[];
  reload: () => Promise<void>;
  today: string;
};

export default function AdminApp({ today }: { today: string }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabId>("reservations");
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [onlyRequests, setOnlyRequests] = useState(false);

  useEffect(() => {
    api<{ admin: boolean }>("/api/admin/login").then((r) => setAuthed(r.data.admin));
  }, []);

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([
      api<{ slots: PublicSlot[] }>("/api/admin/slots?from=2000-01-01&to=2100-12-31"),
      api<{ reservations: Reservation[] }>("/api/admin/reservations"),
    ]);
    if (s.status === 401 || r.status === 401) return setAuthed(false);
    if (s.ok) setSlots(s.data.slots);
    if (r.ok) setReservations(r.data.reservations);
  }, []);

  useEffect(() => {
    if (!authed) return;
    reload();
    // 화면을 열어 둔 동안 1분마다 새 예약과 수정 요청을 확인해요
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), 60_000);
    return () => clearInterval(timer);
  }, [authed, reload]);

  const requests = reservations.filter((r) => r.changeRequested).length;
  useEffect(() => {
    document.title = requests ? `(${requests}) 집들이 관리` : "집들이 관리";
  }, [requests]);

  if (authed === null) return <p className="p-10 text-center text-muted">불러오는 중…</p>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const data: AdminData = { slots, reservations, reload, today };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">🏠 집들이 관리</h1>
        <div className="flex items-center gap-2">
          {requests > 0 && (
            <button
              type="button"
              className="btn animate-pulse bg-red-500 text-white"
              onClick={() => {
                setTab("reservations");
                setOnlyRequests(true);
              }}
            >
              🔔 수정 요청 {requests}건
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await api("/api/admin/logout", { method: "POST" });
              setAuthed(false);
            }}
          >
            로그아웃
          </button>
        </div>
      </header>
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-paper p-1 shadow-inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              tab === t.id ? "bg-peach text-white" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "reservations" && (
        <ReservationsTab {...data} onlyRequests={onlyRequests} setOnlyRequests={setOnlyRequests} />
      )}
      {tab === "slots" && <SlotsTab {...data} />}
      {tab === "list" && <ListTab {...data} />}
      {tab === "settings" && <SettingsTab />}
    </main>
  );
}
