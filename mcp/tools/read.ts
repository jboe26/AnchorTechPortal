import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PortalCore } from "../../core/portal.js";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Read tools are a thin transport shell over the portal core. All filtering,
 * tenancy and field selection lives in the core so the API surface for clients
 * inherits the same rules.
 */
export function registerReadTools(server: McpServer, core: PortalCore) {
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
    async (args) => text(await core.getClient(args))
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "Read-only. List projects, optionally filtered by client and/or status, joined with client name.",
      inputSchema: {
        clientId: z.string().optional(),
        status: z.enum(["in_progress", "completed", "on_hold"]).optional(),
      },
    },
    async (args) => text(await core.listProjects(args))
  );

  server.registerTool(
    "get_project_status",
    {
      title: "Get project status",
      description:
        "Read-only. Fetch a single project's full detail by id, including its client name and its invoices.",
      inputSchema: { projectId: z.string() },
    },
    async (args) => text(await core.getProjectStatus(args))
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
    async (args) => text(await core.listInvoices(args))
  );

  server.registerTool(
    "get_retainer_status",
    {
      title: "Get retainer status",
      description:
        "Read-only. Fetch retainer detail(s) joined with client name, optionally scoped to a single client.",
      inputSchema: { clientId: z.string().optional() },
    },
    async (args) => text(await core.getRetainerStatus(args))
  );

  server.registerTool(
    "list_upcoming_renewals",
    {
      title: "List upcoming renewals",
      description:
        "Read-only. List active retainers, joined with client name, whose renewalAt falls within the given number of days from now.",
      inputSchema: { withinDays: z.number().int().positive() },
    },
    async (args) => text(await core.listUpcomingRenewals(args))
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
    async (args) => text(await core.listClientNotes(args))
  );
}
