# Observations

Observations are the core data unit in Memento. They represent a piece of knowledge captured during a coding session — a decision, a bug fix, a discovery, a pattern, or any non-obvious information worth remembering.

## Anatomy of an Observation

```
┌─────────────────────────────────────────────┐
│  Observation #42                             │
│  Title: "Fixed N+1 query in UserList"       │
│  Type: bug                                   │
│  Topic: bugfix/n1-query-userlist             │
│  Project: my-project                         │
│  Scope: project                              │
│  Pinned: false    Read-only: false           │
│  Created: 2025-01-15T10:30:00Z              │
│  Session: #7                                 │
├─────────────────────────────────────────────┤
│  ## What                                     │
│  The UserList component was executing a      │
│  separate query for each user's profile...   │
│                                              │
│  ## Why                                      │
│  Performance degradation with 100+ users     │
│                                              │
│  ## Where                                    │
│  src/components/UserList.tsx                  │
│                                              │
│  ## Learned                                  │
│  DataLoader pattern solves N+1 in GraphQL    │
└─────────────────────────────────────────────┘
```

## 10 Observation Types

| Type | Purpose | Example |
|------|---------|---------|
| `decision` | Architecture or design choices | "Chose SQLite over PostgreSQL" |
| `bug` | Bug fixes with root cause | "Fixed N+1 query in UserList" |
| `discovery` | Non-obvious findings about the codebase | "FTS5 special chars need escaping" |
| `note` | General information | "API rate limit is 100 req/min" |
| `summary` | Session summaries (auto-generated) | "Session Summary — 2025-01-15" |
| `learning` | Extracted lessons | "Always use DataLoader for batch loading" |
| `pattern` | Established conventions | "All API routes follow /api/{resource}" |
| `architecture` | System design decisions | "Monorepo with bun workspaces" |
| `config` | Configuration changes | "Set WAL mode for SQLite" |
| `preference` | User preferences | "Use conventional commits format" |

## Content Format

Observation content follows a structured format:

```markdown
## What
One sentence describing what was done.

## Why
What motivated this (user request, bug, performance, etc.).

## Where
Files or paths affected.

## Learned
Gotchas, edge cases, things that surprised you.
```

This is a convention, not enforced — the content field accepts any text. But following this format makes observations more searchable and useful.

## Topic Keys

Topic keys group related observations. Use stable, hierarchical keys:

```
architecture/auth-model
architecture/persistence
bugfix/n1-query-userlist
pattern/api-routing
config/deployment
```

Topic keys enable:
- **Grouping** — find all observations about a topic
- **Merging** — consolidate duplicate observations by topic
- **Upserting** — update an evolving topic instead of creating duplicates

## Scopes

Observations can be scoped to:

- **`project`** (default) — specific to a codebase
- **`personal`** — cross-project preferences and conventions

Personal observations appear across all projects. Use them for tool preferences, coding style, or general knowledge.

## Pinning & Read-Only

- **Pinned** observations are always injected into the AI agent's context
- **Read-only** observations cannot be modified by AI agents (only users via CLI)

Use pinning sparingly — pinned observations consume tokens in every conversation.

## See Also

- [Sessions](/docs/core-concepts/sessions) — group observations by conversation
- [Search](/docs/core-concepts/search) — find observations with FTS5
- [MCP Tools](/docs/mcp/tools-reference) — `mem_save`, `mem_search`, `mem_get_observation`
