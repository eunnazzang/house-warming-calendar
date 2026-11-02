import { json, readJson, requireAdmin } from "@/lib/http";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return json({ settings: await getSettings() });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await readJson<Partial<Settings>>(req);
  return json({ settings: await saveSettings(body) });
}
