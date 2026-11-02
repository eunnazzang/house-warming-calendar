import Link from "next/link";
import { notFound } from "next/navigation";
import ChangeRequest from "@/components/ChangeRequest";
import { PERIOD_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { getMyReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function MyReservationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await getMyReservation(token);
  if (!r) notFound();

  const rows: [string, string][] = [
    ["날짜", formatDate(r.date)],
    ["시간대", `${PERIOD_LABEL[r.period]} (${r.start} ~ ${r.end})`],
    ["이름", r.name],
    ["연락처", formatPhone(r.phone)],
    ["팀", r.teams.join(", ")],
    ["선호 메뉴", r.menu],
    ["메모", r.memo || "-"],
    ["차량번호", r.carNumber || "-"],
  ];

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-16 pt-8">
      <Link href="/" className="text-sm text-muted">
        ‹ 예약 페이지로
      </Link>
      <h1 className="font-display text-2xl">내 예약</h1>
      <section className="card space-y-1.5">
        {rows.map(([k, v]) => (
          <p key={k} className="flex justify-between gap-4">
            <span className="shrink-0 text-muted">{k}</span>
            <b className="whitespace-pre-line text-right">{v}</b>
          </p>
        ))}
      </section>
      <ChangeRequest token={token} requested={r.changeRequested} note={r.changeNote} />
    </main>
  );
}
