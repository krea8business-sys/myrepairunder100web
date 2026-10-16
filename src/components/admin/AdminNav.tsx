"use client";
import { clsx } from "clsx";
import { CalendarClock, ClipboardList, ExternalLink, History, LayoutDashboard, LogOut, MapPin, Menu, Settings, Tags, Users, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Role = "OWNER" | "MANAGER" | "STAFF";
const RANK: Record<Role, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

const ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; role: Role }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, role: "STAFF" },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList, role: "STAFF" },
  { href: "/admin/catalogue", label: "Services & prices", icon: Tags, role: "MANAGER" },
  { href: "/admin/areas", label: "Service areas", icon: MapPin, role: "MANAGER" },
  { href: "/admin/schedule", label: "Scheduling", icon: CalendarClock, role: "MANAGER" },
  { href: "/admin/technicians", label: "Technicians", icon: Wrench, role: "MANAGER" },
  { href: "/admin/settings", label: "Settings", icon: Settings, role: "OWNER" },
  { href: "/admin/users", label: "Admin users", icon: Users, role: "OWNER" },
  { href: "/admin/audit", label: "Audit log", icon: History, role: "MANAGER" },
];

export function AdminNav({ admin }: { admin: { name: string; role: Role; email: string } }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => RANK[admin.role] >= RANK[i.role]);
  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", active ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white")} aria-current={active ? "page" : undefined}>
            <i.icon className="h-[18px] w-[18px]" /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-sm font-semibold text-white">{admin.name}</p>
      <p className="truncate text-xs text-navy-300">{admin.email} · {admin.role}</p>
      <div className="mt-3 flex gap-2">
        <Link href="/" target="_blank" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-navy-200 hover:bg-white/5">
          <ExternalLink className="h-3.5 w-3.5" /> View site
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.replace("/admin/login");
            router.refresh();
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-navy-200 hover:bg-white/5"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-navy-950 px-4 lg:hidden">
        <span className="font-extrabold text-white">MRU Admin</span>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-navy-950 p-4">
            <div className="flex items-center justify-between"><span className="font-extrabold text-white">MRU Admin</span><button onClick={() => setOpen(false)} className="p-1 text-white" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-navy-950 p-4 lg:flex">
        <Link href="/admin" className="px-3 pt-2 text-lg font-extrabold text-white">MyRepair<span className="text-brand-400">Under100</span><span className="block text-xs font-medium text-navy-300">Admin dashboard</span></Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>
    </>
  );
}
