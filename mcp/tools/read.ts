import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PortalCore } from "../../core/portal.js";
import { readTools } from "./read-registry.js";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Read tools are a thin transport shell over the portal core. All filtering,
 * tenancy and field selection lives in the core so the API surface for clients
 * inherits the same rules. Tool names, schemas, and behavior come from the
 * shared registry in read-registry.ts.
 */
export function registerReadTools(server: McpServer, core: PortalCore) {
  for (const [name, tool] of Object.entries(readTools)) {
    server.registerTool(
      name,
      { title: tool.title, description: tool.description, inputSchema: tool.inputSchema },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any) => text(await tool.handler(core, args))
    );
  }
}
