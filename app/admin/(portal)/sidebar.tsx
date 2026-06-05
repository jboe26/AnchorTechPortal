"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  LogOut,
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
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 relative">
            <Image
              src="/logo.jpg"
              alt="Logo"
              fill
              sizes="36px"
              className="object-contain rounded-lg"
            />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none text-sm whitespace-nowrap">
              AnchorTech Innovations
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-medium text-slate-700 truncate">
            {adminName}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
