import { fail, json, readJson, requireAdmin } from "@/lib/http";
import {
  BOOKING_STATUS,
  BookingError,
  deleteReservation,
  resolveChange,
  updateReservation,
  validateInput,
} from "@/lib/reservations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number((await params).id);
  const body = await readJson(req);
  try {
    if (body.action === "resolve") {
      return (await resolveChange(id)) ? json({ ok: true }) : fail("예약을 찾을 수 없어요.", 404);
    }
    const input = validateInput(body);
    const ok = await updateReservation(id, Number(body.slotId), input, !!body.force);
    return ok ? json({ ok: true }) : fail("예약을 찾을 수 없어요.", 404);
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message, BOOKING_STATUS[e.code], { code: e.code });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ok = await deleteReservation(Number((await params).id));
  return ok ? json({ ok: true }) : fail("예약을 찾을 수 없어요.", 404);
}
