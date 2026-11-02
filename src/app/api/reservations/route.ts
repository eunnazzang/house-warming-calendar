import { fail, json, readJson } from "@/lib/http";
import { BOOKING_STATUS, BookingError, createReservation, validateInput } from "@/lib/reservations";

export async function POST(req: Request) {
  const body = await readJson(req);
  const slotId = Number(body.slotId);
  if (!Number.isInteger(slotId)) return fail("슬롯을 골라 주세요.");
  try {
    const input = validateInput(body);
    const { token } = await createReservation(slotId, input);
    return json({ token }, 201);
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message, BOOKING_STATUS[e.code], { code: e.code });
    throw e;
  }
}
