import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/server/admin-auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminNav admin={{ name: admin.name, role: admin.role, email: admin.email }} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
