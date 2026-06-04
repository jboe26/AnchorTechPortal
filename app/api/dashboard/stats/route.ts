import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  const [totalClients, activeProjects, totalInvoices, unpaidInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.project.count({ where: { status: "in_progress" } }),
    prisma.invoice.count(),
    prisma.invoice.findMany({
      where: { status: { in: ["unpaid", "overdue"] } },
      select: { amount: true },
    }),
  ]);

  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return Response.json({ totalClients, activeProjects, totalInvoices, unpaidAmount });
}
