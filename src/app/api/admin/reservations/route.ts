import { json, requireAdmin } from "@/lib/http";
import { listReservations } from "@/lib/reservations";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return json({ reservations: await listReservations() });
}
