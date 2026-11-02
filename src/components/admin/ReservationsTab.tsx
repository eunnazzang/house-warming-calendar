"use client";

import { useState } from "react";
import ReservationFields, { formError, type ReservationForm } from "@/components/ReservationFields";
import Sheet from "@/components/Sheet";
import { MENUS, PERIOD_LABEL, TEAMS } from "@/lib/constants";
import { formatDate, formatShortDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { STATUS_STYLE, slotStatus } from "@/lib/status";
import type { PublicSlot, Reservation } from "@/lib/types";
import type { AdminData } from "./AdminApp";
import { api } from "./api";

type Props = AdminData & { onlyRequests: boolean; setOnlyRequests: (v: boolean) => void };

export default function ReservationsTab({ slots, reservations, reload, today, onlyRequests, setOnlyRequests }: Props) {
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const visible = slots.filter((s) => {
    const rs = reservations.filter((r) => r.slotId === s.id);
    if (onlyRequests) return rs.some((r) => r.changeRequested);
    if (!showPast && s.date < today) return false;
    return s.capacity > 0 || rs.length > 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyRequests} onChange={(e) => setOnlyRequests(e.target.checked)} />
          수정 요청만 보기
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          지난 날짜도 보기
        </label>
      </div>
      {visible.length === 0 && (
        <p className="card text-center text-muted">
          {onlyRequests ? "수정 요청이 없어요." : "열린 슬롯이 없어요. '슬롯 설정'에서 날짜를 열어 주세요."}
        </p>
      )}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {visible.map((s) => (
          <SlotCard
            key={s.id}
            slot={s}
            reservations={reservations.filter((r) => r.slotId === s.id)}
            reload={reload}
            onEdit={setEditing}
          />
        ))}
      </div>
      <EditSheet reservation={editing} slots={slots} today={today} onClose={() => setEditing(null)} reload={reload} />
    </div>
  );
}

function tally(items: string[], order: readonly string[]) {
  return order
    .map((k) => [k, items.filter((i) => i === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
}

function SlotCard({
  slot,
  reservations,
  reload,
  onEdit,
}: {
  slot: PublicSlot;
  reservations: Reservation[];
  reload: () => Promise<void>;
  onEdit: (r: Reservation) => void;
}) {
  const status = slotStatus(slot);
  const toggleClosed = async () => {
    await api("/api/admin/slots/close", {
      method: "POST",
      body: JSON.stringify({ slotId: slot.id, closed: !slot.closed }),
    });
    reload();
  };
  const menus = tally(reservations.map((r) => r.menu), MENUS);
  const teams = tally(reservations.flatMap((r) => r.teams), TEAMS);

  return (
    <section className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">
            {formatDate(slot.date)} {PERIOD_LABEL[slot.period]}
          </h3>
          <p className="text-sm text-muted">
            {slot.start} ~ {slot.end}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full border px-3 py-1 text-sm font-bold ${STATUS_STYLE[status]}`}>
            {slot.booked}/{slot.capacity}명{slot.closed ? " · 마감함" : status === "full" ? " · 마감" : ""}
          </span>
          {slot.capacity > 0 && (
            <button type="button" className="text-xs font-bold text-muted underline" onClick={toggleClosed}>
              {slot.closed ? "다시 열기" : "지금 마감하기"}
            </button>
          )}
        </div>
      </div>
      {reservations.length > 0 && (
        <div className="rounded-2xl bg-cream px-4 py-2 text-sm">
          <p>
            <b>메뉴</b> {menus}
          </p>
          <p>
            <b>팀</b> {teams}
          </p>
        </div>
      )}
      <ul className="space-y-2">
        {reservations.map((r) => (
          <ReservationItem key={r.id} r={r} reload={reload} onEdit={() => onEdit(r)} />
        ))}
        {reservations.length === 0 && <li className="text-sm text-muted">아직 예약이 없어요.</li>}
      </ul>
    </section>
  );
}

function ReservationItem({ r, reload, onEdit }: { r: Reservation; reload: () => Promise<void>; onEdit: () => void }) {
  const cancel = async () => {
    if (!confirm(`${r.name}님의 예약을 취소할까요?\n취소하면 자리가 다시 열려요.`)) return;
    await api(`/api/admin/reservations/${r.id}`, { method: "DELETE" });
    reload();
  };
  const resolve = async () => {
    await api(`/api/admin/reservations/${r.id}`, { method: "PATCH", body: JSON.stringify({ action: "resolve" }) });
    reload();
  };
  return (
    <li className={`rounded-2xl border p-3 text-sm ${r.changeRequested ? "border-red-300 bg-red-50" : "border-line bg-white"}`}>
      {r.changeRequested && (
        <div className="mb-2 rounded-xl bg-white p-2">
          <p className="font-bold text-red-600">🔔 {r.name}님이 수정을 원해요</p>
          {r.changeNote && <p className="whitespace-pre-line">“{r.changeNote}”</p>}
          <button type="button" className="mt-1 text-xs font-bold text-red-600 underline" onClick={resolve}>
            처리 완료
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <b className="text-base">{r.name}</b>{" "}
          <a href={`tel:${r.phone}`} className="text-peach-dark underline">
            {formatPhone(r.phone)}
          </a>
        </p>
        <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-bold">{r.menu}</span>
      </div>
      <p className="text-muted">{r.teams.join(", ")}</p>
      {r.memo && <p className="mt-1 whitespace-pre-line">📝 {r.memo}</p>}
      {r.carNumber && <p className="mt-1">🚗 {r.carNumber}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onEdit}>
          수정
        </button>
        <button type="button" className="btn-danger !px-3 !py-1.5 text-xs" onClick={cancel}>
          예약 취소
        </button>
      </div>
    </li>
  );
}

function EditSheet({
  reservation,
  slots,
  today,
  onClose,
  reload,
}: {
  reservation: Reservation | null;
  slots: PublicSlot[];
  today: string;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  return (
    <Sheet open={!!reservation} onClose={onClose} title="예약 수정">
      {reservation && (
        <EditForm key={reservation.id} r={reservation} slots={slots} today={today} onClose={onClose} reload={reload} />
      )}
    </Sheet>
  );
}

function EditForm({
  r,
  slots,
  today,
  onClose,
  reload,
}: {
  r: Reservation;
  slots: PublicSlot[];
  today: string;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const [slotId, setSlotId] = useState(r.slotId);
  const [form, setForm] = useState<ReservationForm>({
    name: r.name,
    phone: formatPhone(r.phone),
    teams: r.teams,
    menu: r.menu,
    memo: r.memo,
    carNumber: r.carNumber,
  });
  const [error, setError] = useState<string | null>(null);
  const choices = slots.filter((s) => s.id === r.slotId || (s.date >= today && s.capacity > 0));

  const save = async (force = false) => {
    const problem = formError(form);
    if (problem) return setError(problem);
    if (!force && !confirm("수정하시겠습니까?")) return;
    const res = await api(`/api/admin/reservations/${r.id}`, {
      method: "PATCH",
      body: JSON.stringify({ slotId, ...form, force }),
    });
    if (res.ok) {
      await reload();
      onClose();
    } else if (res.data.error && res.status === 409 && (res.data as { code?: string }).code === "full") {
      if (confirm(`${res.data.error}\n정원을 넘겨서라도 옮길까요?`)) save(true);
    } else {
      setError(res.data.error ?? "수정하지 못했어요.");
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div>
        <label className="label" htmlFor="edit-slot">
          날짜와 시간대
        </label>
        <select id="edit-slot" className="input" value={slotId} onChange={(e) => setSlotId(Number(e.target.value))}>
          {choices.map((s) => (
            <option key={s.id} value={s.id}>
              {formatShortDate(s.date)} {PERIOD_LABEL[s.period]} ({s.booked}/{s.capacity}명)
            </option>
          ))}
        </select>
      </div>
      <ReservationFields value={form} onChange={setForm} />
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>
          닫기
        </button>
        <button type="submit" className="btn-primary flex-[2]">
          저장
        </button>
      </div>
    </form>
  );
}
