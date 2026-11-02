"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import { DEFAULT_CAPACITY, DEFAULT_WEEKS, PERIOD_LABEL, PERIODS, type Period } from "@/lib/constants";
import { addDays, formatShortDate, monthGrid, weekday } from "@/lib/date";
import type { AdminData } from "./AdminApp";
import { api } from "./api";

type Conflict = { date: string; period: Period; booked: number; capacity: number };

export default function SlotsTab({ slots, reload, today }: AdminData) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<Record<Period, string>>({ lunch: "", dinner: "" });
  const [times, setTimes] = useState({ lunchStart: "", lunchEnd: "", dinnerStart: "", dinnerEnd: "" });
  const [showTimes, setShowTimes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const slotOf = (date: string, period: Period) => slots.find((s) => s.date === date && s.period === period);
  const toggle = (date: string) =>
    setSelected((sel) => (sel.includes(date) ? sel.filter((d) => d !== date) : [...sel, date].sort()));

  const selectWeekend = () => {
    // 오늘이 속한 주의 금·토·일 (이미 지난 날은 빼요)
    const dow = weekday(today);
    const friday = addDays(today, dow === 0 ? -2 : 5 - dow);
    const days = [friday, addDays(friday, 1), addDays(friday, 2)].filter((d) => d >= today);
    setSelected(days);
    setMonth(days[0].slice(0, 7));
  };
  const selectMonthWeekends = () =>
    setSelected(
      monthGrid(month)
        .flat()
        .filter((d): d is string => !!d && d >= today && [0, 5, 6].includes(weekday(d))),
    );

  const apply = async (force = false) => {
    const updates = selected.flatMap((date) =>
      PERIODS.flatMap((period) => {
        const cap = capacity[period];
        const start = times[`${period}Start`];
        const end = times[`${period}End`];
        const hasTime = showTimes && (start || end);
        if (cap === "" && !hasTime) return [];
        return [
          {
            date,
            period,
            ...(cap !== "" ? { capacity: Number(cap) } : {}),
            ...(hasTime ? { startTime: start, endTime: end } : {}),
          },
        ];
      }),
    );
    if (!updates.length) return setMessage("정원이나 시간대를 입력해 주세요.");
    const res = await api<{ conflicts?: Conflict[]; saved?: number }>("/api/admin/slots", {
      method: "PUT",
      body: JSON.stringify({ updates, force }),
    });
    if (res.status === 409 && res.data.conflicts) {
      const lines = res.data.conflicts
        .map((c) => `· ${formatShortDate(c.date)} ${PERIOD_LABEL[c.period]}: 이미 ${c.booked}명 예약, 정원 ${c.capacity}명으로 변경`)
        .join("\n");
      if (confirm(`이미 예약된 인원보다 정원이 적어져요.\n${lines}\n\n그래도 바꿀까요? (예약은 지워지지 않아요)`)) apply(true);
      return;
    }
    if (!res.ok) return setMessage(res.data.error ?? "저장하지 못했어요.");
    setMessage(`${selected.length}일 저장했어요.`);
    await reload();
  };

  const single = selected.length === 1 ? selected[0] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="card">
        <Calendar
          month={month}
          onMonthChange={setMonth}
          renderDay={(date) => {
            const past = date < today;
            const isSel = selected.includes(date);
            return (
              <button
                type="button"
                disabled={past}
                onClick={() => toggle(date)}
                className={`flex min-h-16 w-full flex-col items-center rounded-xl border p-1 text-xs transition ${
                  isSel ? "border-peach bg-peach/15" : "border-line bg-white"
                } ${past ? "opacity-40" : "hover:border-peach"}`}
              >
                <span className="font-bold">{Number(date.slice(8))}</span>
                {PERIODS.map((p) => {
                  const s = slotOf(date, p);
                  if (!s || (s.capacity === 0 && s.booked === 0)) return null;
                  return (
                    <span key={p} className={`leading-4 ${s.closed ? "text-off line-through" : ""}`}>
                      {PERIOD_LABEL[p][0]} {s.booked}/{s.capacity}
                    </span>
                  );
                })}
              </button>
            );
          }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !py-1.5" onClick={selectWeekend}>
            이번 주말 선택
          </button>
          <button type="button" className="btn-ghost !py-1.5" onClick={selectMonthWeekends}>
            이 달 금·토·일 선택
          </button>
          <button type="button" className="btn-ghost !py-1.5" onClick={() => setSelected([])}>
            선택 해제
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">날짜를 눌러 여러 개 고를 수 있어요. 칸의 숫자는 예약/정원이에요.</p>
      </section>

      <div className="space-y-5">
        <section className="card space-y-4">
          <h2 className="font-display text-lg">
            {selected.length ? `${selected.length}일 선택됨` : "날짜를 골라 주세요"}
          </h2>
          {selected.length > 0 && (
            <p className="text-xs text-muted">{selected.map(formatShortDate).join(", ")}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {PERIODS.map((p) => (
              <div key={p}>
                <label className="label" htmlFor={`cap-${p}`}>
                  {PERIOD_LABEL[p]} 정원
                </label>
                <input
                  id={`cap-${p}`}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  className="input"
                  placeholder="그대로"
                  value={capacity[p]}
                  onChange={(e) => setCapacity({ ...capacity, [p]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">0명이면 그 슬롯을 닫아요. 비워 두면 바꾸지 않아요.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTimes} onChange={(e) => setShowTimes(e.target.checked)} />
            이 날짜만 시간대 따로 정하기
          </label>
          {showTimes && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(["lunchStart", "lunchEnd", "dinnerStart", "dinnerEnd"] as const).map((k) => (
                <label key={k}>
                  {k.startsWith("lunch") ? "점심" : "저녁"} {k.endsWith("Start") ? "시작" : "끝"}
                  <input
                    type="time"
                    className="input !py-2"
                    value={times[k]}
                    onChange={(e) => setTimes({ ...times, [k]: e.target.value })}
                  />
                </label>
              ))}
              <p className="col-span-2 text-xs text-muted">비워 두면 설정 탭의 기본 시간대를 써요.</p>
            </div>
          )}
          <button type="button" className="btn-primary w-full" disabled={!selected.length} onClick={() => apply()}>
            적용하기
          </button>
          {message && <p className="text-sm font-bold text-ok">{message}</p>}
        </section>

        {single && <DayDetail date={single} slots={PERIODS.map((p) => slotOf(single, p))} reload={reload} />}

        <PatternBox today={today} reload={reload} />
      </div>
    </div>
  );
}

function DayDetail({
  date,
  slots,
  reload,
}: {
  date: string;
  slots: (AdminData["slots"][number] | undefined)[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="card space-y-2">
      <h2 className="font-display text-lg">{formatShortDate(date)} 현황</h2>
      {slots.map((s, i) =>
        s ? (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span>
              {PERIOD_LABEL[s.period]} {s.start}~{s.end} · {s.booked}/{s.capacity}명 {s.closed && "· 마감함"}
            </span>
            {s.capacity > 0 && (
              <button
                type="button"
                className={s.closed ? "btn-ghost !px-3 !py-1 text-xs" : "btn-danger !px-3 !py-1 text-xs"}
                onClick={async () => {
                  await api("/api/admin/slots/close", {
                    method: "POST",
                    body: JSON.stringify({ slotId: s.id, closed: !s.closed }),
                  });
                  reload();
                }}
              >
                {s.closed ? "다시 열기" : "마감하기"}
              </button>
            )}
          </div>
        ) : (
          <p key={i} className="text-sm text-muted">
            {PERIOD_LABEL[PERIODS[i]]}: 열지 않음
          </p>
        ),
      )}
    </section>
  );
}

function PatternBox({ today, reload }: { today: string; reload: () => Promise<void> }) {
  const [start, setStart] = useState(today);
  const [weeks, setWeeks] = useState(String(DEFAULT_WEEKS));
  const [cap, setCap] = useState(String(DEFAULT_CAPACITY));
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="card space-y-3">
      <h2 className="font-display text-lg">📅 기본 일정 한 번에 열기</h2>
      <p className="text-sm text-muted">매주 금요일 저녁, 토요일 점심·저녁, 일요일 점심·저녁을 열어요. 이미 있는 슬롯은 그대로 둬요.</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="col-span-3">
          시작 날짜
          <input type="date" className="input !py-2" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          몇 주
          <input type="number" className="input !py-2" min={1} max={26} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </label>
        <label className="col-span-2">
          슬롯마다 정원
          <input type="number" className="input !py-2" min={0} max={100} value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={async () => {
          const r = await api<{ created: number }>("/api/admin/slots/pattern", {
            method: "POST",
            body: JSON.stringify({ startDate: start, weeks: Number(weeks), capacity: Number(cap) }),
          });
          setMessage(r.ok ? `새 슬롯 ${r.data.created}개를 열었어요.` : r.data.error ?? "실패했어요.");
          reload();
        }}
      >
        기본 일정 열기
      </button>
      {message && <p className="text-sm font-bold text-ok">{message}</p>}
    </section>
  );
}
