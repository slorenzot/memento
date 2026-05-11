# Merge

Merge related observations into a single synthesized record. Useful for consolidating duplicate or overlapping observations.

## Strategies

| Strategy | How it works |
|----------|-------------|
| `by_topic` | Merge all observations with the same `topic_key` |
| `by_similarity` | Merge observations with Jaccard similarity > 0.85 |
| `by_ids` | Merge specific observation IDs |

## Always Dry-Run First

```typescript
// Preview what would be merged (no changes)
const preview = await engine.mergeObservations({
  projectId: 'my-app',
  topicKey: 'architecture/auth-model',
  strategy: 'by_topic',
  dryRun: true,
});
// Result: "Preview: 3 merge groups found (dry run)"
```

Review the preview, then execute:

```typescript
const result = await engine.mergeObservations({
  projectId: 'my-app',
  topicKey: 'architecture/auth-model',
  strategy: 'by_topic',
  dryRun: false,
});
// Result: "Merged 3 groups (12 observations consolidated)"
```

## What Happens During Merge

1. **Identify candidates** — based on strategy
2. **Synthesize** — combine content from all observations in the group
3. **Create merged** — a new observation replaces the originals
4. **Soft-delete originals** — the source observations are soft-deleted (not permanently removed)

The merged observation:
- Inherits the `topic_key` from the group
- Contains synthesized content from all originals
- Is tagged with merge metadata

## By Similarity

The `by_similarity` strategy uses Jaccard similarity on word sets:

```
Observation A: "SQLite FTS5 doesn't handle special characters"
Observation B: "FTS5 has issues with special characters in SQLite"

Jaccard similarity > 0.85 → MERGE CANDIDATE
```

## By IDs

For manual control:

```typescript
await engine.mergeObservations({
  projectId: 'my-app',
  observationIds: [42, 43, 44],
  strategy: 'by_ids',
});
```

## See Also

- [Observations](/docs/core-concepts/observations) — topic keys and grouping
- [Export & Import](/docs/capabilities/export-import) — backup before merging
