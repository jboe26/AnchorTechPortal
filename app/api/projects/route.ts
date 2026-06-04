import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, company: true } } },
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { title, description, clientId, status, startDate, endDate } = await req.json();

  if (!title || !clientId) {
    return Response.json({ error: "Title and client are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      title,
      description,
      clientId,
      status: status ?? "in_progress",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  return Response.json(project, { status: 201 });
}
