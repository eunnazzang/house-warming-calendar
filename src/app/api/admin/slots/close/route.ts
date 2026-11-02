import { fail, json, readJson, requireAdmin } from "@/lib/http";
import { setSlotClosed } from "@/lib/slots";

// 정원과 상관없이 직접 마감하거나 다시 열기
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { slotId, closed } = await readJson<{ slotId?: number; closed?: boolean }>(req);
  const ok = await setSlotClosed(Number(slotId), !!closed);
  return ok ? json({ ok: true }) : fail("슬롯을 찾을 수 없어요.", 404);
}
