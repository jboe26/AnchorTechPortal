import type { PrismaClient } from "../app/generated/prisma/client";
import { type Scope, resolveClientId, isForeign } from "./scope.js";

export type ProjectStatus = "in_progress" | "completed" | "on_hold";
export type InvoiceStatus = "unpaid" | "paid" | "overdue";
export type NoteSource = "manual" | "assistant" | "client";
export type NoteVisibility = "internal" | "shared";

export type Pending = {
  status: "pending_confirmation";
  summary: string;
  change: Record<string, unknown>;
  instructions: string;
};

export type Failure = { error: string };

const CONFIRM_INSTRUCTIONS =
  "No changes have been made. Present this to the user and call this tool again with confirm: true only after they explicitly approve it.";

const OWNER_ONLY: Failure = {
  error: "This operation is only available to the portal owner.",
};

function pending(summary: string, change: Record<string, unknown>): Pending {
  return {
    status: "pending_confirmation",
    summary,
    change,
    instructions: CONFIRM_INSTRUCTIONS,
  };
}

/**
 * Field allowlists for a client scope.
 *
 * Rows are fetched in one shape and narrowed here rather than by branching the
 * query, so what a client may see is stated in one readable place. Scoped
 * queries never load another tenant's row, so nothing sensitive is fetched and
 * then discarded.
 */

type WithClientName = { client?: { name: string } | null };

