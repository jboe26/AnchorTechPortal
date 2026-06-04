import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      phone: true,
      createdAt: true,
      _count: { select: { projects: true, invoices: true } },
    },
  });
  return Response.json(clients);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { email, name, company, phone, password } = await req.json();

  if (!email || !name || !password) {
    return Response.json({ error: "Email, name, and password are required" }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const client = await prisma.client.create({
    data: { email, name, company, phone, password: hashed },
    select: { id: true, email: true, name: true, company: true, phone: true, createdAt: true },
  });

  return Response.json(client, { status: 201 });
}
