import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");
  if (session?.role === "client") redirect("/client/dashboard");

  return (
    <main className="min-h-screen px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/90 px-6 py-5 shadow-sm shadow-slate-200/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              <Image
                src="/logo.jpg"
                alt="AnchorTech logo"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                AnchorTech Innovations
              </p>
              <p className="text-xs text-slate-500">Portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Admin sign in
            </Link>
            <Link
              href="/client/login"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Client sign in
            </Link>
          </div>
        </header>

        <section className="grid gap-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur lg:grid-cols-[1.4fr_1fr] lg:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
              <Sparkles className="h-4 w-4" />
              Rebuilt for clarity and speed
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Modern operations for every client and every team.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                AnchorTech now delivers a streamlined workspace where admins
                manage projects and billing while clients stay informed and
                connected.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start with admin access <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/client/login"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Client portal
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              What&apos;s inside
            </div>
            <div className="mt-6 space-y-4">
              {[
                {
                  title: "Live project visibility",
                  body: "Track active work without jumping between tools.",
                },
                {
                  title: "Clear billing overview",
                  body: "Stay ahead of invoices, retainers, and outstanding balances.",
                },
                {
                  title: "Secure access for both sides",
                  body: "Dedicated admin and client sign-in flows with session protection.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <p className="font-medium text-white">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
