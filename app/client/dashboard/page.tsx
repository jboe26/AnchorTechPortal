import { requireClient } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  LogOut,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

const projectStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  in_progress: {
    label: "In Progress",
    className: "bg-blue-500/15 text-blue-300",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  on_hold: { label: "On Hold", className: "bg-amber-500/15 text-amber-300" },
};

const invoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unpaid: { label: "Unpaid", className: "bg-amber-500/15 text-amber-300" },
  paid: { label: "Paid", className: "bg-emerald-500/15 text-emerald-300" },
  overdue: { label: "Overdue", className: "bg-rose-500/15 text-rose-300" },
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
    return <div className="p-8 text-slate-300">Client not found.</div>;

  const unpaidAmount = (invoices ?? [])
    .filter((i: any) => i.status !== "paid")
    .reduce((sum: number, i: any) => sum + i.amount, 0);
  const activeRetainer = (retainers ?? []).find(
    (r: any) => r.status === "active",
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
              <Image
                src="/logo.jpg"
                alt="AnchorTech logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                AnchorTech Innovations
              </p>
              <p className="text-xs text-slate-500">Client portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{client.name}</p>
              <p className="text-xs text-slate-400">
                {client.company ?? client.email}
              </p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
                <Sparkles className="h-4 w-4" />
                Welcome back
              </div>
              <h1 className="text-3xl font-semibold text-white">
                Hello, {client.name.split(" ")[0]}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Your workspace is now organized around the details that matter
                most: live projects, upcoming invoices, and your current
                retainer.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-white">Current focus</p>
              <p className="mt-1">
                {activeRetainer
                  ? `AnchorCare ${activeRetainer.tier}`
                  : "No active retainer"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Active projects</p>
              <BriefcaseBusiness className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-semibold text-white">
              {
                (projects ?? []).filter((p: any) => p.status === "in_progress")
                  .length
              }
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Outstanding balance</p>
              <FileText className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-semibold text-white">
              ${unpaidAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Retainer</p>
              <CreditCard className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-2xl font-semibold capitalize text-slate-950">
              {activeRetainer ? activeRetainer.tier : "None"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Projects</h2>
              <span className="text-sm text-slate-400">
                {(projects ?? []).length} total
              </span>
            </div>
            {(projects ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                No projects yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(projects ?? []).map((p: any) => {
                  const config = projectStatusConfig[p.status] ?? {
                    label: p.status,
                    className: "bg-slate-500/15 text-slate-300",
                  };
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {p.title}
                        </p>
                        {p.description ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {p.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Invoices</h2>
              <span className="text-sm text-slate-400">
                {(invoices ?? []).length} total
              </span>
            </div>
            {(invoices ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                No invoices yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(invoices ?? []).map((inv: any) => {
                  const config = invoiceStatusConfig[inv.status] ?? {
                    label: inv.status,
                    className: "bg-slate-500/15 text-slate-300",
                  };
                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {inv.number}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Due{" "}
                            {inv.dueAt
                              ? new Date(inv.dueAt).toLocaleDateString()
                              : "No due date"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Amount</span>
                        <span className="font-semibold text-white">
                          ${inv.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {activeRetainer ? (
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-200">
                  AnchorCare
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {activeRetainer.tier === "monthly" ? "Monthly" : "Yearly"}{" "}
                  plan is active
                </h2>
                <p className="mt-2 text-sm text-blue-100">
                  ${activeRetainer.price.toFixed(2)}/
                  {activeRetainer.tier === "monthly" ? "mo" : "yr"} · Renews{" "}
                  {new Date(activeRetainer.renewalAt).toLocaleDateString()}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white">
                <ArrowRight className="h-4 w-4" />
                Active now
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
