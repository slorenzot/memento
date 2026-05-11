# MCP Introduction

Memento integrates with AI coding agents via the **Model Context Protocol (MCP)**. This is the primary way AI agents interact with Memento.

## What is MCP?

MCP is a protocol that lets AI applications (Claude, Cursor, OpenCode, etc.) call tools provided by external servers. Memento's MCP server exposes 21 tools for memory management.

## Architecture

```
┌─────────────┐     MCP Protocol     ┌──────────────────┐     bun:sqlite     ┌──────────┐
│  AI Agent    │ ◀──────────────────▶ │  memento-mcp     │ ◀────────────────▶ │ SQLite   │
│  (Claude,    │    JSON-RPC over     │  server          │    direct access   │ Database │
│  Cursor,     │    stdio/SSE         │  (21 tools)      │                    │ (WAL)    │
│  OpenCode)   │                      │                  │                    │          │
└─────────────┘                      └──────────────────┘                    └──────────┘
```

## Setup

### OpenCode

Add to your OpenCode configuration (`~/.config/opencode/config.json`):

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "--bun", "mcp"],
      "cwd": "/path/to/memento"
    }
  }
}
```

Or install globally:

```bash
bun install -g @slorenzot/memento-mcp-server
memento-mcp
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["x", "@slorenzot/memento-mcp-server"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["x", "@slorenzot/memento-mcp-server"],
      "env": {
        "MEMENTO_PROJECT": "my-project"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMENTO_DB_PATH` | `./data/memento.db` | Database file path |
| `MEMENTO_PROJECT` | `default` | Default project ID |
| `MEMENTO_LOG_LEVEL` | `info` | Logging verbosity |

## Quick Test

After setup, ask your AI agent:

> "Search my memento memory for any observations about authentication"

If the setup is correct, the agent will call `mem_search` and return results.

## See Also

- [Tools Reference](/docs/mcp/tools-reference) — all 21 tools with parameters and examples
- [Quickstart](/docs/quickstart) — getting started guide
