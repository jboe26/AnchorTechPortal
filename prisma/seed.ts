import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.adminUser.findUnique({
    where: { email: "joshboepple@anchortech.org" },
  });

  if (existing) {
    console.log("Admin user already exists.");
    return;
  }

  const password = await bcrypt.hash("AnchorAdmin2026!", 12);
  const admin = await prisma.adminUser.create({
    data: {
      email: "joshboepple@anchortech.org",
      name: "Josh Boepple",
      password,
    },
  });

  console.log("Created admin:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
