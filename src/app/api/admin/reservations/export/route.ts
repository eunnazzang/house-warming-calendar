import { PERIOD_LABEL } from "@/lib/constants";
import { requireAdmin } from "@/lib/http";
import { formatPhone } from "@/lib/phone";
import { listReservations } from "@/lib/reservations";

function cell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const rows = await listReservations();
  const header = ["날짜", "시간대", "이름", "연락처", "팀", "선호 메뉴", "메모", "차량번호", "수정 요청", "수정 요청 내용", "예약 시각"];
  const lines = rows.map((r) =>
    [
      r.date,
      PERIOD_LABEL[r.period],
      r.name,
      formatPhone(r.phone),
      r.teams.join(" / "),
      r.menu,
      r.memo,
      r.carNumber,
      r.changeRequested ? "예" : "",
      r.changeNote,
      new Date(r.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    ].map(cell).join(","),
  );
  // 엑셀에서 한글이 깨지지 않게 BOM을 붙여요
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("집들이_예약.csv")}`,
      "Cache-Control": "no-store",
    },
  });
}
