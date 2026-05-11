# Context Recovery

Context recovery is how Memento helps AI agents remember what happened in previous sessions or before a context compaction.

## The Problem

AI coding agents have limited context windows. When context fills up:
1. Older messages get compacted/discarded
2. The agent "forgets" what it did earlier
3. Work gets duplicated or decisions get revisited

## The Solution: `mem_context`

`mem_context` returns recent observations ordered by creation date (newest first), with session metadata. Unlike `mem_search`, it does NOT use FTS5 — it's a simple chronological query.

```typescript
// Get recent context for a project
const context = await engine.getRecentContext({
  projectId: 'my-app',
  limit: 20,
});
```

## When to Use

| Situation | Tool |
|-----------|------|
| Session starts | `mem_context` — what was done before? |
| After compaction | `mem_context` — recover what was lost |
| Looking for something specific | `mem_search` — FTS5 search |
| Getting current status | `mem_status` — health, stats, config |

## Recovery Protocol

After compaction or session recovery:

1. Call `mem_context` immediately to get recent observations
2. Review the session summaries (type: `summary`) for high-level context
3. Check pinned observations — they represent critical always-needed info
4. Continue working with recovered context

## Scope Filtering

```typescript
// Project-specific context
await engine.getRecentContext({ projectId: 'my-app', scope: 'project' });

// Personal preferences and cross-project knowledge
await engine.getRecentContext({ scope: 'personal' });

// Everything
await engine.getRecentContext({ limit: 50 });
```

## See Also

- [Sessions](/docs/core-concepts/sessions) — session lifecycle
- [Search](/docs/core-concepts/search) — FTS5 and semantic search
- [Pin & Lock](/docs/capabilities/pin-lock) — always-inject critical observations
