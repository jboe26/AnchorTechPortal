import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.project.delete({ where: { id } });
  return Response.json({ success: true });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { title, description, clientId, status, startDate, endDate } = await req.json();

  const project = await prisma.project.update({
    where: { id },
    data: {
      title,
      description,
      clientId,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return Response.json(project);
}
