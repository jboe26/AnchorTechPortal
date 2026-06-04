import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireAdmin();
  const { data: projects, error } = await supabase
    .from("Project")
    .select("*, client:Client(id, name, company)")
    .order("createdAt", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { title, description, clientId, status, startDate, endDate } = await req.json();

  if (!title || !clientId) {
    return Response.json({ error: "Title and client are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: project, error } = await supabase
    .from("Project")
    .insert({
      id: randomUUID(),
      title,
      description,
      clientId,
      status: status ?? "in_progress",
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      createdAt: now,
      updatedAt: now,
    })
    .select("*, client:Client(id, name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(project, { status: 201 });
}
