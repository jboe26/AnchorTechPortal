import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/invoices/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.invoice.delete({ where: { id } });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/invoices/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { number, amount, clientId, projectId, status, dueAt, paidAt } = await req.json();

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      number,
      amount: parseFloat(amount),
      clientId,
      projectId: projectId || null,
      status,
      dueAt: new Date(dueAt),
      paidAt: paidAt ? new Date(paidAt) : null,
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true } },
    },
  });

  return Response.json(invoice);
}
