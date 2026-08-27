import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PortalCore } from "../../core/portal.js";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Write tools are a thin transport shell over the portal core. The two-step
 * confirmation lives in the core rather than here, so no adapter can offer a
 * write that skips it.
 */
export function registerWriteTools(server: McpServer, core: PortalCore) {
  server.registerTool(
    "update_project_status",
    {
      title: "Update project status",
      description:
        "Change a project's status. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        projectId: z.string(),
        status: z.enum(["in_progress", "completed", "on_hold"]),
        confirm: z.boolean().default(false),
      },
    },
    async (args) => text(await core.updateProjectStatus(args))
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create invoice",
      description:
        "Create a new invoice for a client. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        clientId: z.string(),
        amount: z.number().positive(),
        dueAt: z.string().describe("ISO 8601 date"),
        projectId: z.string().optional(),
        confirm: z.boolean().default(false),
      },
    },
    async (args) => text(await core.createInvoice(args))
  );

  server.registerTool(
    "mark_invoice_paid",
    {
      title: "Mark invoice paid",
      description:
        "Mark an invoice as paid. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        invoiceId: z.string(),
        paidAt: z.string().describe("ISO 8601 date").optional(),
        confirm: z.boolean().default(false),
      },
    },
    async (args) => text(await core.markInvoicePaid(args))
  );

  server.registerTool(
    "add_client_note",
    {
      title: "Add client note",
      description:
        "Append a note to a client's history. Notes are internal unless visibility is set to shared. Requires confirm: true to apply — the first call without it returns a preview of the change.",
      inputSchema: {
        clientId: z.string(),
        content: z.string(),
        projectId: z.string().optional(),
        source: z.enum(["manual", "assistant"]).default("assistant"),
        visibility: z.enum(["internal", "shared"]).default("internal"),
        confirm: z.boolean().default(false),
      },
    },
    async (args) => text(await core.addClientNote(args))
  );
}
