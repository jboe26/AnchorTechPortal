# AnchorTech Portal MCP server

The MCP server in `mcp/` exposes the Portal's data (clients, projects, invoices,
retainers, notes) to an MCP-capable assistant over stdio. It reuses the repo's
Prisma client and `DATABASE_URL` — no separate connection or credentials.

## Running it directly

```bash
npm run mcp
```

This runs `tsx mcp/server.ts`, which starts the server on stdio and waits for
a client to connect. It is not meant to be run standalone in normal use; an
MCP client (Claude Desktop, Claude Code) launches it as a subprocess.

## Wiring into Claude Desktop

Add an entry to `claude_desktop_config.json` (Settings > Developer > Edit
Config):

```json
{
  "mcpServers": {
    "anchortech-portal": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/AnchorTechPortal/mcp/server.ts"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

Use the absolute path to this repo's `mcp/server.ts`. Set `DATABASE_URL` to
the same value used by the Next.js app (see `.env`); the MCP process does not
inherit your shell environment when launched by Claude Desktop.

## Wiring into Claude Code

Add the server with the CLI, from the repo root:

```bash
claude mcp add anchortech-portal -- npx tsx mcp/server.ts
```

Or add it manually to your Claude Code MCP settings using the same
`command`/`args`/`env` shape as above.

## Tool surface

Read tools (`get_client`, `list_projects`, `get_project_status`,
`list_invoices`, `get_retainer_status`, `list_upcoming_renewals`,
`list_client_notes`) never mutate data and never return the `password`
column.

Write tools (`update_project_status`, `create_invoice`, `mark_invoice_paid`,
`add_client_note`) all require a two-step confirmation: call once without
`confirm` to get a `pending_change` preview, present it to a human, then call
again with `confirm: true` only after they approve. No tool call can mutate
data on its own.
