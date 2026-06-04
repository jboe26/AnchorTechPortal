import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true } },
    },
  });
  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { number, amount, clientId, projectId, status, dueAt } = await req.json();

  if (!number || !amount || !clientId || !dueAt) {
    return Response.json({ error: "Number, amount, client, and due date are required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      number,
      amount: parseFloat(amount),
      clientId,
      projectId: projectId || null,
      status: status ?? "unpaid",
      dueAt: new Date(dueAt),
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true } },
    },
  });

  return Response.json(invoice, { status: 201 });
}
