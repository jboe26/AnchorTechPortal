import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireAdmin();
  const { data: clients, error } = await supabase
    .from("Client")
    .select("id, email, name, company, phone, createdAt, projects:Project(count), invoices:Invoice(count)")
    .order("createdAt", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const result = (clients ?? []).map((c: any) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    company: c.company,
    phone: c.phone,
    createdAt: c.createdAt,
    _count: {
      projects: c.projects?.[0]?.count ?? 0,
      invoices: c.invoices?.[0]?.count ?? 0,
    },
  }));

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { email, name, company, phone, password } = await req.json();

  if (!email || !name || !password) {
    return Response.json({ error: "Email, name, and password are required" }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const now = new Date().toISOString();
  const { data: client, error } = await supabase
    .from("Client")
    .insert({ id: randomUUID(), email, name, company, phone, password: hashed, createdAt: now, updatedAt: now })
    .select("id, email, name, company, phone, createdAt")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(client, { status: 201 });
}
