import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../app/generated/prisma/client";
import { createPortalCore } from "./portal.js";
import { adminScope, clientScope } from "./scope.js";

type Call = { model: string; op: string; args: Record<string, any> };

/**
 * A recording stand-in for Prisma. These tests are about which filters the core
 * builds and which fields it lets back out, so a real database would only make
 * the assertions harder to read.
 */
function fakePrisma(rows: Record<string, any[]> = {}) {
  const calls: Call[] = [];
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
const THEIRS = "client-theirs";

const seed = () => ({
  client: [
    { id: MINE, name: "Mine", email: "mine@example.com", company: null, phone: null },
    { id: THEIRS, name: "Theirs", email: "theirs@example.com", company: null, phone: null },
  ],
  project: [
    { id: "p-mine", title: "Mine", status: "in_progress", clientId: MINE },
    { id: "p-theirs", title: "Theirs", status: "in_progress", clientId: THEIRS },
  ],
  invoice: [
    { id: "i-theirs", number: "INV-2026-009", amount: 100, status: "unpaid", clientId: THEIRS },
  ],
});

const lastCall = (calls: Call[], model: string, op: string) =>
  [...calls].reverse().find((c) => c.model === model && c.op === op)!;

// ---- tenancy ----

test("client scope overrides a clientId argument naming another tenant", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  await core.listProjects({ clientId: THEIRS });
  assert.equal(lastCall(calls, "project", "findMany").args.where.clientId, MINE);

  await core.listInvoices({ clientId: THEIRS });
  assert.equal(lastCall(calls, "invoice", "findMany").args.where.clientId, MINE);

  await core.getRetainerStatus({ clientId: THEIRS });
  assert.equal(lastCall(calls, "retainer", "findMany").args.where.clientId, MINE);
});

test("admin scope keeps clientId as an optional filter", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  await core.listProjects({ clientId: THEIRS });
  assert.equal(lastCall(calls, "project", "findMany").args.where.clientId, THEIRS);

  await core.listProjects({});
  assert.equal(lastCall(calls, "project", "findMany").args.where.clientId, undefined);
});

test("client scope cannot reach another tenant's record by id", async () => {
  const { prisma } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  assert.deepEqual(await core.getProjectStatus({ projectId: "p-theirs" }), {
    error: "No project found.",
  });
  assert.notDeepEqual(await core.getProjectStatus({ projectId: "p-mine" }), {
    error: "No project found.",
  });
});

test("client scope ignores lookup arguments and returns only its own record", async () => {
  const { prisma } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  const result: any = await core.getClient({ email: "theirs@example.com", name: "Theirs" });
  assert.equal(result.id, MINE);
});

// ---- visibility ----

test("client scope only ever queries shared notes", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  await core.listClientNotes({ clientId: THEIRS });
  const where = lastCall(calls, "clientNote", "findMany").args.where;
  assert.equal(where.clientId, MINE);
  assert.equal(where.visibility, "shared");
});

test("admin scope sees notes at every visibility", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  await core.listClientNotes({ clientId: MINE });
  assert.equal(lastCall(calls, "clientNote", "findMany").args.where.visibility, undefined);
});

test("client scope strips authorship and internal fields off notes", async () => {
  const { prisma } = fakePrisma({
    ...seed(),
    clientNote: [
      {
        id: "n1",
        content: "shared note",
        source: "assistant",
        visibility: "shared",
        clientId: MINE,
        projectId: null,
        authorId: "admin-1",
        author: { name: "Josh Boepple" },
        createdAt: new Date(),
      },
    ],
  });
  const core = createPortalCore(prisma, clientScope(MINE));

  const notes: any = await core.listClientNotes({ clientId: MINE });
  const keys = Object.keys(notes[0]);
  for (const leaked of ["authorId", "author", "clientId", "visibility"]) {
    assert.ok(!keys.includes(leaked), `client scope leaked ${leaked}`);
  }
  assert.equal(notes[0].content, "shared note");
});

test("client scope strips internal bookkeeping off other entities", async () => {
  const { prisma } = fakePrisma({
    ...seed(),
    project: [
      {
        id: "p-mine",
        title: "Mine",
        status: "in_progress",
        clientId: MINE,
        createdAt: new Date(),
        updatedAt: new Date(),
        client: { name: "Mine" },
      },
    ],
  });
  const core = createPortalCore(prisma, clientScope(MINE));

  const projects: any = await core.listProjects({});
  const keys = Object.keys(projects[0]);
  for (const leaked of ["clientId", "createdAt", "updatedAt", "client"]) {
    assert.ok(!keys.includes(leaked), `client scope leaked ${leaked}`);
  }
  assert.equal(projects[0].title, "Mine");
});

// ---- write surface ----

test("client scope refuses every owner-only write", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));
  const refusal = { error: "This operation is only available to the portal owner." };

  assert.deepEqual(
    await core.updateProjectStatus({ projectId: "p-mine", status: "completed", confirm: true }),
    refusal
  );
  assert.deepEqual(
    await core.createInvoice({ clientId: MINE, amount: 10, dueAt: "2026-12-01", confirm: true }),
    refusal
  );
  assert.deepEqual(
    await core.markInvoicePaid({ invoiceId: "i-theirs", confirm: true }),
    refusal
  );

  assert.equal(
    calls.some((c) => c.op === "update" || c.op === "create"),
    false,
    "a refused write still reached the database"
  );
});

test("a client note from a client is forced to client-authored and internal", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, clientScope(MINE));

  await core.addClientNote({
    clientId: THEIRS,
    content: "please call me",
    source: "manual",
    visibility: "shared",
    confirm: true,
  });

  const data = lastCall(calls, "clientNote", "create").args.data;
  assert.equal(data.clientId, MINE);
  assert.equal(data.source, "client");
  assert.equal(data.visibility, "internal");
});

test("admin notes default to internal", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  await core.addClientNote({ clientId: MINE, content: "internal by default", confirm: true });
  const data = lastCall(calls, "clientNote", "create").args.data;
  assert.equal(data.visibility, "internal");
  assert.equal(data.source, "assistant");
});

// ---- confirmation, unchanged from Track 2 ----

test("a write without confirm previews and mutates nothing", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  const result: any = await core.updateProjectStatus({
    projectId: "p-mine",
    status: "completed",
  });

  assert.equal(result.status, "pending_confirmation");
  assert.deepEqual(result.change, {
    projectId: "p-mine",
    title: "Mine",
    from: "in_progress",
    to: "completed",
  });
  assert.equal(calls.some((c) => c.op === "update"), false);
});

test("a write with confirm applies", async () => {
  const { prisma, calls } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  const result: any = await core.updateProjectStatus({
    projectId: "p-mine",
    status: "completed",
    confirm: true,
  });

  assert.equal(result.status, "applied");
  assert.equal(lastCall(calls, "project", "update").args.data.status, "completed");
});

test("writes against a missing id return a clean error", async () => {
  const { prisma } = fakePrisma(seed());
  const core = createPortalCore(prisma, adminScope());

  assert.deepEqual(
    await core.updateProjectStatus({ projectId: "nope", status: "completed", confirm: true }),
    { error: "No project found." }
  );
  assert.deepEqual(await core.markInvoicePaid({ invoiceId: "nope", confirm: true }), {
    error: "No invoice found.",
  });
});
