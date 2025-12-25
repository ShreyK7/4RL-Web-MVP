import { redirect } from "next/navigation";
import { isAdmin } from "@/utils/supabase/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}

