import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }
  return <AdminDashboard />;
}
