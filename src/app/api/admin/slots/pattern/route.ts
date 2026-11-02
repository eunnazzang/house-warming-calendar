import { fail, json, readJson, requireAdmin } from "@/lib/http";
import { openDefaultPattern } from "@/lib/slots";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { startDate, weeks, capacity } = await readJson<{ startDate?: string; weeks?: number; capacity?: number }>(req);
  const w = Number(weeks);
  const c = Number(capacity);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) return fail("시작 날짜가 필요해요.");
  if (!Number.isInteger(w) || w < 1 || w > 26) return fail("주 수는 1~26 사이예요.");
  if (!Number.isInteger(c) || c < 0 || c > 100) return fail("정원은 0~100 사이 숫자예요.");
  return json({ created: await openDefaultPattern(String(startDate), w, c) });
}
