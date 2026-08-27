import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../db.js";

const CLIENT_SELECT = {
  id: true,
  email: true,
  name: true,
  company: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
} as const;

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerReadTools(server: McpServer) {
  server.registerTool(
    "get_client",
    {
      title: "Get client",
      description:
        "Read-only. Look up a client by id, email, or name. id/email are exact matches; name is a case-insensitive partial match and can return up to 10 results. Never returns the password hash.",
      inputSchema: {
        id: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      },
    },
    async ({ id, email, name }) => {
      if (!id && !email && !name) {
        return text({ error: "Provide at least one of id, email, or name." });
      }
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            id ? { id } : undefined,
            email ? { email } : undefined,
            name ? { name: { contains: name, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as object[],
        },
        select: CLIENT_SELECT,
        take: 10,
      });
      return text(clients.length ? clients : { error: "No client found." });
    }
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "Read-only. List projects, optionally filtered by client and/or status, joined with client name.",
      inputSchema: {
        clientId: z.string().optional(),
        status: z.enum(["in_progress", "completed", "on_hold"]).optional(),
      },
    },
    async ({ clientId, status }) => {
      const projects = await prisma.project.findMany({
        where: { clientId, status },
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true } } },
      });
      return text(projects);
    }
  );

  server.registerTool(
    "get_project_status",
    {
      title: "Get project status",
      description: "Read-only. Fetch a single project's full detail by id, including its client name and its invoices.",
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: { select: { name: true } },
          invoices: { select: { number: true, amount: true, status: true, dueAt: true } },
        },
      });
      return text(project ?? { error: "No project found." });
    }
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description:
        "Read-only. List invoices, optionally filtered by client and/or status, joined with client name and project title. Includes a computed totalAmount for the filtered set.",
      inputSchema: {
        clientId: z.string().optional(),
        status: z.enum(["unpaid", "paid", "overdue"]).optional(),
      },
    },
    async ({ clientId, status }) => {
      const invoices = await prisma.invoice.findMany({
        where: { clientId, status },
        orderBy: { dueAt: "asc" },
        include: { client: { select: { name: true } }, project: { select: { title: true } } },
      });
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      return text({ invoices, totalAmount });
    }
  );

  server.registerTool(
    "get_retainer_status",
    {
      title: "Get retainer status",
      description: "Read-only. Fetch retainer detail(s) joined with client name, optionally scoped to a single client.",
      inputSchema: { clientId: z.string().optional() },
    },
    async ({ clientId }) => {
      const retainers = await prisma.retainer.findMany({
        where: { clientId },
        orderBy: { renewalAt: "asc" },
        include: { client: { select: { name: true } } },
      });
      return text(retainers);
    }
  );

  server.registerTool(
    "list_upcoming_renewals",
    {
      title: "List upcoming renewals",
      description: "Read-only. List active retainers, joined with client name, whose renewalAt falls within the given number of days from now.",
      inputSchema: { withinDays: z.number().int().positive() },
    },
    async ({ withinDays }) => {
      const now = new Date();
      const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
      const retainers = await prisma.retainer.findMany({
        where: { status: "active", renewalAt: { gte: now, lte: until } },
        orderBy: { renewalAt: "asc" },
        include: { client: { select: { name: true } } },
      });
      return text(retainers);
    }
  );

  server.registerTool(
    "list_client_notes",
    {
      title: "List client notes",
      description:
        "Read-only. Chronological note history for a client (newest first), optionally scoped to a project, joined with author name where present. Defaults to the 20 most recent notes.",
      inputSchema: {
        clientId: z.string(),
        projectId: z.string().optional(),
        limit: z.number().int().positive().max(100).default(20),
      },
    },
    async ({ clientId, projectId, limit }) => {
      const notes = await prisma.clientNote.findMany({
        where: { clientId, projectId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { author: { select: { name: true } } },
      });
      return text(notes);
    }
  );
}
