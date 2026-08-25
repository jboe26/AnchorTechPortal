import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../db.js";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function pending(summary: string, change: unknown) {
  return text({
    status: "pending_confirmation",
    summary,
    change,
    instructions: "No changes have been made. Present this to the user and call this tool again with confirm: true only after they explicitly approve it.",
  });
}

export function registerWriteTools(server: McpServer) {
  server.registerTool(
    "update_project_status",
    {
      title: "Update project status",
      description: "Change a project's status. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        projectId: z.string(),
        status: z.enum(["in_progress", "completed", "on_hold"]),
        confirm: z.boolean().default(false),
      },
    },
    async ({ projectId, status, confirm }) => {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return text({ error: "No project found." });

      const change = { projectId, title: project.title, from: project.status, to: status };
      if (!confirm) {
        return pending(`Set project "${project.title}" (${projectId}) status: ${project.status} -> ${status}`, change);
      }

      const updated = await prisma.project.update({ where: { id: projectId }, data: { status } });
      return text({ status: "applied", project: updated });
    }
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create invoice",
      description: "Create a new invoice for a client. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        clientId: z.string(),
        amount: z.number().positive(),
        dueAt: z.string().describe("ISO 8601 date"),
        projectId: z.string().optional(),
        confirm: z.boolean().default(false),
      },
    },
    async ({ clientId, amount, dueAt, projectId, confirm }) => {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return text({ error: "No client found." });

      const change = { clientId, clientName: client.name, projectId, amount, dueAt };
      if (!confirm) {
        return pending(`Create invoice for ${client.name}: $${amount.toFixed(2)}, due ${dueAt}`, change);
      }

      const count = await prisma.invoice.count();
      const number = `INV-${String(count + 1).padStart(5, "0")}`;
      const invoice = await prisma.invoice.create({
        data: { number, amount, dueAt: new Date(dueAt), clientId, projectId },
      });
      return text({ status: "applied", invoice });
    }
  );

  server.registerTool(
    "mark_invoice_paid",
    {
      title: "Mark invoice paid",
      description: "Mark an invoice as paid. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        invoiceId: z.string(),
        paidAt: z.string().describe("ISO 8601 date").optional(),
        confirm: z.boolean().default(false),
      },
    },
    async ({ invoiceId, paidAt, confirm }) => {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return text({ error: "No invoice found." });

      const resolvedPaidAt = paidAt ? new Date(paidAt) : new Date();
      const change = { invoiceId, number: invoice.number, amount: invoice.amount, paidAt: resolvedPaidAt.toISOString() };
      if (!confirm) {
        return pending(`Mark invoice ${invoice.number} ($${invoice.amount.toFixed(2)}) paid as of ${resolvedPaidAt.toISOString()}`, change);
      }

      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "paid", paidAt: resolvedPaidAt },
      });
      return text({ status: "applied", invoice: updated });
    }
  );

  server.registerTool(
    "add_client_note",
    {
      title: "Add client note",
      description: "Append a note to a client's history. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        clientId: z.string(),
        content: z.string(),
        projectId: z.string().optional(),
        source: z.enum(["manual", "assistant"]).default("assistant"),
        confirm: z.boolean().default(false),
      },
    },
    async ({ clientId, content, projectId, source, confirm }) => {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return text({ error: "No client found." });

      const change = { clientId, clientName: client.name, projectId, source, content };
      if (!confirm) {
        return pending(`Add ${source} note to ${client.name}: "${content}"`, change);
      }

      const note = await prisma.clientNote.create({
        data: { clientId, content, projectId, source },
      });
      return text({ status: "applied", note });
    }
  );
}
