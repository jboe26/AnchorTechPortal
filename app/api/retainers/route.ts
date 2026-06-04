import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";

function calcRenewal(tier: string): string {
  const now = new Date();
  if (tier === "yearly") {
    return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
  }
  return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
}

export async function GET() {
  await requireAdmin();
  const { data: retainers, error } = await supabase
    .from("Retainer")
    .select("*, client:Client(id, name, company)")
    .order("createdAt", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(retainers);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { clientId, tier, price, status, renewalAt } = await req.json();

  if (!clientId || !tier || !price) {
    return Response.json({ error: "Client, tier, and price are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: retainer, error } = await supabase
    .from("Retainer")
    .insert({
      id: randomUUID(),
      clientId,
      tier,
      price: parseFloat(price),
      status: status ?? "active",
      renewalAt: renewalAt ? new Date(renewalAt).toISOString() : calcRenewal(tier),
      createdAt: now,
      updatedAt: now,
    })
    .select("*, client:Client(id, name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(retainer, { status: 201 });
}
