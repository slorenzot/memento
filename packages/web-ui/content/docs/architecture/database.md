# Database Architecture

Memento uses SQLite as its persistence layer — fast, embedded, and zero-configuration.

## Engine

| Aspect | Detail |
|--------|--------|
| **Runtime** | `bun:sqlite` (native Bun binding) |
| **Fallback** | `better-sqlite3` (for Next.js webpack builds) |
| **PRAGMAs** | WAL mode, `foreign_keys = ON`, `busy_timeout = 5000ms` |

## Tables

### `sessions`

Tracks conversation sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `projectId` | TEXT | Project identifier |
| `endedAt` | TEXT | ISO timestamp or NULL |
| `metadata` | TEXT | JSON blob |
| `createdAt` | TEXT | ISO timestamp |

### `observations`

The core data unit.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `sessionId` | INTEGER FK | Reference to sessions |
| `title` | TEXT | Short, searchable title |
| `content` | TEXT | Full content (Markdown) |
| `type` | TEXT | One of 10 types |
| `topicKey` | TEXT | Grouping key |
| `projectId` | TEXT | Project scope |
| `scope` | TEXT | `project` or `personal` |
| `pinned` | INTEGER | Boolean flag |
| `readOnly` | INTEGER | Boolean flag |
| `deletedAt` | TEXT | Soft-delete timestamp |
| `metadata` | TEXT | JSON blob |
| `embedding` | BLOB | Vector embedding |
| `createdAt` | TEXT | ISO timestamp |
| `updatedAt` | TEXT | ISO timestamp |

### `journal`

Append-only evidence log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `projectId` | TEXT | Project identifier |
| `sessionId` | INTEGER | Optional session |
| `title` | TEXT | Entry title |
| `body` | TEXT | Full body content |
| `supersedes` | INTEGER | ID of invalidated entry |
| `invalidatedAt` | TEXT | When superseded |
| `metadata` | TEXT | JSON blob |
| `createdAt` | TEXT | ISO timestamp |

### `journal_tags`

Tags for journal entries (many-to-many).

| Column | Type |
|--------|------|
| `journalId` | INTEGER FK |
| `tag` | TEXT |

### `projects`

Tracks known projects.

### `prompts`

Stores prompt configurations for injection.

## FTS5 Virtual Tables

### `observations_fts`

Full-text search index for observations. Uses **standalone mode** (no `content=`), synced at application level.

```
CREATE VIRTUAL TABLE observations_fts USING fts5(
  title,
  content,
  topicKey,
  projectId,
  content=observations,
  content_rowid=id
);
```

### `journal_fts`

Full-text search for journal entries. Uses **content table mode** with automatic insert trigger.

## Migrations

Migrations are handled inline with `try/catch` per column — no external migration framework. New columns are added via `ALTER TABLE ADD COLUMN` wrapped in try/catch for idempotency.

## Performance Characteristics

- **WAL mode** enables concurrent reads during writes
- **FTS5** provides sub-millisecond full-text search
- **busy_timeout = 5000ms** prevents lock errors under load
- **foreign_keys** enforced for data integrity

## See Also

- [Core Package](/docs/packages/core) — engine API
- [Search](/docs/core-concepts/search) — search modes and FTS5 syntax
