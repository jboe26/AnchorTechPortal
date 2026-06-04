import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/retainers/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { error } = await supabase.from("Retainer").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/retainers/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { clientId, tier, price, status, renewalAt } = await req.json();

  const { data: retainer, error } = await supabase
    .from("Retainer")
    .update({
      clientId,
      tier,
      price: parseFloat(price),
      status,
      renewalAt: new Date(renewalAt).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, client:Client(id, name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(retainer);
}
