# Inicio rápido

Poné Memento en marcha y guardá tu primera observación en menos de 5 minutos.

## Instalación

Memento es un monorepo con múltiples paquetes. Instalá los que necesites:

```bash
# Motor core (requerido)
bun add @slorenzot/memento-core

# Servidor MCP (para integración con agentes de IA)
bun add @slorenzot/memento-mcp-server

# CLI (para flujos de trabajo en terminal)
bun add @slorenzot/memento-cli

# Web UI (para dashboard visual)
bun add @slorenzot/memento-web-ui
```

## Tu primera observación

### Desde código

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const engine = new MemoryEngine('./data/memento.db');

// Crear una sesión
const session = await engine.createSession({
  projectId: 'my-project',
  endedAt: null,
  metadata: {},
});

// Guardar una observación
const obs = await engine.createObservation({
  sessionId: session.id,
  title: 'Elegí SQLite en vez de PostgreSQL',
  content: `## Qué
Cambié de PostgreSQL a bun:sqlite para la capa de persistencia.

## Por qué
Memento necesita correr localmente sin configuración. bun:sqlite es embebido, rápido y no requiere proceso externo.

## Dónde
packages/core/src/MemoryEngine.ts

## Aprendido
bun:sqlite en modo WAL da excelente performance de lectura concurrente. Las tablas virtuales FTS5 manejan búsqueda de texto completo nativamente.`,
  type: 'decision',
  topicKey: 'architecture/persistence',
  projectId: 'my-project',
});
```

### Desde CLI

```bash
# Iniciar una sesión
memento session start --project my-project

# Guardar una observación
memento save "Corregí query N+1 en UserList" \
  --type bug \
  --project my-project

# Buscar en tu memoria
memento search "N+1 query"

# Ver contexto reciente
memento context --project my-project
```

### Desde MCP (Agentes de IA)

Si usás un agente de IA como Claude, Cursor u OpenCode, Memento se integra vía Model Context Protocol. Tu agente puede guardar y recuperar observaciones automáticamente.

Ver [Introducción a MCP](/es/docs/mcp/introduction) para guías de configuración.

## ¿Qué sigue?

- [Observaciones](/es/docs/core-concepts/observations) — conocé los 10 tipos de observación
- [Sesiones](/es/docs/core-concepts/sessions) — agrupá observaciones por conversación
- [Referencia de herramientas MCP](/es/docs/mcp/tools-reference) — las 21 herramientas con ejemplos
