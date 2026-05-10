# Memento Migration Guide

This guide helps you upgrade between major versions of Memento. Each section covers breaking changes, behavioral changes, and concrete before/after examples.

> **Tip**: Always check the [CHANGELOG](./CHANGELOG.md) for the full list of changes per release.

---

## Migrating from v1.x to v2.0

### 11 deprecated MCP tools removed

The following deprecated tools have been removed. Use their consolidated replacements instead.

| # | Removed Tool | Replacement |
|---|-------------|-------------|
| 1 | `mem_restore` | `mem_delete(action="restore", id=...)` |
| 2 | `mem_purge` | `mem_delete(action="permanent", confirm=true)` |
| 3 | `mem_list_deleted` | `mem_delete(action="list")` |
| 4 | `mem_timeline` | `mem_search(sort="chronological")` |
| 5 | `mem_stats` | `mem_status(section="stats")` |
| 6 | `mem_health` | `mem_status(section="health")` |
| 7 | `mem_config` | `mem_status(section="config")` |
| 8 | `mem_list_sessions` | `mem_status(section="sessions")` |
| 9 | `mem_get_session` | `mem_status(session_id=...)` |
| 10 | `mem_suggest_topic_key` | Auto-suggested in `mem_save` response |
| 11 | `mem_save_prompt` | Removed — `mem_context` works via observations, not prompts |

**Before (v1.x):**

```
// Restore a deleted observation
mem_restore(id=42)

// Check system health
mem_health()

// Get chronological timeline
mem_timeline(project_id="my-project", limit=10)

// Suggest a topic key
mem_suggest_topic_key(title="Fixed N+1 query")
```

**After (v2.0):**

```
// Restore a deleted observation
mem_delete(action="restore", id=42)

// Check system health
mem_status(section="health")

// Get chronological timeline
mem_search(sort="chronological", project_id="my-project", limit=10)

// Topic key auto-suggested in mem_save response
mem_save(title="Fixed N+1 query", content="...", type="bug")
// Response: Observation #123 saved. Suggested topic_key: bug/fixed-n-1-query
```

### Tool count reduced from 27 to 16

The MCP server now exposes 16 active tools:

| Category | Tools |
|----------|-------|
| **Observations** | `mem_save`, `mem_search`, `mem_get_observation`, `mem_update`, `mem_delete`, `mem_merge`, `mem_export` |
| **Sessions** | `mem_session_start`, `mem_session_end`, `mem_session_summary` |
| **Context** | `mem_context`, `mem_capture_passive`, `mem_status` |
| **Journal** | `mem_journal_write`, `mem_journal_read`, `mem_journal_search` |

### Agent system prompt updates required

If your agent system prompts reference any of the 11 removed tools, update them to use the replacements. Common patterns:

- Remove all `mem_save_prompt` instructions — context recovery works via `mem_context` which queries observations
- Replace `mem_health()` calls with `mem_status(section="health")`
- Replace `mem_timeline()` calls with `mem_search(sort="chronological")`

### `mem_save_prompt` removal — no auto-tracking replacement

The `mem_save_prompt` tool has been removed without an auto-tracking replacement. This is safe because:

- `mem_context` queries the **observations** table, not the prompts table
- Session recovery works entirely through observations and session summaries
- The `prompts` table remains in the database schema (existing data preserved)
- No functional gap — agents that used `mem_save_prompt` can simply stop calling it

---

## Migrating from v1.0 to v1.1

### MCP tool responses changed from JSON to clean text

Tool responses are now human-readable text instead of JSON objects.

**Before (v1.0):**

```json
{"success": true, "id": 123, "title": "My observation"}
```

**After (v1.1):**

```
Observation #123 "My observation" saved (note, my-project)
Suggested topic_key: note/my-observation
```

Agents that parse tool responses as JSON must adapt to text-based responses.

### `mem_capture_passive` deduplicates against existing DB

**Before:** Two calls with the same content created duplicate observations.

**After:** The second call returns 0 new captures (deduplicated via Jaccard similarity > 0.85 against existing DB learnings).

### New tools: `mem_export`

- `mem_export`: Export observations to JSON, XML, or TXT format with filters
- Useful for backups, migration, or sharing memory across projects

### Consolidated tools introduced

These consolidated tools were added in v1.1 and the deprecated equivalents are removed in v2.0:

- `mem_delete` — replaces `mem_restore`, `mem_purge`, `mem_list_deleted`
- `mem_status` — replaces `mem_stats`, `mem_health`, `mem_config`, `mem_list_sessions`, `mem_get_session`
- `mem_search(sort=...)` — replaces `mem_timeline`

---

## Migrating from v0.x to v1.0

### Observation types expanded (4 → 10)

Previously only 4 types were available: `decision`, `bug`, `discovery`, `note`.

Now 6 additional types are supported: `summary`, `learning`, `pattern`, `architecture`, `config`, `preference`.

**Before:**

```typescript
mem_save({ type: "note" })  // only 4 options
```

**After:**

```typescript
mem_save({ type: "pattern" })  // 10 options available
```

### Scope field added

A new `scope` parameter controls visibility: `"project"` (default) or `"personal"`.

**Before:** No scope parameter. All observations were project-scoped by default.

**After:**

```typescript
mem_save({
  title: "My preference",
  content: "...",
  scope: "personal"  // new parameter
})
```

### Journal auto-metadata

Journal entries now automatically capture metadata (model, provider, agent, session) without manual specification.

**Before:** Manual metadata only.

**After:** Entries automatically include agent context in their metadata.

### Journal append-only with invalidation

Journal entries are now immutable. Use `supersedes` to correct a previous entry without breaking the audit trail.

**Before:** No journal system.

**After:**

```typescript
mem_journal_write({
  title: "Corrected architecture decision",
  body: "...",
  supersedes: 42  // marks entry #42 as invalidated
})
```

### Session summary tool

A dedicated tool for creating session summaries at conversation end.

```typescript
mem_session_summary({
  content: "## Goal\n...\n## Accomplished\n...",
  project_id: "my-project"
})
```
