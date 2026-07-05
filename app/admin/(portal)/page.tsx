import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  CreditCard,
  FileText,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

async function getStats() {
  const [
    { count: totalClients },
    { count: activeProjects },
    { count: totalInvoices },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase.from("Client").select("*", { count: "exact", head: true }),
    supabase
      .from("Project")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase.from("Invoice").select("*", { count: "exact", head: true }),
    supabase
      .from("Invoice")
      .select("amount")
      .in("status", ["unpaid", "overdue"]),
  ]);

  const unpaidAmount = (unpaidInvoices ?? []).reduce(
    (sum: number, inv: any) => sum + inv.amount,
    0,
  );

  return {
    totalClients: totalClients ?? 0,
    activeProjects: activeProjects ?? 0,
    totalInvoices: totalInvoices ?? 0,
    unpaidAmount,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    {
      label: "Total clients",
      value: stats.totalClients,
      icon: Users,
      accent: "from-blue-500 to-cyan-500",
    },
    {
      label: "Active projects",
      value: stats.activeProjects,
      icon: BriefcaseBusiness,
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      label: "Invoices issued",
      value: stats.totalInvoices,
      icon: FileText,
      accent: "from-amber-500 to-orange-500",
    },
    {
      label: "Outstanding balance",
      value: `$${stats.unpaidAmount.toLocaleString()}`,
      icon: CreditCard,
      accent: "from-rose-500 to-pink-500",
    },
  ];

  const quickActions = [
    { href: "/admin/clients", label: "Add client", icon: Users },
    {
      href: "/admin/projects",
      label: "Track project",
      icon: BriefcaseBusiness,
    },
    { href: "/admin/invoices", label: "Review invoices", icon: FileText },
    { href: "/admin/retainers", label: "Manage retainers", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">
            Operations overview
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Your portal feels lighter, faster, and clearer.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Keep a pulse on your clients, projects, invoices, and retainers from
            one polished workspace.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200"
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Quick actions
              </h2>
              <p className="text-sm text-slate-600">
                Jump straight into the work that matters most.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-400/50 hover:bg-blue-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/70 text-slate-200 group-hover:text-blue-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {label}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
