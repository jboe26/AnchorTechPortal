import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { email, name, company, phone, password } = await req.json();

  const data: Record<string, unknown> = { email, name, company, phone };
  if (password) data.password = await hashPassword(password);

  const client = await prisma.client.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, company: true, phone: true, createdAt: true },
  });

  return Response.json(client);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.client.delete({ where: { id } });
  return Response.json({ success: true });
}
