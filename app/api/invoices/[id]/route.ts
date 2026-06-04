import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/invoices/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { error } = await supabase.from("Invoice").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/invoices/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { number, amount, clientId, projectId, status, dueAt, paidAt } = await req.json();

  const { data: invoice, error } = await supabase
    .from("Invoice")
    .update({
      number,
      amount: parseFloat(amount),
      clientId,
      projectId: projectId || null,
      status,
      dueAt: new Date(dueAt).toISOString(),
      paidAt: paidAt ? new Date(paidAt).toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, client:Client(id, name, company), project:Project(id, title)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(invoice);
}
