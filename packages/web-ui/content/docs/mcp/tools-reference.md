# MCP Tools Reference

Complete reference for all 21 Memento MCP tools. All tools return human-readable Markdown responses.

## Observation Tools

### `mem_save`

Save an observation to persistent memory.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | ✅ | Short, searchable title |
| `content` | string | ✅ | Structured content (What/Why/Where/Learned) |
| `type` | enum | — | `decision`, `bug`, `discovery`, `note`, `summary`, `learning`, `pattern`, `architecture`, `config`, `preference` (default: `note`) |
| `topic_key` | string | — | Stable key for grouping (e.g. `"architecture/auth"`) |
| `project_id` | string | — | Project identifier |
| `scope` | enum | — | `project` or `personal` |
| `pinned` | boolean | — | Pin for always-injection (default: `false`) |
| `read_only` | boolean | — | Mark as read-only (default: `false`) |
| `metadata` | object | — | Additional metadata |

**Response:** Confirmation with observation ID and suggested `topic_key` if none was provided.

---

### `mem_search`

Search observations using full-text search.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | — | Search query (FTS5 syntax or natural language) |
| `type` | enum | — | Filter by observation type |
| `project_id` | string | — | Filter by project |
| `topic_key` | string | — | Filter by topic (exact match) |
| `limit` | number | — | Max results (default: 10) |
| `offset` | number | — | Pagination offset |
| `include_deleted` | boolean | — | Include soft-deleted |
| `scope` | enum | — | `project` or `personal` |
| `sort` | enum | — | `relevance` (default) or `chronological` |
| `mode` | enum | — | `keyword` (default), `semantic`, or `hybrid` |

**Response:** Markdown list of matching observations (content truncated). Use `mem_get_observation` for full content.

---

### `mem_get_observation`

Get full untruncated content of a specific observation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ | Observation ID |
| `include_deleted` | boolean | — | Include soft-deleted (default: `false`) |

**Response:** Full observation details in Markdown.

---

### `mem_update`

Update an existing observation. Only provided fields are updated.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ | Observation ID |
| `title` | string | — | New title |
| `content` | string | — | New content |
| `type` | enum | — | New type |
| `topic_key` | string | — | New topic key |
| `pinned` | boolean | — | Pin/unpin |

**Response:** Confirmation of update.

---

### `mem_replace`

Replace a substring within observation content — more token-efficient than `mem_update` for small changes.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ | Observation ID |
| `old_text` | string | ✅ | Exact substring to find (must be unique) |
| `new_text` | string | ✅ | Replacement text |

**Response:** Confirmation with character counts. Fails if text not found or appears multiple times. Respects read-only protection.

---

## Lifecycle Tools

### `mem_delete`

Delete, restore, purge, or list deleted observations.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | enum | — | `soft` (default), `restore`, `permanent`, `list` |
| `id` | number | — | Required for `soft` and `restore` |
| `confirm` | boolean | — | Must be `true` for `permanent` |
| `reason` | string | — | Reason for deletion |
| `project_id` | string | — | Filter for `list` and `permanent` |
| `observation_ids` | number[] | — | Specific IDs to purge |
| `limit` | number | — | Max results for `list` (default: 20) |

---

### `mem_merge`

Merge related observations into a single record.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | ✅ | Project to merge in |
| `topic_key` | string | — | Merge by topic |
| `observation_ids` | number[] | — | Merge specific IDs |
| `strategy` | enum | — | `by_topic` (default), `by_similarity`, `by_ids` |
| `dry_run` | boolean | — | Preview without executing (recommended first) |

---

## Pin & Lock

### `mem_pin` / `mem_unpin`

Pin/unpin an observation for system prompt injection.

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | number | ✅ |

### `mem_lock` / `mem_unlock`

Lock/unlock an observation as read-only.

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | number | ✅ |

---

## Session Tools

### `mem_session_start`

Start a new memory session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | ✅ | Project identifier |
| `metadata` | object | — | Additional session metadata |

### `mem_session_end`

End the current active session. No parameters required.

### `mem_session_summary`

Save a session summary observation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | ✅ | Structured summary (Goal/Discoveries/Accomplished/Files) |
| `project_id` | string | ✅ | Project identifier |
| `session_id` | number | — | Uses active session if not provided |

---

## Agent Convenience

### `mem_context`

Get recent observations for context recovery. Does NOT use FTS5.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | — | Filter by project |
| `limit` | number | — | Max results (default: 20) |
| `scope` | enum | — | `project` or `personal` |

### `mem_capture_passive`

Extract learnings from text with automatic deduplication.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | ✅ | Text to parse for learnings |
| `project_id` | string | — | Project identifier |
| `session_id` | number | — | Session ID |
| `source` | string | — | Source description |

### `mem_status`

System diagnostics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `section` | enum | — | `all` (default), `health`, `stats`, `config`, `sessions` |
| `session_id` | number | — | Get specific session details |
| `project_id` | string | — | Filter sessions by project |
| `limit` | number | — | Max sessions (default: 20) |

---

## Export

### `mem_export`

Export observations to JSON, XML, or TXT.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | enum | — | `json` (default), `xml`, `txt` |
| `project_id` | string | — | Filter by project |
| `type` | enum | — | Filter by type |
| `topic_key` | string | — | Filter by topic |
| `date_from` | string | — | ISO date — export from |
| `date_to` | string | — | ISO date — export until |
| `include_deleted` | boolean | — | Include soft-deleted |

---

## Journal Tools

### `mem_journal_write`

Create an immutable journal entry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | ✅ | Short, descriptive title |
| `body` | string | ✅ | Full body content |
| `tags` | string[] | — | Classification tags |
| `project_id` | string | — | Project identifier |
| `supersedes` | number | — | ID of entry this corrects |
| `metadata` | object | — | Additional metadata |

### `mem_journal_read`

Read a journal entry by ID.

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | number | ✅ |

### `mem_journal_search`

Search journal entries with FTS5, tags, and date filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | — | FTS5 search query |
| `tags` | string[] | — | Filter by tags (AND logic) |
| `project_id` | string | — | Filter by project |
| `active_only` | boolean | — | Exclude superseded entries |
| `date_from` | string | — | ISO date filter |
| `date_to` | string | — | ISO date filter |
| `limit` | number | — | Max results (default: 20) |
| `offset` | number | — | Pagination offset |
