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
      description: "Look up a client by id, email, or name. Returns the client record (never the password hash).",
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
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            id ? { id } : undefined,
            email ? { email } : undefined,
            name ? { name: { contains: name, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as object[],
        },
        select: CLIENT_SELECT,
      });
      return text(client ?? { error: "No client found." });
    }
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List projects, optionally filtered by client and/or status.",
      inputSchema: {
        clientId: z.string().optional(),
        status: z.enum(["in_progress", "completed", "on_hold"]).optional(),
      },
    },
    async ({ clientId, status }) => {
      const projects = await prisma.project.findMany({
        where: { clientId, status },
        orderBy: { updatedAt: "desc" },
      });
      return text(projects);
    }
  );

  server.registerTool(
    "get_project_status",
    {
      title: "Get project status",
      description: "Fetch a single project's full detail by id.",
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      return text(project ?? { error: "No project found." });
    }
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description: "List invoices, optionally filtered by client and/or status. Use status to surface unpaid/overdue invoices.",
      inputSchema: {
        clientId: z.string().optional(),
        status: z.enum(["unpaid", "paid", "overdue"]).optional(),
      },
    },
    async ({ clientId, status }) => {
      const invoices = await prisma.invoice.findMany({
        where: { clientId, status },
        orderBy: { dueAt: "asc" },
      });
      return text(invoices);
    }
  );

  server.registerTool(
    "get_retainer_status",
    {
      title: "Get retainer status",
      description: "Fetch retainer detail(s), optionally scoped to a single client.",
      inputSchema: { clientId: z.string().optional() },
    },
    async ({ clientId }) => {
      const retainers = await prisma.retainer.findMany({
        where: { clientId },
        orderBy: { renewalAt: "asc" },
      });
      return text(retainers);
    }
  );

  server.registerTool(
    "list_upcoming_renewals",
    {
      title: "List upcoming renewals",
      description: "List active retainers whose renewalAt falls within the given number of days from now.",
      inputSchema: { withinDays: z.number().int().positive() },
    },
    async ({ withinDays }) => {
      const now = new Date();
      const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
      const retainers = await prisma.retainer.findMany({
        where: { status: "active", renewalAt: { gte: now, lte: until } },
        orderBy: { renewalAt: "asc" },
      });
      return text(retainers);
    }
  );

  server.registerTool(
    "list_client_notes",
    {
      title: "List client notes",
      description: "Chronological note history for a client, optionally scoped to a project.",
      inputSchema: {
        clientId: z.string(),
        projectId: z.string().optional(),
      },
    },
    async ({ clientId, projectId }) => {
      const notes = await prisma.clientNote.findMany({
        where: { clientId, projectId },
        orderBy: { createdAt: "desc" },
      });
      return text(notes);
    }
  );
}
