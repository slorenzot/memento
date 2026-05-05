---
name: memento
description: >
  Persistent memory protocol for AI coding agents using Memento.
  Teaches when and how to save, search, and organize memories across
  coding sessions. ALWAYS ACTIVE when Memento MCP is connected.
license: CC-BY-NC-ND-4.0
metadata:
  author: Soulberto Lorenzo
  version: '2.0'
  package: '@slorenzot/memento-mcp-server'
---

# Memento — Persistent Memory Protocol for AI Agents

You have access to **Memento**, a persistent memory system that survives across sessions and context window compactions. This protocol is **MANDATORY and ALWAYS ACTIVE** — not something you activate on demand.

## Core Principle

**Save KNOWLEDGE (reference data), not just EVENTS (session chronicles).**

Every observation should answer: "Would the NEXT session need this to avoid re-reading files?"

All tools use the prefix `mem_`.

---

## 1. TYPE SEMANTICS (strict)

Use observation types with strict semantics — never mix purposes:

| Type | Purpose | Example |
|------|---------|---------|
| `decision` | Architectural decisions with rationale | "Engine deals with DATA only, MCP tool handles file I/O" |
| `discovery` | Codebase knowledge: where things are, how they work | "Auth logic lives in `packages/core/src/auth/`" |
| `bug` | Bugs, gotchas, non-obvious behaviors | "bun:sqlite doesn't have db.transaction()" |
| `note` | Session chronicles, PR changelogs | "Merged PR #25: mem_reset tool" |

---

## 2. TOPIC KEY HIERARCHY

Use topic keys as a filing system — organized by **KNOWLEDGE**, not by event:

```
{project}/index                        → Project overview (upsert each session)
{project}/architecture/{component}     → How a component works
{project}/patterns/{category}          → Coding patterns established
{project}/gotchas/{area}               → Non-obvious behaviors
{project}/config/{area}                → Configuration details
{project}/changelog/pr-{number}        → PR history (event-based)
```

**Never** use PR numbers or session IDs in topic keys for reference knowledge.

Topic key rules:
- Same topic evolving over time → reuse same `topic_key` (upsert behavior)
- Different topics → different topic_keys (NEVER overwrite unrelated topics)
- Use `/` separators: `"architecture/auth-model"`, `"gotchas/bun-sqlite"`
- Keep keys stable across sessions — don't change them

---

## 3. UPSERT BY TOPIC KEY

When learning NEW information about an existing topic:

1. `mem_search(query="...", project_id="...")` → find existing observation
2. If found → `mem_update(id)` with expanded content (append new info)
3. If not found → `mem_save` with new topic_key

**Never create duplicate observations on the same topic.** One topic = one consolidated source of truth.

---

## 4. GOTCHA EXTRACTION

After each session, extract gotchas as SEPARATE observations:

- `type: "bug"`
- `topic_key: "{project}/gotchas/{area}"`
- Include: symptom, root cause, workaround, affected files
- Use `metadata.tags` with searchable concepts

**Do not bury gotchas inside PR notes or session summaries.**

---

## 5. PROJECT INDEX

