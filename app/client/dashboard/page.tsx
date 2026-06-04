import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Briefcase, FileText, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";

const projectStatusConfig = {
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", className: "bg-amber-100 text-amber-700" },
};

const invoiceStatusConfig = {
  unpaid: { label: "Unpaid", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
};

export default async function ClientDashboard() {
  const session = await requireClient();

  const client = await prisma.client.findUnique({
    where: { id: session.userId },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      retainers: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return <div className="p-8 text-slate-500">Client not found.</div>;

  const unpaidAmount = client.invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.amount, 0);

  const activeRetainer = client.retainers.find((r) => r.status === "active");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">AnchorTech</p>
              <p className="text-xs text-slate-400 mt-0.5">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{client.name}</p>
              <p className="text-xs text-slate-400">{client.company ?? client.email}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {client.name.split(" ")[0]}</h1>
          <p className="text-slate-500 text-sm mt-1">Here's an overview of your account</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Active Projects</p>
              <Briefcase className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {client.projects.filter((p) => p.status === "in_progress").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Unpaid Amount</p>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">${unpaidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">AnchorCare Plan</p>
              <CreditCard className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 capitalize">
              {activeRetainer ? activeRetainer.tier : "None"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Projects</h2>
            </div>
            {client.projects.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No projects yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {client.projects.map((p) => {
                  const { label, className } = projectStatusConfig[p.status];
                  return (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.title}</p>
                        {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                      </div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Invoices</h2>
            </div>
            {client.invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No invoices yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {client.invoices.map((inv) => {
                  const { label, className } = invoiceStatusConfig[inv.status];
                  return (
                    <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{inv.number}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Due {new Date(inv.dueAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">${inv.amount.toLocaleString()}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {activeRetainer && (
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">AnchorCare {activeRetainer.tier === "monthly" ? "Monthly" : "Yearly"} Plan</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  ${activeRetainer.price.toLocaleString()}/{activeRetainer.tier === "monthly" ? "mo" : "yr"} · Renews {new Date(activeRetainer.renewalAt).toLocaleDateString()}
                </p>
              </div>
              <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">Active</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
