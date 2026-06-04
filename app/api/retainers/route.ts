import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function calcRenewal(tier: string): Date {
  const now = new Date();
  if (tier === "yearly") {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
  return new Date(now.setMonth(now.getMonth() + 1));
}

export async function GET() {
  await requireAdmin();
  const retainers = await prisma.retainer.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, company: true } } },
  });
  return Response.json(retainers);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { clientId, tier, price, status, renewalAt } = await req.json();

  if (!clientId || !tier || !price) {
    return Response.json({ error: "Client, tier, and price are required" }, { status: 400 });
  }

  const retainer = await prisma.retainer.create({
    data: {
      clientId,
      tier,
      price: parseFloat(price),
      status: status ?? "active",
      renewalAt: renewalAt ? new Date(renewalAt) : calcRenewal(tier),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return Response.json(retainer, { status: 201 });
}
