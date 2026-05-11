# Passive Capture

Passive capture extracts learnings from text content — such as agent responses, code reviews, or session notes — without requiring explicit `mem_save` calls for each item.

## How It Works

1. **Parse** — looks for sections like `## Key Learnings:` or `## Aprendizajes Clave:`
2. **Extract** — individual bullet points or numbered items
3. **Deduplicate within batch** — Jaccard similarity > 0.85 removes duplicates
4. **Deduplicate against DB** — checks existing learnings to avoid re-saving
5. **Create** — saves new, unique items as `learning` type observations

## Usage

```typescript
const result = await engine.capturePassive({
  content: `
    ## Key Learnings:
    - SQLite FTS5 doesn't handle special characters well in prefix queries
    - WAL mode requires careful handling of connection pooling
    - Always use parameterized queries with FTS5 MATCH clauses
  `,
  projectId: 'my-app',
  source: 'code-review',
});
// Result: "Captured 3 learnings, 0 duplicates"
```

## Supported Section Headers

The parser recognizes these heading patterns:

- `## Key Learnings:`
- `## Aprendizajes Clave:`
- `## Learnings:`
- `## Lecciones Aprendidas:`

## Deduplication

Passive capture uses Jaccard similarity (word-set overlap > 0.85) to detect duplicates:

1. **Within batch** — if two items in the same text are similar, only one is kept
2. **Against existing** — if an existing `learning` observation in the DB is similar, the new one is skipped

This means you can run `mem_capture_passive` on the same content multiple times without creating duplicates.

## When to Use

- At the end of a coding session with an AI agent
- After a code review
- When importing notes from external sources
- After reading documentation or articles

## See Also

- [Observations](/docs/core-concepts/observations) — the `learning` type
- [Sessions](/docs/core-concepts/sessions) — grouping captured learnings
