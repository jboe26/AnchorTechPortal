"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Sparkles } from "lucide-react";
import Image from "next/image";

export default function ClientLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    startTransition(async () => {
      const res = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
      } else {
        router.push("/client/dashboard");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-14 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/60">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <Image
              src="/logo.jpg"
              alt="AnchorTech logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Client portal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your hub for projects, invoices, and retainer updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Looking for admin access?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-blue-300 hover:text-blue-200"
          >
            Switch portal
          </Link>
        </p>
      </div>
    </div>
  );
}
