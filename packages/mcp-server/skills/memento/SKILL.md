---
name: memento
description: >
  Persistent memory protocol for AI coding agents using Memento.
  Teaches when and how to save, search, merge, delete and export
  memories across coding sessions. ALWAYS ACTIVE when Memento MCP
  is connected — not something you activate on demand.
  Trigger: When Memento MCP server is connected.
license: CC-BY-NC-ND-4.0
metadata:
  author: Soulberto Lorenzo
  version: '1.0'
  package: '@slorenzot/memento-mcp-server'
---

# Memento — Persistent Memory Protocol for AI Agents

You have access to **Memento**, a persistent memory system that survives across sessions and context window compactions. This protocol is **MANDATORY and ALWAYS ACTIVE** — not something you activate on demand.

## Core Concept

Memento is your PERSISTENT BRAIN. Without it, you forget everything when a session ends. With it, you accumulate knowledge, decisions, discoveries, and patterns that make you increasingly effective over time.

All tools use the prefix `mem_`.

---

## PROACTIVE SAVE TRIGGERS (mandatory — do NOT wait to be asked)

Call `mem_save` IMMEDIATELY and WITHOUT BEING ASKED after any of these events:

- Architecture or design decision made
- Bug fix completed (include root cause + solution)
- Non-obvious discovery about the codebase
- Configuration change or environment setup
- Pattern or convention established
- User preference or constraint learned
- Gotcha, edge case, or unexpected behavior found
- Team convention documented or workflow change agreed upon

**Self-check after EVERY task**: "Did I make a decision, fix a bug, learn something non-obvious, or establish a convention? If yes, call `mem_save` NOW."

### Save Format

```
mem_save({
  title: "Verb + what",              // Short, SEARCHABLE. e.g. "Fixed N+1 in UserList"
  content: "structured text",         // Use What/Why/Where/Learned format below
  type: "decision|bug|discovery|note",
  topic_key: "stable/key",           // For evolving topics. e.g. "architecture/auth"
  project_id: "project-name"
})
```

**Content structure** (always use this format):

```
**What**: One sentence — what was done
**Why**: What motivated it (user request, bug, performance, etc.)
**Where**: Files or paths affected
**Learned**: Gotchas, edge cases, things that surprised you (omit if none)
```

### Topic Key Rules

- Same topic evolving over time -> reuse same `topic_key` (upsert behavior)
- Different topics -> different topic_keys (NEVER overwrite unrelated topics)
- Use `/` separators: `"architecture/auth-model"`, `"bugfix/n-plus-one"`
- Keep keys stable across sessions — don't change them

---

## WHEN TO SEARCH MEMORY

### Proactive Search (do this BEFORE responding)

Call `mem_search` PROACTIVELY when:

1. **User's FIRST message** references a project, feature, or problem — search for prior work before responding
2. **Starting work** on something that might have been done before
3. **No context** on a topic the user mentions — check if past sessions covered it

### Reactive Search (user asks to recall)

On any variation of "remember", "recall", "what did we do", "how did we solve", "recordar", "que hicimos":

1. `mem_search` with relevant keywords (fast FTS5 search)
2. If match found, `mem_get_observation` for full untruncated content
3. Use recovered context to inform your response

---

## SESSION MANAGEMENT

### Starting a Session

Call `mem_session_start` with `project_id` at the beginning of a session.

### During a Session

Save observations **as you work**. Don't batch — save immediately after each significant event.

### Ending a Session (MANDATORY)

Before saying "done" / "listo" / "that's it", you MUST call `mem_save` with a session summary:

```
mem_save({
  title: "Session summary: [brief description]",
  type: "note",
  content: `
## Goal
[What we were working on this session]

## Accomplished
- [Completed items with key details]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Next Steps
- [What remains to be done — for the next session]

## Relevant Files
- path/to/file — [what it does or what changed]
  `
})
```

This is NOT optional. If you skip this, the next session starts blind.

---

## TOOL REFERENCE

### Core Tools — Observations

| Tool                          | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `mem_save`            | Save observation (decision, bug, discovery, note) |
| `mem_search`          | Full-text search across all observations          |
| `mem_get_observation` | Get full content by ID                            |
| `mem_update`          | Update existing observation                       |

### Lifecycle Tools — Delete, Restore, Merge, Export

| Tool                       | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `mem_delete`       | Soft-delete (hides from search, can be restored)                             |
| `mem_restore`      | Restore a soft-deleted observation                                           |
| `mem_purge`        | PERMANENTLY delete soft-deleted obs (irreversible, requires `confirm: true`) |
| `mem_list_deleted` | List soft-deleted observations                                               |
| `mem_merge`        | Merge related observations into one synthesized record                       |
| `mem_export`       | Export observations to JSON, XML, or TXT                                     |

### Session Tools

| Tool                        | Description              |
| --------------------------- | ------------------------ |
| `mem_session_start` | Start tracking a session |
| `mem_session_end`   | End current session      |
| `mem_list_sessions` | List sessions            |
| `mem_get_session`   | Get session details      |

### Utility Tools

| Tool                   | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `mem_timeline` | Chronological view of observations             |
| `mem_stats`    | Memory statistics (total, by type, by project) |
| `mem_health`   | System health check                            |
| `mem_config`   | Current configuration and available tools      |

---

## MERGE PROTOCOL

When the user asks to consolidate/merge memories, or when you detect excessive redundancy:

```
// 1. Preview candidates (dry run)
mem_merge({
  project_id: "my-project",
  strategy: "by_topic",  // or "by_similarity" or "by_ids"
  dry_run: true
})

// 2. Execute merge
mem_merge({
  project_id: "my-project",
  strategy: "by_topic"
})
```

Strategies:

- `by_topic`: Merges observations sharing the same `topic_key`
- `by_similarity`: Merges observations with Jaccard similarity > 0.85
- `by_ids`: Merges specific observation IDs you provide

---

## DELETE PROTOCOL

Observations follow a lifecycle: **ACTIVE -> SOFT DELETED -> PURGED**

```
// Soft delete (recoverable)
mem_delete({ id: 123, reason: "obsolete decision" })

// List what's been deleted
mem_list_deleted({ project_id: "my-project" })

// Restore if needed
mem_restore({ id: 123 })

// Permanent delete (irreversible)
mem_purge({ confirm: true, project_id: "my-project" })
```

---

## EXPORT PROTOCOL

```
// Export to JSON (default)
mem_export({ project_id: "my-project" })

// Export decisions to XML
mem_export({ format: "xml", type: "decision" })

// Export with date range
mem_export({
  format: "txt",
  project_id: "my-project",
  date_from: "2026-01-01",
  date_to: "2026-04-01"
})
```

---

## AFTER COMPACTION

If you detect your context was compacted (lost context, "FIRST ACTION REQUIRED" message):

1. **IMMEDIATELY** search memento for recent session context:
   ```
   mem_search({ project_id: "current-project", limit: 10 })
   ```
2. Rebuild understanding from saved observations
3. Continue working with recovered context

Do NOT skip this step. Without it, everything done before compaction is effectively lost.

---

## BEST PRACTICES

1. **Save EARLY, save OFTEN** — don't wait for session end
2. **Search BEFORE starting** — check if this was done before
3. **Titles should be SEARCHABLE** — "Fixed N+1 in UserList" not "Bug fix"
4. **Content should be STRUCTURED** — always use What/Why/Where/Learned
5. **Types matter** — use decision/bug/discovery/note correctly
6. **Topic keys are STABLE** — don't change them between sessions
7. **Merge periodically** — reduce redundancy with `mem_merge`
8. **Soft delete first** — use `mem_delete` before purging permanently
