import GuestApp from "@/components/GuestApp";
import { todayKST } from "@/lib/date";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSettings();
  return <GuestApp settings={settings} today={todayKST()} />;
}
