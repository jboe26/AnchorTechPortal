import Link from "next/link";
import { Users, Briefcase, FileText, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";

async function getStats() {
  const [
    { count: totalClients },
    { count: activeProjects },
    { count: totalInvoices },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase.from("Client").select("*", { count: "exact", head: true }),
    supabase.from("Project").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("Invoice").select("*", { count: "exact", head: true }),
    supabase.from("Invoice").select("amount").in("status", ["unpaid", "overdue"]),
  ]);
  const unpaidAmount = (unpaidInvoices ?? []).reduce((sum: number, inv: any) => sum + inv.amount, 0);
  return {
    totalClients: totalClients ?? 0,
    activeProjects: activeProjects ?? 0,
    totalInvoices: totalInvoices ?? 0,
    unpaidAmount,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "bg-blue-500" },
    { label: "Active Projects", value: stats.activeProjects, icon: Briefcase, color: "bg-violet-500" },
    { label: "Total Invoices", value: stats.totalInvoices, icon: FileText, color: "bg-amber-500" },
    { label: "Unpaid Amount", value: `$${stats.unpaidAmount.toLocaleString()}`, icon: CreditCard, color: "bg-rose-500" },
  ];

  const quickActions = [
    { href: "/admin/clients", label: "New Client", icon: Users },
    { href: "/admin/projects", label: "New Project", icon: Briefcase },
    { href: "/admin/invoices", label: "New Invoice", icon: FileText },
    { href: "/admin/clients", label: "View All Clients", icon: Users },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back to AnchorTech Portal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">{label}</p>
              <div className={`${color} w-9 h-9 rounded-lg flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
