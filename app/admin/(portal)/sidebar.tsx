"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import Image from "next/image";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: Briefcase },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/retainers", label: "Retainers", icon: CreditCard },
];

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white text-slate-900">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 p-1">
            <Image
              src="/logo.jpg"
              alt="Logo"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-sm text-black">AnchorTech Innovations</p>
            <p className="mt-1 text-xs text-slate-400">Admin workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-cyan-500/10 text-cyan-700"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="truncate text-sm font-medium text-slate-900">
            {adminName}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
