# MCP Server Package

`@slorenzot/memento-mcp-server` — Model Context Protocol server exposing 21 tools for AI agent integration.

## Installation

```bash
bun add @slorenzot/memento-mcp-server
```

## Running

```bash
# Start MCP server (stdio transport)
memento-mcp

# Or via bun
bun run mcp
```

## Architecture

The MCP server wraps `@slorenzot/memento-core` and exposes its functionality as MCP tools using the `@modelcontextprotocol/sdk`.

```
MCP Server (tools.ts)
  ├── registerTools() — registers all 21 tools
  ├── formatters.ts — formats responses as Markdown
  └── McpServerContext — holds engine, project, session state
```

## Tool Categories

| Category | Tools |
|----------|-------|
| Observations | `mem_save`, `mem_search`, `mem_get_observation`, `mem_update`, `mem_replace` |
| Lifecycle | `mem_delete`, `mem_merge` |
| Pin & Lock | `mem_pin`, `mem_unpin`, `mem_lock`, `mem_unlock` |
| Sessions | `mem_session_start`, `mem_session_end`, `mem_session_summary` |
| Convenience | `mem_context`, `mem_capture_passive`, `mem_status` |
| Export | `mem_export` |
| Journal | `mem_journal_write`, `mem_journal_read`, `mem_journal_search` |

## Testing

The MCP server is tested via:

```bash
bun test packages/mcp-server
```

Tests use `registerTools()` with a test `McpServerContext` to avoid import side-effects.

## See Also

- [MCP Introduction](/docs/mcp/introduction) — setup guides
- [Tools Reference](/docs/mcp/tools-reference) — all 21 tools
- [Core Package](/docs/packages/core) — underlying engine
