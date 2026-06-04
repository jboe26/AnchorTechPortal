import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireAdmin();
  const { data: invoices, error } = await supabase
    .from("Invoice")
    .select("*, client:Client(id, name, company), project:Project(id, title)")
    .order("createdAt", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { number, amount, clientId, projectId, status, dueAt } = await req.json();

  if (!number || !amount || !clientId || !dueAt) {
    return Response.json({ error: "Number, amount, client, and due date are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: invoice, error } = await supabase
    .from("Invoice")
    .insert({
      id: randomUUID(),
      number,
      amount: parseFloat(amount),
      clientId,
      projectId: projectId || null,
      status: status ?? "unpaid",
      dueAt: new Date(dueAt).toISOString(),
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .select("*, client:Client(id, name, company), project:Project(id, title)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(invoice, { status: 201 });
}
