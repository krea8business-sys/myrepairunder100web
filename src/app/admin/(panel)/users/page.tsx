import { asc } from "drizzle-orm";
import { UsersManager } from "@/components/admin/UsersManager";
import { PageHeader } from "@/components/admin/ui";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Admin users" };

export default async function UsersPage() {
  const me = await requireAdminPage("OWNER");
  const users = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name, role: schema.adminUsers.role, active: schema.adminUsers.active, lastLoginAt: schema.adminUsers.lastLoginAt })
    .from(schema.adminUsers)
    .orderBy(asc(schema.adminUsers.name));
  return (
    <div>
      <PageHeader title="Admin users" description="OWNER: everything. MANAGER: bookings, catalogue, areas, scheduling, technicians, export. STAFF: bookings only." />
      <UsersManager users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))} meId={me.id} />
    </div>
  );
}
