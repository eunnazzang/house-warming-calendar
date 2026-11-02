"use client";

import { WEEKDAYS, monthGrid, monthLabel, shiftMonth } from "@/lib/date";

type Props = {
  month: string;
  onMonthChange: (month: string) => void;
  renderDay: (date: string) => React.ReactNode;
  minMonth?: string;
};

export default function Calendar({ month, onMonthChange, renderDay, minMonth }: Props) {
  const canGoBack = !minMonth || month > minMonth;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost h-10 w-10 !p-0"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={!canGoBack}
          aria-label="이전 달"
        >
          ‹
        </button>
        <h2 className="font-display text-xl">{monthLabel(month)}</h2>
        <button
          type="button"
          className="btn-ghost h-10 w-10 !p-0"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-500" : ""}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(month).flat().map((date, i) =>
          date ? <div key={date}>{renderDay(date)}</div> : <div key={`empty-${i}`} />,
        )}
      </div>
    </div>
  );
}