function clientView<T extends Record<string, unknown>>(row: T) {
  const { password, createdAt, updatedAt, ...rest } = row as T & {
    password?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  void password;
  void createdAt;
  void updatedAt;
  return rest;
}

function projectView<T extends Record<string, unknown> & WithClientName>(row: T) {
  const { clientId, createdAt, updatedAt, client, ...rest } = row as T & {
    clientId?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  void clientId;
  void createdAt;
  void updatedAt;
  void client;
  return rest;
}

function invoiceView<T extends Record<string, unknown> & WithClientName>(row: T) {
  const { clientId, createdAt, updatedAt, client, ...rest } = row as T & {
    clientId?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  void clientId;
  void createdAt;
  void updatedAt;
  void client;
  return rest;
}

function retainerView<T extends Record<string, unknown> & WithClientName>(row: T) {
  const { clientId, createdAt, updatedAt, client, ...rest } = row as T & {
    clientId?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  void clientId;
  void createdAt;
  void updatedAt;
  void client;
  return rest;
}

/**
 * Notes carry internal commentary, so a client sees only shared notes and never
 * the author. Authorship identifies internal staff and is not theirs to read.
 */
function noteView<T extends Record<string, unknown>>(row: T) {
  const { authorId, author, clientId, visibility, ...rest } = row as T & {
    authorId?: unknown;
    author?: unknown;
    clientId?: unknown;
    visibility?: unknown;
  };
  void authorId;
  void author;
  void clientId;
  void visibility;
  return rest;
}

export type PortalCore = ReturnType<typeof createPortalCore>;

/**
 * Builds the data access surface for one scope.
 *
 * Every method resolves its tenancy filter from the scope rather than its
 * arguments, and every lookup by id verifies ownership before returning or
 * mutating anything.
 */
export function createPortalCore(prisma: PrismaClient, scope: Scope) {
  const scoped = () => resolveClientId(scope);
  const isClient = scope.kind === "client";

  /** Confirms a project is reachable in this scope before it is acted on. */
  async function reachableProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || isForeign(scope, project.clientId)) return null;
    return project;
  }

  async function reachableClient(clientId: string) {
    if (isForeign(scope, clientId)) return null;
    return prisma.client.findUnique({ where: { id: clientId } });
  }

  return {
    scope,

    // ---- reads ----

    async getClient(args: { id?: string; email?: string; name?: string }) {
      if (isClient) {
        const self = await prisma.client.findUnique({
          where: { id: scope.clientId },
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            phone: true,
          },
        });
        return self ?? { error: "No client found." };
      }

      const { id, email, name } = args;
      if (!id && !email && !name) {
        return { error: "Provide at least one of id, email, or name." };
      }

      const clients = await prisma.client.findMany({
        where: {
          OR: [
            id ? { id } : undefined,
            email ? { email } : undefined,
            name ? { name: { contains: name, mode: "insensitive" as const } } : undefined,
          ].filter(Boolean) as object[],
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 10,
      });

      return clients.length ? clients : { error: "No client found." };
    },

    async listProjects(args: { clientId?: string; status?: ProjectStatus }) {
      const projects = await prisma.project.findMany({
        where: { clientId: resolveClientId(scope, args.clientId), status: args.status },
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true } } },
      });
      return isClient ? projects.map(projectView) : projects;
    },

    async getProjectStatus(args: { projectId: string }) {
      const reachable = await reachableProject(args.projectId);
      if (!reachable) return { error: "No project found." };

      const project = await prisma.project.findUnique({
        where: { id: args.projectId },
        include: {
          client: { select: { name: true } },
          invoices: {
            select: { number: true, amount: true, status: true, dueAt: true },
          },
        },
      });
      if (!project) return { error: "No project found." };
      return isClient ? projectView(project) : project;
    },

    async listInvoices(args: { clientId?: string; status?: InvoiceStatus }) {
      const invoices = await prisma.invoice.findMany({
        where: { clientId: resolveClientId(scope, args.clientId), status: args.status },
        orderBy: { dueAt: "asc" },
        include: {
          client: { select: { name: true } },
          project: { select: { title: true } },
        },
      });
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      return {
        invoices: isClient ? invoices.map(invoiceView) : invoices,
        totalAmount,
      };
    },

    async getRetainerStatus(args: { clientId?: string }) {
      const retainers = await prisma.retainer.findMany({
        where: { clientId: resolveClientId(scope, args.clientId) },
        orderBy: { renewalAt: "asc" },
        include: { client: { select: { name: true } } },
      });
      return isClient ? retainers.map(retainerView) : retainers;
    },

    async listUpcomingRenewals(args: { withinDays: number }) {
      const now = new Date();
      const until = new Date(now.getTime() + args.withinDays * 24 * 60 * 60 * 1000);
      const retainers = await prisma.retainer.findMany({
        where: {
          clientId: scoped(),
          status: "active",
          renewalAt: { gte: now, lte: until },
        },
        orderBy: { renewalAt: "asc" },
        include: { client: { select: { name: true } } },
      });
      return isClient ? retainers.map(retainerView) : retainers;
    },

    async listClientNotes(args: { clientId: string; projectId?: string; limit?: number }) {
      const clientId = resolveClientId(scope, args.clientId);
      const notes = await prisma.clientNote.findMany({
        where: {
          clientId,
          projectId: args.projectId,
          ...(isClient ? { visibility: "shared" as const } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 20,
        include: { author: { select: { name: true } } },
      });
      return isClient ? notes.map(noteView) : notes;
    },

    // ---- writes ----

    async updateProjectStatus(args: {
      projectId: string;
      status: ProjectStatus;
      confirm?: boolean;
    }): Promise<Pending | Failure | { status: "applied"; project: unknown }> {
      if (isClient) return OWNER_ONLY;

      const project = await prisma.project.findUnique({ where: { id: args.projectId } });
      if (!project) return { error: "No project found." };

      const change = {
        projectId: args.projectId,
        title: project.title,
        from: project.status,
        to: args.status,
      };

      if (!args.confirm) {
        return pending(
          `Set project "${project.title}" (${args.projectId}) status: ${project.status} -> ${args.status}`,
          change
        );
      }

      const updated = await prisma.project.update({
        where: { id: args.projectId },
        data: { status: args.status },
      });
      return { status: "applied", project: updated };
    },

    async createInvoice(args: {
      clientId: string;
      amount: number;
      dueAt: string;
      projectId?: string;
      confirm?: boolean;
    }): Promise<Pending | Failure | { status: "applied"; invoice: unknown }> {
      if (isClient) return OWNER_ONLY;

      const client = await prisma.client.findUnique({ where: { id: args.clientId } });
      if (!client) return { error: "No client found." };

      if (args.projectId) {
        const project = await prisma.project.findUnique({ where: { id: args.projectId } });
        if (!project) return { error: "No project found." };
      }

      const yearPrefix = `INV-${new Date().getFullYear()}-`;

      if (!args.confirm) {
        return pending(
          `Create invoice for ${client.name}: $${args.amount.toFixed(2)}, due ${args.dueAt}`,
          {
            clientId: args.clientId,
            clientName: client.name,
            projectId: args.projectId,
            amount: args.amount,
            dueAt: args.dueAt,
            number: `${yearPrefix}NNN (assigned on confirm)`,
          }
        );
      }

      const existing = await prisma.invoice.findMany({
        where: { number: { startsWith: yearPrefix } },
        select: { number: true },
      });
      const maxSeq = existing.reduce((max, { number }) => {
        const seq = parseInt(number.slice(yearPrefix.length), 10);
        return Number.isFinite(seq) && seq > max ? seq : max;
      }, 0);

      const invoice = await prisma.invoice.create({
        data: {
          number: `${yearPrefix}${String(maxSeq + 1).padStart(3, "0")}`,
          amount: args.amount,
          dueAt: new Date(args.dueAt),
          clientId: args.clientId,
          projectId: args.projectId,
        },
      });
      return { status: "applied", invoice };
    },

    async markInvoicePaid(args: {
      invoiceId: string;
      paidAt?: string;
      confirm?: boolean;
    }): Promise<Pending | Failure | { status: "applied"; invoice: unknown }> {
      if (isClient) return OWNER_ONLY;

      const invoice = await prisma.invoice.findUnique({ where: { id: args.invoiceId } });
      if (!invoice) return { error: "No invoice found." };
      if (invoice.status === "paid") {
        return { error: `Invoice ${invoice.number} is already paid.` };
      }

      const resolvedPaidAt = args.paidAt ? new Date(args.paidAt) : new Date();

      if (!args.confirm) {
        return pending(
          `Mark invoice ${invoice.number} ($${invoice.amount.toFixed(2)}) paid as of ${resolvedPaidAt.toISOString()}`,
          {
            invoiceId: args.invoiceId,
            number: invoice.number,
            amount: invoice.amount,
            paidAt: resolvedPaidAt.toISOString(),
          }
        );
      }

      const updated = await prisma.invoice.update({
        where: { id: args.invoiceId },
        data: { status: "paid", paidAt: resolvedPaidAt },
      });
      return { status: "applied", invoice: updated };
    },

    /**
     * Appends a note. A client may only ever add an internal, client-authored
     * note against their own record: their words reach the owner rather than
     * becoming something the assistant treats as fact about the account.
     */
    async addClientNote(args: {
      clientId: string;
      content: string;
      projectId?: string;
      source?: NoteSource;
      visibility?: NoteVisibility;
      confirm?: boolean;
    }): Promise<Pending | Failure | { status: "applied"; note: unknown }> {
      const clientId = resolveClientId(scope, args.clientId) ?? args.clientId;

      const client = await reachableClient(clientId);
      if (!client) return { error: "No client found." };

      if (args.projectId) {
        const project = await reachableProject(args.projectId);
        if (!project) return { error: "No project found." };
      }

      const source: NoteSource = isClient ? "client" : args.source ?? "assistant";
      const visibility: NoteVisibility = isClient ? "internal" : args.visibility ?? "internal";

      if (!args.confirm) {
        return pending(`Add ${source} note to ${client.name}: "${args.content}"`, {
          clientId,
          clientName: client.name,
          projectId: args.projectId,
          source,
          visibility,
          content: args.content,
        });
      }

      const note = await prisma.clientNote.create({
        data: {
          clientId,
          content: args.content,
          projectId: args.projectId,
          source,
          visibility,
        },
      });
      return { status: "applied", note: isClient ? noteView(note) : note };
    },
  };
}
