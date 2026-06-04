import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { error } = await supabase.from("Project").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { title, description, clientId, status, startDate, endDate } = await req.json();

  const { data: project, error } = await supabase
    .from("Project")
    .update({
      title,
      description,
      clientId,
      status,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, client:Client(id, name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(project);
}
