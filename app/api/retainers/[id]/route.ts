import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/retainers/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.retainer.delete({ where: { id } });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/retainers/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { clientId, tier, price, status, renewalAt } = await req.json();

  const retainer = await prisma.retainer.update({
    where: { id },
    data: {
      clientId,
      tier,
      price: parseFloat(price),
      status,
      renewalAt: new Date(renewalAt),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return Response.json(retainer);
}
