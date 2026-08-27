import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { prisma } from "./db.js";
import { createPortalCore } from "../core/portal.js";
import { adminScope } from "../core/scope.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";

const server = new McpServer({
  name: "anchortech-portal",
  version: "0.1.0",
});

// Stdio serves the portal owner on their own machine, so this adapter runs at
// admin scope. A client-facing adapter constructs the core with a client scope
// instead, and inherits every rule enforced inside it.
const core = createPortalCore(prisma, adminScope());

registerReadTools(server, core);
registerWriteTools(server, core);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("AnchorTech Portal MCP server failed to start:", error);
  process.exit(1);
});
