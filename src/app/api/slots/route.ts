import { fail, json } from "@/lib/http";
import { addDays, shiftMonth } from "@/lib/date";
import { listSlots } from "@/lib/slots";

// 게스트용: 슬롯별 인원 수만. 예약자 정보는 담지 않아요.
export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("month=YYYY-MM 형식이 필요해요.");
  const slots = await listSlots(`${month}-01`, addDays(`${shiftMonth(month, 1)}-01`, -1), false);
  return json({ slots });
}
