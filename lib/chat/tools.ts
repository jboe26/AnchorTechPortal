import type Anthropic from "@anthropic-ai/sdk";
import type { PortalCore } from "../../core/portal";

/**
 * The client-facing tool surface. This list is the whole allowlist: nothing
 * outside it is defined here, so `update_project_status`, `create_invoice`,
 * and `mark_invoice_paid` are not filtered out of a bigger set, they simply
 * do not exist for a client-scoped conversation.
 *
 * Byte-identical across every client and every turn (it does not depend on
 * `core` or any per-client value), so it is safe to mark as a cache
 * breakpoint. The system prompt carries the matching breakpoint.
 */
export const CLIENT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "get_client",
    description:
      "Read-only. Returns your own client record (id, email, name, company, phone). Any arguments are ignored — you can only ever look up yourself.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    name: "list_projects",
    description:
      "Read-only. List your projects, optionally filtered by status. Always scoped to your own account regardless of any clientId argument.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        status: { type: "string", enum: ["in_progress", "completed", "on_hold"] },
      },
    },
  },
  {
    name: "get_project_status",
    description:
      "Read-only. Fetch full detail for one of your projects by id, including its invoices. Returns an error if the project is not yours.",
    input_schema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
    },
  },
  {
    name: "list_invoices",
    description:
      "Read-only. List your invoices, optionally filtered by status. Includes a computed totalAmount for the filtered set. Always scoped to your own account.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        status: { type: "string", enum: ["unpaid", "paid", "overdue"] },
      },
    },
  },
  {
    name: "get_retainer_status",
    description: "Read-only. Fetch your retainer detail(s). Always scoped to your own account.",
    input_schema: {
      type: "object",
      properties: { clientId: { type: "string" } },
    },
  },
  {
    name: "list_upcoming_renewals",
    description:
      "Read-only. List your active retainers renewing within the given number of days from now.",
    input_schema: {
      type: "object",
      properties: { withinDays: { type: "integer", minimum: 1 } },
      required: ["withinDays"],
    },
  },
  {
    name: "list_client_notes",
    description:
      "Read-only. Chronological history of notes AnchorTech has shared with you (newest first), optionally scoped to a project. Never includes internal notes or authorship.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        projectId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["clientId"],
    },
  },
  {
    name: "add_client_note",
    description:
      "Leave a message for the AnchorTech team on your own account. This does not change any project, invoice, or retainer — it only records something for a human to read and act on later. Call once to preview the note; it will not be saved until you call again with confirm: true after the client has explicitly agreed to send it.",
    input_schema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        content: { type: "string" },
        projectId: { type: "string" },
        confirm: { type: "boolean" },
      },
      required: ["clientId", "content"],
    },
    cache_control: { type: "ephemeral" },
  },
];

const READ_TOOLS = new Set([
  "get_client",
  "list_projects",
  "get_project_status",
  "list_invoices",
  "get_retainer_status",
  "list_upcoming_renewals",
  "list_client_notes",
]);

/**
 * Dispatches one Anthropic tool_use call to the portal core. `core` must
 * already be constructed with a client scope — this function does not accept
 * or check a scope itself, so a caller cannot hand it an admin-scoped core by
 * mistake and expect it to still be safe.
 */
export async function callClientTool(
  core: PortalCore,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  if (READ_TOOLS.has(name)) {
    switch (name) {
      case "get_client":
        return core.getClient(input);
      case "list_projects":
        return core.listProjects(input as Parameters<PortalCore["listProjects"]>[0]);
      case "get_project_status":
        return core.getProjectStatus(input as Parameters<PortalCore["getProjectStatus"]>[0]);
      case "list_invoices":
        return core.listInvoices(input as Parameters<PortalCore["listInvoices"]>[0]);
      case "get_retainer_status":
        return core.getRetainerStatus(input as Parameters<PortalCore["getRetainerStatus"]>[0]);
      case "list_upcoming_renewals":
        return core.listUpcomingRenewals(
          input as Parameters<PortalCore["listUpcomingRenewals"]>[0]
        );
      case "list_client_notes":
        return core.listClientNotes(input as Parameters<PortalCore["listClientNotes"]>[0]);
    }
  }

  if (name === "add_client_note") {
    return core.addClientNote(input as Parameters<PortalCore["addClientNote"]>[0]);
  }

  return { error: `Unknown tool: ${name}` };
}
