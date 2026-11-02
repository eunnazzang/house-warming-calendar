import { PERIODS, type Period } from "@/lib/constants";
import { fail, json, readJson, requireAdmin } from "@/lib/http";
import { listSlots, upsertSlots, type SlotUpdate } from "@/lib/slots";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return fail("from, to 날짜가 필요해요.");
  }
  return json({ slots: await listSlots(from, to, true) });
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// 여러 날짜의 정원과 시간대를 한 번에 설정
export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await readJson<{ updates?: unknown[]; force?: boolean }>(req);
  const updates: SlotUpdate[] = [];
  for (const raw of body.updates ?? []) {
    const u = raw as Record<string, unknown>;
    const date = String(u.date ?? "");
    const period = u.period as Period;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !PERIODS.includes(period)) return fail("날짜나 시간대가 잘못됐어요.");
    const update: SlotUpdate = { date, period };
    if (u.capacity !== undefined && u.capacity !== null && u.capacity !== "") {
      const capacity = Number(u.capacity);
      if (!Number.isInteger(capacity) || capacity < 0 || capacity > 100) return fail("정원은 0~100 사이 숫자예요.");
      update.capacity = capacity;
    }
    for (const key of ["startTime", "endTime"] as const) {
      if (u[key] === undefined) continue;
      const v = String(u[key] ?? "");
      if (v && !TIME.test(v)) return fail("시간은 12:00 형식으로 입력해 주세요.");
      update[key] = v || null;
    }
    updates.push(update);
  }
  if (!updates.length) return fail("바꿀 슬롯이 없어요.");
  const result = await upsertSlots(updates, !!body.force);
  if (result.conflicts.length && !body.force) {
    return json({ error: "예약 인원보다 정원이 적어지는 슬롯이 있어요.", conflicts: result.conflicts }, 409);
  }
  return json(result);
}
