# Quickstart

Get Memento running and save your first observation in under 5 minutes.

## Install

Memento is a monorepo with multiple packages. Install the ones you need:

```bash
# Core engine (required)
bun add @slorenzot/memento-core

# MCP server (for AI agent integration)
bun add @slorenzot/memento-mcp-server

# CLI (for terminal workflows)
bun add @slorenzot/memento-cli

# Web UI (for visual dashboard)
bun add @slorenzot/memento-web-ui
```

## Your First Observation

### Via Code

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const engine = new MemoryEngine('./data/memento.db');

// Create a session
const session = await engine.createSession({
  projectId: 'my-project',
  endedAt: null,
  metadata: {},
});

// Save an observation
const obs = await engine.createObservation({
  sessionId: session.id,
  title: 'Chose SQLite over PostgreSQL',
  content: `## What
Switched from PostgreSQL to bun:sqlite for the persistence layer.

## Why
Memento needs to run locally with zero setup. bun:sqlite is embedded, fast, and requires no external process.

## Where
packages/core/src/MemoryEngine.ts

## Learned
bun:sqlite WAL mode gives excellent concurrent read performance. FTS5 virtual tables handle full-text search natively.`,
  type: 'decision',
  topicKey: 'architecture/persistence',
  projectId: 'my-project',
});
```

### Via CLI

```bash
# Start a session
memento session start --project my-project

# Save an observation
memento save "Fixed N+1 query in UserList" \
  --type bug \
  --project my-project

# Search your memory
memento search "N+1 query"

# View recent context
memento context --project my-project
```

### Via MCP (AI Agents)

If you use an AI coding agent like Claude, Cursor, or OpenCode, Memento integrates via the Model Context Protocol. Your agent can automatically save and retrieve observations.

See [MCP Introduction](/docs/mcp/introduction) for setup guides.

## What's Next?

- [Observations](/docs/core-concepts/observations) — understand the 10 observation types
- [Sessions](/docs/core-concepts/sessions) — group observations by conversation
- [MCP Tools Reference](/docs/mcp/tools-reference) — all 21 tools with examples
