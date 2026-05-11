# FAQ

## General

### What is Memento?

Memento is a persistent memory system for AI coding agents. It captures decisions, discoveries, bugs, and patterns from your coding sessions and makes them recoverable across conversations.

### How is it different from just using notes?

Memento is designed for AI agents to use automatically. It integrates via MCP so your AI assistant (Claude, Cursor, OpenCode) can save and retrieve memories without you manually copying things around. It also provides full-text search, semantic search, deduplication, and session tracking.

### Do I need a server running?

No. Memento uses SQLite — the database is a single file on your machine. No external database, no Docker, no cloud service.

### Is my data private?

Yes. Everything is stored locally in a SQLite file. No data is sent to external services. Semantic search uses local embeddings via `@huggingface/transformers`.

## Setup

### Which package should I install?

It depends on your use case:

- **AI agent user** → Install the MCP server (`@slorenzot/memento-mcp-server`)
- **Terminal user** → Install the CLI (`@slorenzot/memento-cli`)
- **Visual dashboard** → Install the Web UI (`@slorenzot/memento-web-ui`)
- **Building custom tools** → Use the core package (`@slorenzot/memento-core`)

### Can I use multiple packages together?

Yes! They all share the same database. You can have the MCP server running for your AI agent while using the CLI for quick searches and the Web UI for browsing.

### Does it work with Node.js?

Memento is built for Bun (`bun:sqlite`). The Web UI uses `better-sqlite3` as a webpack polyfill so it works in Next.js. For pure Node.js, you'd need to provide your own SQLite binding.

## Usage

### What are observation types for?

Types help you filter and organize memories. The 10 types cover common categories:

- `decision` — architecture choices
- `bug` — bug fixes with root cause
- `discovery` — non-obvious findings
- `pattern` — established conventions
- `summary` — session summaries
- `learning` — extracted lessons
- `note` — general information
- `architecture` — system design
- `config` — configuration changes
- `preference` — user preferences

### How do topic keys work?

Topic keys are hierarchical strings that group related observations:

```
architecture/auth-model
bugfix/n1-query
pattern/api-routing
```

Use them to organize observations by concern. They enable merging, upserting, and filtered search.

### What happens when context fills up?

Call `mem_context` to recover recent observations. Pinned observations are always included. Session summaries give high-level context of what was accomplished.

### Can I backup my data?

Yes! Use `mem_export` or the CLI:

```bash
memento export --format json --output backup.json
```

## See Also

- [Quickstart](/docs/quickstart) — getting started
- [Troubleshooting](/docs/troubleshooting) — common issues
