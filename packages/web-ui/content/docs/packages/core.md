# Core Package

`@slorenzot/memento-core` — the database engine that powers all Memento tools.

## Installation

```bash
bun add @slorenzot/memento-core
```

## Usage

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

// Create engine with database path
const engine = new MemoryEngine('./data/memento.db');

// Check health
if (!engine.isHealthy()) {
  console.error('Database init failed:', engine.getInitError());
}
```

## Key Methods

### Observations

```typescript
// Create
const obs = await engine.createObservation({
  sessionId: 1,
  title: 'Title',
  content: 'Content',
  type: 'decision',
  topicKey: 'architecture/auth',
  projectId: 'my-app',
});

// Get by ID
const obs = await engine.getObservation(42);

// Update
await engine.updateObservation(42, { title: 'New Title' });

// Search
const results = await engine.search({
  query: 'auth',
  type: 'decision',
  projectId: 'my-app',
  limit: 10,
});

// Delete / Restore
await engine.deleteObservation(42);
await engine.restoreObservation(42);

// Pin / Lock
await engine.pinObservation(42);
await engine.lockObservation(42);
```

### Sessions

```typescript
const session = await engine.createSession({
  projectId: 'my-app',
  endedAt: null,
  metadata: {},
});

await engine.endSession(session.id);
const sessions = await engine.listSessions({ projectId: 'my-app' });
```

### Journal

```typescript
const entry = await engine.writeJournal({
  projectId: 'my-app',
  sessionId: 1,
  title: 'Deployed v2.0',
  body: 'Production deployment...',
  tags: ['deploy', 'production'],
});

const results = await engine.searchJournal({
  tags: ['deploy'],
  activeOnly: true,
});
```

### Export & Merge

```typescript
const exported = await engine.exportObservations({
  format: 'json',
  projectId: 'my-app',
});

const merged = await engine.mergeObservations({
  projectId: 'my-app',
  topicKey: 'architecture/auth',
  dryRun: true,
});
```

## Database

- **Engine:** `bun:sqlite` (SQLite via Bun's native binding)
- **Fallback:** `better-sqlite3` (for Next.js webpack)
- **PRAGMAs:** WAL mode, foreign keys ON, busy_timeout 5000ms
- **6 tables:** `sessions`, `observations`, `prompts`, `projects`, `journal`, `journal_tags`

## See Also

- [Architecture: Database](/docs/architecture/database) — database design details
- [MCP Server](/docs/packages/mcp-server) — MCP integration layer
