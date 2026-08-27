import { requireClient } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  BriefcaseBusiness,
  Check,
  CreditCard,
  FileText,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { ChatPanel } from "./chat-panel";

const retainerFeatures: Record<string, string[]> = {
  monthly: [
    "Unlimited small edits (content, images, wording, tweaks)",
    "Monthly updates + backups",
    "Security + performance monitoring",
    "Priority response",
  ],
  yearly: [
    "Unlimited small edits",
    "Full yearly maintenance + backups",
    "Performance + SEO tune-ups",
    "Minor fixes throughout the year",
    "Optional 30-minute strategy call",
  ],
};

const projectStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  in_progress: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
  },
  on_hold: { label: "On Hold", className: "bg-amber-50 text-amber-700" },
};

const invoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unpaid: { label: "Unpaid", className: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Overdue", className: "bg-rose-50 text-rose-700" },
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-200 bg-white px-6 py-4 shadow-sm shadow-slate-200/60">
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
              <p className="text-sm font-medium text-slate-900">{client.name}</p>
              <p className="text-xs text-slate-500">
                {client.company ?? client.email}
              </p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </header>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-slate-800 p-8 shadow-lg shadow-slate-900/10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-indigo-100">
                Welcome back
              </div>
              <h1 className="text-3xl font-semibold text-white lg:text-4xl">
                Hello, {client.name.split(" ")[0]}.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Your workspace is organized around the details that matter
                most: live projects, upcoming invoices, and your current
                retainer.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                  {activeRetainer
                    ? `AnchorCare ${activeRetainer.tier}`
                    : "No active retainer"}
                </span>
                <span className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200">
                  {client.company ?? client.email}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Your plan
                </h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Plan</p>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-900">
                    {activeRetainer
                      ? `AnchorCare ${activeRetainer.tier}`
                      : "None"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Renews</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {activeRetainer
                      ? new Date(activeRetainer.renewalAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Active projects</p>
              <BriefcaseBusiness className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {
                (projects ?? []).filter((p: any) => p.status === "in_progress")
                  .length
              }
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Outstanding balance</p>
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              ${unpaidAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Retainer</p>
              <CreditCard className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-semibold capitalize text-slate-900">
              {activeRetainer ? activeRetainer.tier : "None"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <span className="text-sm text-slate-500">
                {(projects ?? []).length} total
              </span>
            </div>
            {(projects ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No projects yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(projects ?? []).map((p: any) => {
                  const config = projectStatusConfig[p.status] ?? {
                    label: p.status,
                    className: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {p.title}
                        </p>
                        {p.description ? (
                          <p className="mt-1 text-xs text-slate-500">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
              <span className="text-sm text-slate-500">
                {(invoices ?? []).length} total
              </span>
            </div>
            {(invoices ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No invoices yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(invoices ?? []).map((inv: any) => {
                  const config = invoiceStatusConfig[inv.status] ?? {
                    label: inv.status,
                    className: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {inv.number}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
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
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Amount</span>
                        <span className="font-semibold text-slate-900">
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

        <ChatPanel />

        {activeRetainer ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  AnchorCare
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {activeRetainer.tier === "monthly" ? "Monthly" : "Yearly"}{" "}
                  plan is active
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  ${activeRetainer.price.toFixed(2)}/
                  {activeRetainer.tier === "monthly" ? "mo" : "yr"} · Renews{" "}
                  {new Date(activeRetainer.renewalAt).toLocaleDateString()}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {(retainerFeatures[activeRetainer.tier] ?? []).map(
                    (feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
