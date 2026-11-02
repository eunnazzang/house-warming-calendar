"use client";

import { PERIOD_LABEL } from "@/lib/constants";
import { formatShortDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import type { AdminData } from "./AdminApp";

export default function ListTab({ reservations }: AdminData) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg">전체 예약 {reservations.length}건</h2>
        <a href="/api/admin/reservations/export" download className="btn-ghost !py-1.5">
          CSV 내려받기
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              {["날짜", "시간대", "이름", "연락처", "팀", "메뉴", "메모", "차량", "수정 요청"].map((h) => (
                <th key={h} className="px-2 py-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-b border-line/60 align-top">
                <td className="whitespace-nowrap px-2 py-2">{formatShortDate(r.date)}</td>
                <td className="px-2 py-2">{PERIOD_LABEL[r.period]}</td>
                <td className="whitespace-nowrap px-2 py-2 font-bold">{r.name}</td>
                <td className="whitespace-nowrap px-2 py-2">{formatPhone(r.phone)}</td>
                <td className="px-2 py-2">{r.teams.join(", ")}</td>
                <td className="px-2 py-2">{r.menu}</td>
                <td className="max-w-48 whitespace-pre-line px-2 py-2">{r.memo}</td>
                <td className="px-2 py-2">{r.carNumber}</td>
                <td className="px-2 py-2 text-red-600">{r.changeRequested ? r.changeNote || "요청함" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
