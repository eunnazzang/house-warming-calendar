import { fail, json, readJson } from "@/lib/http";
import { isValidPhone } from "@/lib/phone";
import { findMyTokens } from "@/lib/reservations";

export async function POST(req: Request) {
  const { name, phone } = await readJson<{ name?: string; phone?: string }>(req);
  if (!name?.trim() || !phone || !isValidPhone(phone)) return fail("이름과 연락처를 정확히 입력해 주세요.");
  return json({ reservations: await findMyTokens(name, phone) });
}
