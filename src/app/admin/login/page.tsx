import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";
import mark from "../../../../public/brand/logo-mark.png";
import { getCurrentAdmin } from "@/server/admin-auth";

export const metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-screen place-items-center bg-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src={mark} alt="" className="mb-3 h-16 w-auto" priority />
          <span className="text-xl font-extrabold text-navy-900">MyRepair<span className="text-brand-700">Under100</span></span>
          <p className="mt-1 text-sm text-ink-muted">Admin dashboard</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">Authorised staff only. Sign-in attempts are rate-limited and logged.</p>
      </div>
    </div>
  );
}
