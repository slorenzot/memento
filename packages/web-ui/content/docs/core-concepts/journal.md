# Journal

The Journal is an append-only, immutable evidence log. Unlike observations (which can be updated, merged, or deleted), journal entries are permanent records with a full audit trail.

## When to Use the Journal

Use the journal when you need:
- **Audit trail** — who did what, when, and why
- **Immutable records** — entries cannot be edited or deleted
- **Evidence** — for compliance, debugging, or post-mortems

Use observations for:
- Evolving knowledge that may change
- Decisions that get refined over time
- General notes and discoveries

## Journal Entry Structure

```
┌─────────────────────────────────────────────┐
│  Journal Entry #15                           │
│  Title: "Deployed v2.1.0 to production"     │
│  Tags: [deploy, production]                  │
│  Project: my-app                             │
│  Session: #7                                 │
│  Created: 2025-01-15T14:30:00Z              │
├─────────────────────────────────────────────┤
│  Deployed version 2.1.0 containing the      │
│  new auth module and rate limiting fixes.    │
│                                              │
│  Deployment hash: abc123def                  │
│  Rollback plan: revert to v2.0.9            │
│  Verified: health check passed               │
└─────────────────────────────────────────────┘
```

## Superseding Entries

Since journal entries are immutable, you can't edit them. Instead, use **superseding**:

```
Entry #15: "Deployed v2.1.0 to production"
Entry #16: "CORRECTION: v2.1.0 deployment rolled back due to memory leak"
           ↑ supersedes #15
```

Entry #15 is marked as `invalidated` with a reference to #16, preserving the full history.

## Tags

Tags classify journal entries for filtering:

```typescript
await engine.writeJournal({
  title: 'Database migration completed',
  body: 'Added embeddings column to observations table...',
  tags: ['migration', 'database', 'breaking-change'],
  projectId: 'my-app',
});
```

Search by tags (AND logic — all tags must match):

```typescript
await engine.searchJournal({
  tags: ['migration', 'breaking-change'],
});
```

## Tools

| Tool | Purpose |
|------|---------|
| `mem_journal_write` | Create a new entry |
| `mem_journal_read` | Read a specific entry |
| `mem_journal_search` | Search entries with FTS5, tags, and date filters |

## See Also

- [Observations](/docs/core-concepts/observations) — mutable knowledge records
- [Sessions](/docs/core-concepts/sessions) — grouping by conversation
