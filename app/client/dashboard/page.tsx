"use client";

import { requireClient } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Briefcase, FileText, CreditCard, LogOut } from "lucide-react";
import Image from "next/image";
import { PayPalButton } from "@/app/components/paypal-button";

const projectStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", className: "bg-amber-100 text-amber-700" },
};

const invoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unpaid: { label: "Unpaid", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
};

export default async function ClientDashboard() {
  const session = await requireClient();

  const [
    { data: client },
    { data: projects },
    { data: invoices },
    { data: retainers },
  ] = await Promise.all([
    supabase
      .from("Client")
      .select("id, email, name, company, phone")
      .eq("id", session.userId)
      .single(),
    supabase
      .from("Project")
      .select("*")
      .eq("clientId", session.userId)
      .order("createdAt", { ascending: false }),
    supabase
      .from("Invoice")
      .select("*")
      .eq("clientId", session.userId)
      .order("createdAt", { ascending: false }),
    supabase
      .from("Retainer")
      .select("*")
      .eq("clientId", session.userId)
      .order("createdAt", { ascending: false }),
  ]);

  if (!client)
    return <div className="p-8 text-slate-500">Client not found.</div>;

  const unpaidAmount = (invoices ?? [])
    .filter((i: any) => i.status !== "paid")
    .reduce((s: number, i: any) => s + i.amount, 0);

  const activeRetainer = (retainers ?? []).find(
    (r: any) => r.status === "active",
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 relative">
              <Image
                src="/logo.jpg"
                alt="Logo"
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">
                AnchorTech Innovations
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {client.name}
              </p>
              <p className="text-xs text-slate-400">
                {client.company ?? client.email}
              </p>
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
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {client.name.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here's an overview of your account
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Active Projects</p>
              <Briefcase className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {
                (projects ?? []).filter((p: any) => p.status === "in_progress")
                  .length
              }
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Unpaid Amount</p>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              ${unpaidAmount.toFixed(2)}
            </p>
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
            {(projects ?? []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No projects yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(projects ?? []).map((p: any) => {
                  const { label, className } = projectStatusConfig[
                    p.status
                  ] ?? {
                    label: p.status,
                    className: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <div
                      key={p.id}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {p.title}
                        </p>
                        {p.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {p.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}
                      >
                        {label}
                      </span>
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
            {(invoices ?? []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No invoices yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(invoices ?? []).map((inv: any) => {
                  const { label, className } = invoiceStatusConfig[
                    inv.status
                  ] ?? {
                    label: inv.status,
                    className: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <div key={inv.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {inv.number}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Due{" "}
                            {inv.dueAt
                              ? new Date(inv.dueAt).toLocaleDateString()
                              : "No due date"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            ${inv.amount.toFixed(2)}
                          </p>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
                          >
                            {label}
                          </span>
                        </div>
                      </div>
                      {inv.status === "unpaid" && (
                        <PayPalButton
                          invoiceId={inv.id}
                          amount={inv.amount}
                          invoiceNumber={inv.number}
                        />
                      )}
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
                <p className="font-semibold text-blue-900">
                  AnchorCare{" "}
                  {activeRetainer.tier === "monthly" ? "Monthly" : "Yearly"}{" "}
                  Plan
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  ${activeRetainer.price.toFixed(2)}/
                  {activeRetainer.tier === "monthly" ? "mo" : "yr"} · Renews{" "}
                  {new Date(activeRetainer.renewalAt).toLocaleDateString()}
                </p>
              </div>
              <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                Active
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
