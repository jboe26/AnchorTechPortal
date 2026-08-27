import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../../app/generated/prisma/client";
import { createPortalCore } from "../../core/portal";
import { clientScope } from "../../core/scope";
import { CLIENT_TOOLS, callClientTool } from "./tools";

/**
 * Same recording stand-in as core/portal.test.ts, kept local so this file's
 * assertions about the client tool surface don't depend on that file.
 */
function fakePrisma(rows: Record<string, any[]> = {}) {
  const calls: { model: string; op: string; args: any }[] = [];
  const model = (name: string) => ({
    findMany: async (args: any = {}) => {
      calls.push({ model: name, op: "findMany", args });
      return rows[name] ?? [];
    },
    findUnique: async (args: any) => {
      calls.push({ model: name, op: "findUnique", args });
      return (rows[name] ?? []).find((r) => r.id === args.where.id) ?? null;
    },
    create: async (args: any) => {
      calls.push({ model: name, op: "create", args });
      return { id: "generated", ...args.data };
    },
    update: async (args: any) => {
      calls.push({ model: name, op: "update", args });
      return { id: args.where.id, ...args.data };
    },
  });

  const prisma = {
    client: model("client"),
    project: model("project"),
    invoice: model("invoice"),
    retainer: model("retainer"),
    clientNote: model("clientNote"),
  } as unknown as PrismaClient;

  return { prisma, calls };
}

const MINE = "client-mine";

const seed = () => ({
  client: [{ id: MINE, name: "Mine", email: "mine@example.com", company: null, phone: null }],
});

test("the client tool list never includes an owner-only write", () => {
  const names = CLIENT_TOOLS.map((t) => t.name);
  for (const forbidden of ["update_project_status", "create_invoice", "mark_invoice_paid"]) {
    assert.ok(!names.includes(forbidden), `client tools exposed ${forbidden}`);
  }
  assert.deepEqual(
    [...names].sort(),
    [
      "add_client_note",
      "get_client",
      "get_project_status",
      "get_retainer_status",
      "list_client_notes",
      "list_invoices",
      "list_projects",
      "list_upcoming_renewals",
    ].sort()
  );
});

test("callClientTool dispatches a read tool to the scoped core", async () => {
  const { prisma } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  const result: any = await callClientTool(core, "get_client", {});
  assert.equal(result.id, MINE);
});

test("callClientTool refuses an unknown tool name without touching the core", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  const result = await callClientTool(core, "delete_client", { id: MINE });
  assert.deepEqual(result, { error: "Unknown tool: delete_client" });
  assert.equal(calls.length, 0);
});

test("callClientTool forces a client-authored, internal note regardless of model input", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  await callClientTool(core, "add_client_note", {
    clientId: MINE,
    content: "please call me",
    confirm: true,
  });

  const data = calls.find((c) => c.model === "clientNote" && c.op === "create")!.args.data;
  assert.equal(data.source, "client");
  assert.equal(data.visibility, "internal");
});
