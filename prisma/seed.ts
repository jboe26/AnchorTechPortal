import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const FORCE = process.argv.includes("--force");
const ADMIN_EMAIL = "joshboepple@anchortech.org";
const ADMIN_PASSWORD = "AnchorAdmin2026!";
const CLIENT_PASSWORD = "AnchorClient2026!";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const existingClients = await prisma.client.count();
  if (existingClients > 0 && !FORCE) {
    console.error(
      `Refusing to seed: ${existingClients} client row(s) already exist. Pass --force to seed anyway (this does not delete existing data).`
    );
    process.exit(1);
  }

  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: "Josh Boepple", password: adminPassword },
  });

  const clientPassword = await bcrypt.hash(CLIENT_PASSWORD, 12);

  const [clientA, clientB, clientC] = await Promise.all([
    prisma.client.create({
      data: {
        email: "client1@example.com",
        name: "Dana Whitfield",
        company: "Whitfield Logistics",
        phone: "555-0101",
        password: clientPassword,
      },
    }),
    prisma.client.create({
      data: {
        email: "client2@example.com",
        name: "Marcus Reyes",
        company: null,
        phone: null,
        password: clientPassword,
      },
    }),
    prisma.client.create({
      data: {
        email: "client3@example.com",
        name: "Priya Nandakumar",
        company: "Nandakumar Consulting",
        phone: "555-0103",
        password: clientPassword,
      },
    }),
  ]);

  const [projA1, projA2, projB1, projC1, projC2] = await Promise.all([
    prisma.project.create({
      data: { title: "Website Rebuild", status: "in_progress", clientId: clientA.id, startDate: daysFromNow(-60) },
    }),
    prisma.project.create({
      data: { title: "SEO Audit", status: "completed", clientId: clientA.id, startDate: daysFromNow(-120), endDate: daysFromNow(-30) },
    }),
    prisma.project.create({
      data: { title: "Brand Refresh", status: "on_hold", clientId: clientB.id, startDate: daysFromNow(-45) },
    }),
    prisma.project.create({
      data: { title: "Internal Dashboard", status: "in_progress", clientId: clientC.id, startDate: daysFromNow(-20) },
    }),
    prisma.project.create({
      data: { title: "Data Migration", status: "completed", clientId: clientC.id, startDate: daysFromNow(-90), endDate: daysFromNow(-10) },
    }),
  ]);

  await Promise.all([
    prisma.invoice.create({
      data: { number: "INV-2026-001", amount: 4200, status: "paid", clientId: clientA.id, projectId: projA1.id, dueAt: daysFromNow(-30), paidAt: daysFromNow(-32) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-002", amount: 1800, status: "unpaid", clientId: clientA.id, projectId: projA2.id, dueAt: daysFromNow(15) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-003", amount: 3100, status: "overdue", clientId: clientA.id, projectId: projA1.id, dueAt: daysFromNow(-10) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-004", amount: 2500, status: "paid", clientId: clientB.id, projectId: projB1.id, dueAt: daysFromNow(-45), paidAt: daysFromNow(-46) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-005", amount: 950, status: "overdue", clientId: clientB.id, projectId: projB1.id, dueAt: daysFromNow(-5) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-006", amount: 6000, status: "unpaid", clientId: clientC.id, projectId: projC1.id, dueAt: daysFromNow(20) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-007", amount: 3300, status: "paid", clientId: clientC.id, projectId: projC2.id, dueAt: daysFromNow(-60), paidAt: daysFromNow(-61) },
    }),
    prisma.invoice.create({
      data: { number: "INV-2026-008", amount: 1200, status: "unpaid", clientId: clientC.id, projectId: projC2.id, dueAt: daysFromNow(40) },
    }),
  ]);

  await Promise.all([
    prisma.retainer.create({
      data: { tier: "monthly", price: 800, status: "active", clientId: clientA.id, renewalAt: daysFromNow(10) },
    }),
    prisma.retainer.create({
      data: { tier: "yearly", price: 9000, status: "active", clientId: clientB.id, renewalAt: daysFromNow(45) },
    }),
    prisma.retainer.create({
      data: { tier: "monthly", price: 600, status: "cancelled", clientId: clientC.id, renewalAt: daysFromNow(-5) },
    }),
  ]);

  await Promise.all([
    prisma.clientNote.create({
      data: { clientId: clientA.id, projectId: projA1.id, authorId: admin.id, source: "manual", content: "Kickoff call went well, client wants a phased rollout." },
    }),
    prisma.clientNote.create({
      data: { clientId: clientA.id, projectId: projA2.id, source: "assistant", content: "SEO audit flagged 12 broken links; summary sent to client." },
    }),
    prisma.clientNote.create({
      data: { clientId: clientB.id, projectId: projB1.id, authorId: admin.id, source: "manual", content: "Brand refresh paused pending client budget approval." },
    }),
    prisma.clientNote.create({
      data: { clientId: clientB.id, source: "assistant", content: "Retainer renewal reminder sent 45 days ahead of schedule." },
    }),
    prisma.clientNote.create({
      data: { clientId: clientC.id, projectId: projC1.id, authorId: admin.id, source: "manual", content: "Dashboard requirements finalized after second review." },
    }),
    prisma.clientNote.create({
      data: { clientId: clientC.id, projectId: projC2.id, source: "assistant", content: "Data migration completed; verified row counts match source." },
    }),
  ]);

  console.log("Seed complete.");
  console.log(`Admin: ${admin.email} / ${ADMIN_PASSWORD}`);
  console.log(`Clients: ${[clientA, clientB, clientC].map((c) => c.email).join(", ")} / ${CLIENT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
