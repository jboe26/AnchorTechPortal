import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, deleteSession, getSession } from "./session";
import { redirect } from "next/navigation";

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return { error: "Invalid credentials" };

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return { error: "Invalid credentials" };

  await createSession({ userId: admin.id, role: "admin", email: admin.email, name: admin.name });
  return { success: true };
}

export async function loginClient(email: string, password: string) {
  const client = await prisma.client.findUnique({ where: { email } });
  if (!client) return { error: "Invalid credentials" };

  const valid = await bcrypt.compare(password, client.password);
  if (!valid) return { error: "Invalid credentials" };

  await createSession({ userId: client.id, role: "client", email: client.email, name: client.name });
  return { success: true };
}

export async function logout() {
  await deleteSession();
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");
  return session;
}

export async function requireClient() {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/client/login");
  return session;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
