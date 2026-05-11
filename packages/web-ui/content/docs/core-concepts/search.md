# Search

Memento provides powerful search capabilities for finding observations across your memory.

## Search Modes

| Mode | How it works | Best for |
|------|-------------|----------|
| `keyword` | FTS5 full-text search | Exact terms, specific phrases |
| `semantic` | Local embeddings similarity | Conceptual matches, "find things like this" |
| `hybrid` | Combined keyword + semantic | Best of both worlds |

### Keyword Search (Default)

Uses SQLite FTS5 for fast full-text search. Supports standard FTS5 query syntax:

```bash
# Simple search
memento search "N+1 query"

# FTS5 operators
memento search "auth AND migration"     # both terms
memento search "auth OR token"          # either term
memento search "auth NOT oauth"         # exclude term
memento search "auth*"                  # prefix matching
memento search '"database migration"'   # exact phrase
```

### Semantic Search

Uses local embeddings (via `@huggingface/transformers`) to find conceptually similar observations. No external API required.

```bash
# Find observations similar in meaning
memento search "how did we handle authentication" --mode semantic
```

### Hybrid Search

Combines keyword and semantic results for maximum relevance:

```bash
memento search "database performance" --mode hybrid
```

## Filters

Search supports multiple filters:

| Filter | Parameter | Example |
|--------|-----------|---------|
| Type | `type` | `--type decision` |
| Project | `project_id` | `--project my-app` |
| Topic | `topic_key` | `--topic architecture/auth` |
| Scope | `scope` | `--scope personal` |
| Include deleted | `include_deleted` | `--include-deleted` |
| Pagination | `limit` / `offset` | `--limit 20 --offset 10` |

## Sorting

| Sort | Description |
|------|-------------|
| `relevance` (default) | FTS5 rank score — most relevant first |
| `chronological` | Created at ascending — oldest first |

## Search Results are Truncated

`mem_search` returns truncated content for performance. Use `mem_get_observation` with the returned ID to get the full content:

```
1. mem_search("auth model")  → returns [ { id: 42, title: "...", content: "..." } ]
2. mem_get_observation(42)   → returns FULL content
```

## Performance Tips

- Start with small `limit` values (10) and increase only if needed
- Use `type` and `project_id` filters to narrow results
- Keyword search is fastest — use semantic/hybrid only when keyword isn't finding what you need
- Semantic search requires embeddings to be generated (first run downloads the model)

## See Also

- [Observations](/docs/core-concepts/observations) — what you're searching
- [Context Recovery](/docs/capabilities/context-recovery) — recent context without search
- [MCP Tools](/docs/mcp/tools-reference) — `mem_search` and `mem_get_observation`