On first session in a project (or when the index doesn't exist), create:

- `type: "discovery"`
- `topic_key: "{project}/index"`
- Content: Stack, architecture, key files, patterns, build/test commands
- `metadata.tags` with main technologies

**Upsert (update)** the index when project structure changes. Never replace — always update.

---

## 6. STRUCTURED METADATA

Always populate `metadata` with structured data:

```json
{
  "files": ["path/to/file.ts"],
  "tags": ["concept1", "concept2"],
  "category": "architecture"
}
```

Categories: `architecture` | `pattern` | `config` | `gotcha` | `index` | `changelog`

---

## 7. SESSION CLOSE = REFERENCE EXTRACTION

When closing a session, extract knowledge BEFORE ending:

1. **Session summary** → `mem_save(type="note", topic_key="{project}/changelog/session-{id}")`
2. **Architectural discoveries** → `mem_save(type="discovery", topic_key="{project}/architecture/*")`
3. **Gotchas found** → `mem_save(type="bug", topic_key="{project}/gotchas/*")`
4. **Upsert project index** if structure changed

**Do not skip this step.** This is what makes the next session start with context.

---

## PROACTIVE SAVE TRIGGERS (mandatory — do NOT wait to be asked)

Call `mem_save` IMMEDIATELY and WITHOUT BEING ASKED after any of these:

- Architecture or design decision made
- Bug fix completed (include root cause + solution)
- Non-obvious discovery about the codebase
- Configuration change or environment setup
- Pattern or convention established
- User preference or constraint learned
- Gotcha, edge case, or unexpected behavior found

**Self-check after EVERY task**: "Did I make a decision, fix a bug, learn something non-obvious, or establish a convention? If yes, call `mem_save` NOW."

### Save Format

```
mem_save({
  title: "Verb + what",              // Short, SEARCHABLE
  content: "structured text",         // Use What/Why/Where/Learned below
  type: "decision|bug|discovery|note",
  topic_key: "stable/key",           // e.g. "architecture/auth-model"
  project_id: "project-name",
  metadata: { files: [...], tags: [...], category: "..." }
})
```

**Content structure** (always use this format):

```
**What**: One sentence — what was done
**Why**: What motivated it (user request, bug, performance, etc.)
**Where**: Files or paths affected
**Learned**: Gotchas, edge cases, things that surprised you (omit if none)
```

---

## WHEN TO SEARCH MEMORY

### Proactive Search (do this BEFORE responding)

1. **User's FIRST message** references a project, feature, or problem → search for prior work
2. **Starting work** on something that might have been done before
3. **No context** on a topic the user mentions

### Reactive Search (user asks to recall)

On "remember", "recall", "what did we do", "recordar", "qué hicimos":

1. `mem_search` with relevant keywords
2. If found, `mem_get_observation` for full untruncated content
3. Use recovered context to inform response

---

## TOOL REFERENCE

### Core Tools — Observations

| Tool | Description |
|------|-------------|
| `mem_save` | Save observation (decision, bug, discovery, note) |
| `mem_search` | Full-text search across all observations |
| `mem_get_observation` | Get full content by ID |
| `mem_update` | Update existing observation |
| `mem_delete` | Delete an observation |

### Session Tools

| Tool | Description |
|------|-------------|
| `mem_session_start` | Start tracking a session |
| `mem_session_end` | End current session |
| `mem_list_sessions` | List sessions |
| `mem_get_session` | Get session details |

### Utility Tools

| Tool | Description |
|------|-------------|
| `mem_timeline` | Chronological view of observations |
| `mem_stats` | Memory statistics (total, by type, by project) |
| `mem_health` | System health check |
| `mem_config` | Current configuration |
| `mem_export` | Export observations to JSON file |
| `mem_import` | Import observations from JSON file |
| `mem_reset` | Reset database (full or by project, requires confirm) |

---

## AFTER COMPACTION

If you detect your context was compacted (lost context, "FIRST ACTION REQUIRED"):

1. **IMMEDIATELY** search memento for recent session context:
   ```
   mem_search({ query: "session summary", project_id: "current-project" })
   ```
2. Check `mem_search(query: "{project}/index")` for project overview
3. Check `mem_search(query: "{project}/gotchas")` for known gotchas
4. Rebuild understanding from saved observations
5. Continue working with recovered context

---

## BEST PRACTICES

1. **Save KNOWLEDGE, not events** — "How import works" > "Merged PR #24"
2. **Search BEFORE starting** — check if this was done before
3. **Titles should be SEARCHABLE** — "Fixed N+1 in UserList" not "Bug fix"
4. **Content should be STRUCTURED** — always use What/Why/Where/Learned
5. **Types are SEMANTIC** — decision/bug/discovery/note each have a purpose
6. **Topic keys are a FILING SYSTEM** — organize by knowledge, not by event
7. **Upsert, don't duplicate** — update existing topics instead of creating new obs
8. **Extract gotchas separately** — don't bury them in session notes
9. **Always populate metadata** — files, tags, category enable future search
10. **Save EARLY, save OFTEN** — don't wait for session end
