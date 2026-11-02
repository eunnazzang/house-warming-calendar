"use client";

import Link from "next/link";
import { useState } from "react";
import { PERIOD_LABEL, type Period } from "@/lib/constants";
import { formatDate } from "@/lib/date";

type Found = { token: string; date: string; period: Period };

export default function FindMyReservation() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/my/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setFound(data.reservations);
    } catch {
      setError("인터넷 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-16 pt-8">
      <Link href="/" className="text-sm text-muted">
        ‹ 예약 페이지로
      </Link>
      <h1 className="font-display text-2xl">내 예약 찾기</h1>
      <form onSubmit={search} className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">
            이름
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            연락처
          </label>
          <input
            id="phone"
            className="input"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
          />
        </div>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "찾는 중…" : "찾기"}
        </button>
      </form>
      {found && (
        <section className="card space-y-2">
          {found.length === 0 ? (
            <p className="text-muted">예약을 찾지 못했어요. 이름과 연락처를 예약할 때와 똑같이 입력했는지 확인해 주세요.</p>
          ) : (
            found.map((f) => (
              <Link
                key={f.token}
                href={`/my/${f.token}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 hover:border-peach"
              >
                <span className="font-bold">
                  {formatDate(f.date)} {PERIOD_LABEL[f.period]}
                </span>
                <span className="text-peach">보기 ›</span>
              </Link>
            ))
          )}
        </section>
      )}
    </main>
  );
}
