import { fail, json, readJson } from "@/lib/http";
import { getMyReservation, requestChange } from "@/lib/reservations";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const reservation = await getMyReservation((await params).token);
  return reservation ? json({ reservation }) : fail("예약을 찾을 수 없어요.", 404);
}

// 게스트는 직접 수정하지 못하고 "수정을 원해요"만 남길 수 있어요
export async function POST(req: Request, { params }: Ctx) {
  const { note } = await readJson<{ note?: string }>(req);
  const ok = await requestChange((await params).token, String(note ?? ""));
  return ok ? json({ ok: true }) : fail("예약을 찾을 수 없어요.", 404);
}
