"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Calendar from "@/components/Calendar";
import ReservationFields, { EMPTY_FORM, formError, type ReservationForm } from "@/components/ReservationFields";
import Sheet from "@/components/Sheet";
import { DirectionsCard, NoticeCard } from "@/components/VenueInfo";
import { PERIOD_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import type { Settings } from "@/lib/settings";
import { STATUS_DOT, STATUS_STYLE, slotStatus } from "@/lib/status";
import type { PublicSlot } from "@/lib/types";

type Done = { slot: PublicSlot; name: string; token: string };

export default function GuestApp({ settings, today }: { settings: Settings; today: string }) {
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [form, setForm] = useState<ReservationForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slots?month=${m}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlots(data.slots);
      setLoadError(false);
      return data.slots as PublicSlot[];
    } catch {
      setLoadError(true);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const slotsOn = (date: string) => slots.filter((s) => s.date === date);

  const openForm = (s: PublicSlot) => {
    setSlot(s);
    setError(null);
  };

  const submit = async () => {
    if (!slot) return;
    const problem = formError(form);
    if (problem) return setError(problem);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "예약하지 못했어요. 잠시 후 다시 시도해 주세요.");
        if (data.code === "full" || data.code === "closed") load(month);
        return;
      }
      setDone({ slot, name: form.name.trim(), token: data.token });
      setSlot(null);
      setSelectedDate(null);
      setForm(EMPTY_FORM);
      load(month);
    } catch {
      setError("인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 pb-16 pt-8">
      <header className="text-center">
        <div className="text-5xl" aria-hidden>
          🏠
        </div>
        <h1 className="font-display mt-2 text-2xl leading-snug sm:text-3xl">{settings.title}</h1>
        <p className="mt-2 whitespace-pre-line text-muted">{settings.greeting}</p>
      </header>

      <NoticeCard notice={settings.notice} />

      <section className="card">
        <Calendar
          month={month}
          onMonthChange={setMonth}
          minMonth={thisMonth}
          renderDay={(date) => {
            const daySlots = slotsOn(date);
            const past = date < today;
            const clickable = !past && daySlots.length > 0;
            return (
              <button
                type="button"
                disabled={!clickable}
                onClick={() => setSelectedDate(date)}
                className={`flex aspect-[4/5] w-full flex-col items-center rounded-2xl border pt-1.5 text-sm transition ${
                  clickable
                    ? "border-line bg-white hover:border-peach active:scale-95"
                    : "border-transparent text-off"
                } ${past ? "opacity-40" : ""} ${date === today ? "ring-2 ring-peach/50" : ""}`}
              >
                <span className="font-bold">{Number(date.slice(8))}</span>
                {!past && (
                  <span className="mt-1 flex flex-col gap-0.5">
                    {daySlots.map((s) => (
                      <span
                        key={s.id}
                        className={`rounded-md border px-1 text-[10px] leading-4 ${STATUS_STYLE[slotStatus(s)]}`}
                      >
                        {PERIOD_LABEL[s.period]}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          }}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <Legend dot={STATUS_DOT.open} text="예약 가능" />
          <Legend dot={STATUS_DOT.last} text="1자리 남음" />
          <Legend dot={STATUS_DOT.full} text="마감" />
        </div>
        {loading && <p className="mt-3 text-center text-sm text-muted">불러오는 중…</p>}
        {loadError && (
          <p className="mt-3 text-center text-sm text-red-500">
            예약 현황을 불러오지 못했어요.{" "}
            <button type="button" className="underline" onClick={() => load(month)}>
              다시 시도
            </button>
          </p>
        )}
        {!loading && !loadError && slots.every((s) => s.date < today) && (
          <p className="mt-3 text-center text-sm text-muted">이 달에는 열린 날짜가 없어요. 다음 달을 확인해 주세요.</p>
        )}
      </section>

      <DirectionsCard settings={settings} />

      <p className="text-center text-sm text-muted">
        이미 예약하셨나요?{" "}
        <Link href="/my" className="font-bold text-peach-dark underline">
          내 예약 확인 · 수정 요청
        </Link>
      </p>

      {/* 날짜를 누르면 그날의 슬롯 */}
      <Sheet open={!!selectedDate && !slot} onClose={() => setSelectedDate(null)} title={selectedDate ? formatDate(selectedDate) : ""}>
        <div className="space-y-3">
          {selectedDate &&
            slotsOn(selectedDate).map((s) => {
              const status = slotStatus(s);
              const left = s.capacity - s.booked;
              return (
                <div key={s.id} className={`flex items-center justify-between rounded-2xl border p-4 ${STATUS_STYLE[status]}`}>
                  <div className="text-ink">
                    <p className="font-display text-lg">
                      {s.period === "lunch" ? "🍚" : "🌙"} {PERIOD_LABEL[s.period]}
                    </p>
                    <p className="text-sm text-muted">
                      {s.start} ~ {s.end}
                    </p>
                    <p className="text-sm">
                      {s.booked}/{s.capacity}명 예약됨
                      {status === "last" && <b className="ml-1 text-warn">· 1자리 남았어요!</b>}
                      {status === "open" && <span className="ml-1 text-ok">· {left}자리 남음</span>}
                    </p>
                  </div>
                  {status === "full" ? (
                    <span className="btn border border-off/30 bg-off-soft text-off">마감</span>
                  ) : (
                    <button type="button" className="btn-primary" onClick={() => openForm(s)}>
                      예약하기
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </Sheet>

      {/* 예약 입력 */}
      <Sheet
        open={!!slot}
        onClose={() => setSlot(null)}
        title={slot ? `${formatDate(slot.date)} ${PERIOD_LABEL[slot.period]}` : ""}
      >
        {slot && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-5"
          >
            <p className="rounded-2xl bg-cream px-4 py-2 text-sm text-muted">
              {slot.start} ~ {slot.end} · 지금 {slot.booked}/{slot.capacity}명
            </p>
            <ReservationFields value={form} onChange={setForm} />
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setSlot(null)}>
                뒤로
              </button>
              <button type="submit" className="btn-primary flex-[2]" disabled={submitting}>
                {submitting ? "예약하는 중…" : "예약할게요"}
              </button>
            </div>
          </form>
        )}
      </Sheet>

      {/* 예약 완료 */}
      <Sheet open={!!done} onClose={() => setDone(null)} title="예약 완료!">
        {done && <DoneView done={done} onClose={() => setDone(null)} />}
      </Sheet>
    </main>
  );
}

function Legend({ dot, text }: { dot: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

function DoneView({ done, onClose }: { done: Done; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const myUrl = typeof window !== "undefined" ? `${window.location.origin}/my/${done.token}` : `/my/${done.token}`;
  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl" aria-hidden>
        🎉
      </div>
      <p className="font-display text-xl">{done.name}님, 기다릴게요!</p>
      <div className="rounded-2xl bg-cream p-4 text-left">
        <Row k="날짜" v={formatDate(done.slot.date)} />
        <Row k="시간대" v={`${PERIOD_LABEL[done.slot.period]} (${done.slot.start} ~ ${done.slot.end})`} />
        <Row k="이름" v={done.name} />
      </div>
      <div className="rounded-2xl border border-line p-4 text-left text-sm">
        <p className="font-bold">📌 내 예약 링크</p>
        <p className="mt-1 text-muted">
          이 링크에서 예약 내용을 다시 보고, 바꾸고 싶을 때 수정 요청을 남길 수 있어요. 나만 볼 수 있으니 저장해 두세요.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href={`/my/${done.token}`} className="btn-ghost flex-1 !py-2">
            열기
          </Link>
          <button
            type="button"
            className="btn-ghost flex-1 !py-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(myUrl);
                setCopied(true);
              } catch {
                /* 무시 */
              }
            }}
          >
            {copied ? "복사했어요!" : "링크 복사"}
          </button>
        </div>
      </div>
      <button type="button" className="btn-primary w-full" onClick={onClose}>
        확인
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex justify-between gap-4 py-0.5">
      <span className="text-muted">{k}</span>
      <b className="text-right">{v}</b>
    </p>
  );
}
