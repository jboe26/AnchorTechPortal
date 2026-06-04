import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin, hashPassword } from "@/lib/auth";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { email, name, company, phone, password } = await req.json();

  const data: Record<string, unknown> = { email, name, company, phone, updatedAt: new Date().toISOString() };
  if (password) data.password = await hashPassword(password);

  const { data: client, error } = await supabase
    .from("Client")
    .update(data)
    .eq("id", id)
    .select("id, email, name, company, phone, createdAt")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(client);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { error } = await supabase.from("Client").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
