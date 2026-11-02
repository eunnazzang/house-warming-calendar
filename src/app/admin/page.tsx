import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";
import { todayKST } from "@/lib/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "집들이 관리",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp today={todayKST()} />;
}
