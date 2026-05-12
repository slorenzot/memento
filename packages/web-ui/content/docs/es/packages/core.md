# Paquete Core

`@slorenzot/memento-core` — el motor de base de datos que potencia todas las herramientas de Memento.

## Instalación

```bash
bun add @slorenzot/memento-core
```

## Uso

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

// Crear motor con ruta de base de datos
const engine = new MemoryEngine('./data/memento.db');

// Verificar salud
if (!engine.isHealthy()) {
  console.error('Error de inicio de base de datos:', engine.getInitError());
}
```

## Métodos Principales

### Observaciones

```typescript
// Crear
const obs = await engine.createObservation({
  sessionId: 1,
  title: 'Título',
  content: 'Contenido',
  type: 'decision',
  topicKey: 'architecture/auth',
  projectId: 'mi-app',
});

// Obtener por ID
const obs = await engine.getObservation(42);

// Actualizar
await engine.updateObservation(42, { title: 'Nuevo Título' });

// Buscar
const results = await engine.search({
  query: 'auth',
  type: 'decision',
  projectId: 'mi-app',
  limit: 10,
});

// Eliminar / Restaurar
await engine.deleteObservation(42);
await engine.restoreObservation(42);

// Fijar / Bloquear
await engine.pinObservation(42);
await engine.lockObservation(42);
```

### Sesiones

```typescript
const session = await engine.createSession({
  projectId: 'mi-app',
  endedAt: null,
  metadata: {},
});

await engine.endSession(session.id);
const sessions = await engine.listSessions({ projectId: 'mi-app' });
```

### Journal

```typescript
const entry = await engine.writeJournal({
  projectId: 'mi-app',
  sessionId: 1,
  title: 'Desplegado v2.0',
  body: 'Despliegue a producción...',
  tags: ['deploy', 'produccion'],
});

const results = await engine.searchJournal({
  tags: ['deploy'],
  activeOnly: true,
});
```

### Exportación y Fusión

```typescript
const exported = await engine.exportObservations({
  format: 'json',
  projectId: 'mi-app',
});

const merged = await engine.mergeObservations({
  projectId: 'mi-app',
  topicKey: 'architecture/auth',
  dryRun: true,
});
```

## Base de Datos

- **Motor:** `bun:sqlite` (SQLite vía binding nativo de Bun)
- **Fallback:** `better-sqlite3` (para webpack de Next.js)
- **PRAGMAs:** modo WAL, foreign keys ON, busy_timeout 5000ms
- **6 tablas:** `sessions`, `observations`, `prompts`, `projects`, `journal`, `journal_tags`

## Ver También

- [Arquitectura: Base de Datos](/es/docs/architecture/database) — detalles del diseño de base de datos
- [Servidor MCP](/es/docs/packages/mcp-server) — capa de integración MCP
