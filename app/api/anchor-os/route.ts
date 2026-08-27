import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireServiceToken } from "@/lib/service-auth";
import { createPortalCore } from "@/core/portal";
import { adminScope } from "@/core/scope";
import { readTools } from "@/mcp/tools/read-registry";

const requestSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * Server-to-server bridge for Anchor OS. Dispatches through the same
 * read-tool registry the MCP server uses, so Anchor OS consumes the Track 2
 * contracts unmodified instead of a parallel set of queries. Always runs at
 * admin scope: this endpoint serves only the portal owner's own Anchor OS
 * instance, never a client.
 */
export async function POST(req: NextRequest) {
  const authError = requireServiceToken(req);
  if (authError) return Response.json({ error: authError.error }, { status: authError.status });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { tool: toolName, args } = parsed.data;
  const tool = (readTools as Record<string, (typeof readTools)[keyof typeof readTools]>)[
    toolName
  ];
  if (!tool) {
    return Response.json({ error: `Unknown tool: ${toolName}` }, { status: 400 });
  }

  const inputParsed = z.object(tool.inputSchema).safeParse(args);
  if (!inputParsed.success) {
    return Response.json(
      { error: "Invalid arguments.", issues: inputParsed.error.issues },
      { status: 400 }
    );
  }

  const core = createPortalCore(prisma, adminScope());
  // The dispatch table maps one tool name to one handler signature at a time;
  // the union type here is a TS artifact of storing them all in one map, not
  // a real ambiguity — inputParsed.data was already validated against this
  // exact tool's own schema above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await tool.handler(core, inputParsed.data as any);
  return Response.json(result);
}
