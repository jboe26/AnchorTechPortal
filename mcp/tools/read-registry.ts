import { z } from "zod";
import type { PortalCore } from "../../core/portal.js";

/**
 * Single source of truth for the portal's read-only tool contracts.
 *
 * The MCP server (mcp/tools/read.ts) and the Anchor OS HTTP bridge
 * (app/api/anchor-os/route.ts) both dispatch through this table, so a tool's
 * name, input shape, and behavior can't drift between the two transports.
 */
export const readTools = {
  get_client: {
    title: "Get client",
    description:
      "Read-only. Look up a client by id, email, or name. id/email are exact matches; name is a case-insensitive partial match and can return up to 10 results. Never returns the password hash.",
    inputSchema: {
      id: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
    },
    handler: (core: PortalCore, args: { id?: string; email?: string; name?: string }) =>
      core.getClient(args),
  },

  list_projects: {
    title: "List projects",
    description:
      "Read-only. List projects, optionally filtered by client and/or status, joined with client name.",
    inputSchema: {
      clientId: z.string().optional(),
      status: z.enum(["in_progress", "completed", "on_hold"]).optional(),
    },
    handler: (
      core: PortalCore,
      args: { clientId?: string; status?: "in_progress" | "completed" | "on_hold" }
    ) => core.listProjects(args),
  },

  get_project_status: {
    title: "Get project status",
    description:
      "Read-only. Fetch a single project's full detail by id, including its client name and its invoices.",
    inputSchema: { projectId: z.string() },
    handler: (core: PortalCore, args: { projectId: string }) => core.getProjectStatus(args),
  },

  list_invoices: {
    title: "List invoices",
    description:
      "Read-only. List invoices, optionally filtered by client and/or status, joined with client name and project title. Includes a computed totalAmount for the filtered set.",
    inputSchema: {
      clientId: z.string().optional(),
      status: z.enum(["unpaid", "paid", "overdue"]).optional(),
    },
    handler: (
      core: PortalCore,
      args: { clientId?: string; status?: "unpaid" | "paid" | "overdue" }
    ) => core.listInvoices(args),
  },

  get_retainer_status: {
    title: "Get retainer status",
    description:
      "Read-only. Fetch retainer detail(s) joined with client name, optionally scoped to a single client.",
    inputSchema: { clientId: z.string().optional() },
    handler: (core: PortalCore, args: { clientId?: string }) => core.getRetainerStatus(args),
  },

  list_upcoming_renewals: {
    title: "List upcoming renewals",
    description:
      "Read-only. List active retainers, joined with client name, whose renewalAt falls within the given number of days from now.",
    inputSchema: { withinDays: z.number().int().positive() },
    handler: (core: PortalCore, args: { withinDays: number }) => core.listUpcomingRenewals(args),
  },

  list_client_notes: {
    title: "List client notes",
    description:
      "Read-only. Chronological note history for a client (newest first), optionally scoped to a project, joined with author name where present. Defaults to the 20 most recent notes.",
    inputSchema: {
      clientId: z.string(),
      projectId: z.string().optional(),
      limit: z.number().int().positive().max(100).default(20),
    },
    handler: (
      core: PortalCore,
      args: { clientId: string; projectId?: string; limit?: number }
    ) => core.listClientNotes(args),
  },
} satisfies Record<
  string,
  {
    title: string;
    description: string;
    inputSchema: z.ZodRawShape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (core: PortalCore, args: any) => Promise<unknown>;
  }
>;

export type ReadToolName = keyof typeof readTools;
