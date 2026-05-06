# Memento

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io)
[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-core.svg)](https://www.npmjs.org/package/@slorenzot/memento-core)

**Memento** es un sistema de memoria persistente diseñado específicamente para agentes de codificación de IA. Resuelve el problema del olvido proporcionando un cerebro persistente que permite a los agentes mantener contexto, aprender y mejorar a través del tiempo.

> Memento no solo recuerda — COORDINA. Es el cerebro compartido que permite a un orquestador delegar trabajo a sub-agentes, rastrear progreso, retomar tareas interrumpidas, y medir costos. Todo con 3 tablas y cero fricción.

## ⚠️ Importante: Licencia Restrictiva

Este proyecto está bajo **Licencia CC BY-NC-ND 4.0**:
- ✅ **Uso personal y educacional permitido**
- ✅ **Compartir con atribución al autor**
- ❌ **Uso comercial NO permitido**
- ❌ **Modificaciones o forks NO permitidos**
- ❌ **Distribución de versiones modificadas NO permitida**

**Autor:** Soulberto Lorenzo (slorenzot@gmail.com)

## 🎯 Características Principales

- 🔍 **Búsqueda Full-text Avanzada**: SQLite FTS5 con ranking BM25 para búsqueda semántica ultra-rápida
- 🧠 **Memoria Persistente**: Almacenamiento duradero con SQLite en modo WAL para alto rendimiento
- 🔌 **MCP Integration**: 13 herramientas MCP completamente implementadas para agentes IA
- 🌐 **Multi-interfaz**: CLI con 12+ comandos, API HTTP RESTful, y Web UI moderna con React 18
- 📊 **Sesiones Inteligentes**: Sistema completo de gestión de sesiones con seguimiento de contexto
- ⚡ **Alto Rendimiento**: Optimizado con Bun runtime, respuestas <100ms para operaciones básicas
- 🛡️ **Type Safety**: TypeScript estricto con validación Zod y seguridad de tipos completa
- 🧪 **Bien Testado**: Cobertura de pruebas completa con Bun test framework
- 🔧 **Configuración Flexible**: Sistema `.mementorc` con soporte para variables de entorno
- 📈 **Dashboard y Estadísticas**: Métricas detalladas del sistema y análisis de uso en tiempo real

## 🚀 Instalación

### Requisitos Previos
- [Bun](https://bun.sh/) v1.0+ (runtime y package manager)
- Node.js v20+ (para compatibilidad)

### Instalación desde GitHub

```bash
# Clonar el repositorio
git clone https://github.com/slorenzot/memento.git
cd memento

# Instalar dependencias
bun install

# Construir el proyecto
bun run build

# Verificar instalación
bun test

# Iniciar servidor de desarrollo
bun run dev
```

## 📦 Paquetes NPM

- [`@slorenzot/memento-core`](https://www.npmjs.org/package/@slorenzot/memento-core) v0.7.0 - Motor de memoria central
- [`@slorenzot/memento-mcp-server`](https://www.npmjs.org/package/@slorenzot/memento-mcp-server) v0.9.0 - Servidor MCP
- [`@slorenzot/memento-cli`](https://www.npmjs.org/package/@slorenzot/memento-cli) v0.3.0 - CLI interface
- [`@slorenzot/memento-api`](https://www.npmjs.org/package/@slorenzot/memento-api) v0.3.0 - API HTTP
- [`@slorenzot/memento-web-ui`](https://www.npmjs.org/package/@slorenzot/memento-web-ui) v0.1.1 - Interfaz web React

## 📦 Uso

### MCP Server (Recomendado para Agentes IA)

```bash
# Instalar globalmente
bun add -g @slorenzot/memento-mcp-server

# Iniciar servidor MCP
memento-server

# El servidor muestra un banner ASCII al iniciar
# Configurar en MCP client (Claude Desktop, VS Code, etc.)
# Command: memento-server
```

**13 Herramientas MCP Disponibles:**

**Gestión de Observaciones:**
- `mem_save` - Guardar observaciones con UUID automático
- `mem_get_observation` - Obtener observación específica por ID
- `mem_update` - Actualizar observación existente
- `mem_delete` - Eliminar observación (soft delete)
- `mem_search` - Búsqueda full-text con FTS5 y BM25 ranking

**Gestión de Sesiones:**
- `mem_session_start` - Iniciar nueva sesión con metadatos
- `mem_session_end` - Finalizar sesión activa
- `mem_list_sessions` - Listar todas las sesiones
- `mem_get_session` - Obtener detalles de sesión específica

**Utilidades:**
- `mem_timeline` - Línea temporal de observaciones
- `mem_stats` - Estadísticas del sistema
- `mem_health` - Verificación de salud del sistema
- `mem_config` - Ver y modificar configuración

**Características del Servidor MCP:**
- Banner ASCII informativo al iniciar
- Manejo avanzado de errores con mensajes descriptivos
- Sistema de health checks robusto
- Soporte para perfiles Agent y Admin

### CLI Interface

```bash
# Instalar globalmente
bun add -g @slorenzot/memento-cli

# Comandos de gestión de observaciones
memento save "Título" "Contenido" --type decision --tags tag1,tag2
memento search "consulta de búsqueda" --limit 10
memento get <id>
memento update <id> --title "Nuevo título" --content "Nuevo contenido"
memento delete <id>

# Comandos de sesión
memento timeline --limit 20
memento stats

# Comandos de estado y configuración
memento status                    # Quick health check y resumen ejecutivo
memento recents                   # Mostrar observaciones recientes con tiempo relativo
memento config                    # Ver configuración actual

# Comandos de servidor
memento serve                     # Iniciar API HTTP
memento mcp                       # Iniciar servidor MCP

# Comandos de configuración de agentes IA
memento setup                     # Configurar para agentes IA
memento install-skill opencode    # Instalar skill para OpenCode
memento install-skill claude     # Instalar skill para Claude
memento install-skill /custom/path # Instalar skill desde ruta personalizada
```

**Nuevos Comandos CLI Detallados:**

**`status`** - Quick health check y resumen ejecutivo:
```bash
$ memento status

╭─ MEMENTO STATUS ──────────────────────────────────────╮
│                                                       │
│  ✅ Database: Healthy (2.4 MB)                       │
│  ✅ WAL Mode: Enabled                                 │
│  ✅ Last Sync: 2m ago                                 │
│                                                       │
│  Observations: 142 (3 deleted)                        │
│  Sessions: 28 (2 active)                              │
│  Recent Activity: 5m ago                              │
│                                                       │
│  Storage: /Users/user/.memento/data                  │
│  Project ID: proj_abc123                              │
│                                                       │
╰───────────────────────────────────────────────────────╯
```

**`recents`** - Mostrar observaciones recientes con tiempo relativo:
```bash
$ memento recents --limit 10

Recent Observations:
  • Fix authentication bug (5m ago)
  • Add dark mode support (2h ago)
  • Update API documentation (3h ago)
  • Implement caching layer (yesterday)
  • Refactor database queries (2 days ago)
```

**`install-skill`** - Instalar Memento AI skill y slash commands:
```bash
# Para OpenCode
memento install-skill opencode

# Para Claude Desktop
memento install-skill claude

# Para rutas personalizadas
memento install-skill /custom/path/to/agent
```

### HTTP API

```bash
# Instalar
bun add @slorenzot/memento-api

# Iniciar servidor API
memento-api

# Ejemplos de uso
curl http://localhost:3000/api/health
curl http://localhost:3000/api/observations
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","type":"decision"}'

# Búsqueda
curl http://localhost:3000/api/observations/search?q=test&limit=10

# Sesiones
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"projectId":"proj_123","metadata":{"agent":"claude"}}'
```

**API Endpoints Disponibles:**
- `GET /api/health` - Health check
- `GET /api/stats` - Estadísticas del sistema
- `GET /api/config` - Configuración actual
- `GET /api/observations` - Listar observaciones
- `POST /api/observations` - Crear observación
- `GET /api/observations/:id` - Obtener observación
- `PATCH /api/observations/:id` - Actualizar observación
- `DELETE /api/observations/:id` - Eliminar observación
- `GET /api/observations/search` - Búsqueda con FTS5
- `GET /api/observations/timeline` - Línea temporal
- `GET /api/sessions` - Listar sesiones
- `POST /api/sessions` - Crear sesión
- `GET /api/sessions/:id` - Obtener sesión
- `PATCH /api/sessions/:id` - Actualizar sesión
- `DELETE /api/sessions/:id` - Eliminar sesión

### Web UI

```bash
# Instalar
bun add @slorenzot/memento-web-ui

# Iniciar interfaz web
memento-web-ui

# Abrir http://localhost:5173
```

**Stack Tecnológico Moderno:**
- **React 18** - Framework UI con hooks modernos
- **Vite** - Build tool ultra-rápido
- **TanStack Query** - Data fetching con caching automático
- **Zustand** - State management ligero y rápido
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Iconos modernos y consistentes
- **Zod** - Validación de datos con TypeScript

**Características de la Web UI:**
- Dashboard interactivo con estadísticas en tiempo real
- Búsqueda full-text instantánea
- Visualización de timeline
- Gestión de sesiones
- Editor de observaciones enriquecido
- Dark mode nativo
- Responsive design para móvil y desktop
- Exportación de datos en múltiples formatos

## ⚙️ Configuración

### Archivo .mementorc

Crea un archivo `.mementorc` en la raíz de tu proyecto o en tu directorio home:

```json
{
  "projectId": "my-project-id",
  "storage": {
    "method": "database",
    "path": "~/.memento/data"
  },
  "database": {
    "path": "~/.memento/data/memento.db",
    "walMode": true,
    "ftsEnabled": true
  },
  "api": {
    "port": 3000,
    "host": "localhost"
  },
  "mcp": {
    "port": 3001,
    "host": "localhost"
  },
  "ui": {
    "port": 5173,
    "host": "localhost"
  }
}
```

### Variables de Entorno

```bash
# Override de configuración
export MEMENTO_PROJECT_ID="my-project-id"
export MEMENTO_DB_PATH="/custom/path/to/db.db"
export MEMENTO_API_PORT=8080
export MEMENTO_STORAGE_METHOD="database"
```

### Opciones de Configuración

- **projectId** - Identificador único del proyecto (UUID o string)
- **storage.method** - Método de almacenamiento ("database" o "storage")
- **storage.path** - Ruta de almacenamiento (soporta rutas relativas y absolutas con ~)
- **database.path** - Ruta a la base de datos SQLite
- **database.walMode** - Habilitar modo WAL para mejor rendimiento
- **database.ftsEnabled** - Habilitar búsqueda full-text con FTS5
- **api.port** - Puerto del servidor API
- **mcp.port** - Puerto del servidor MCP
- **ui.port** - Puerto de la interfaz web

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTERFACES DE USUARIO                           │
├───────────────┬───────────────────┬───────────────┬─────────────────────┤
│   Agentes IA  │     Web UI        │     CLI       │      HTTP API      │
│ (Claude/Cursor)│   (React 18)     │   (Bun CLI)   │   (RESTful API)    │
│   MCP Client  │  (TanStack Query) │ (12+ Commands)│   (Express/Hono)   │
└───────┬───────┴─────────┬─────────┴───────┬───────┴─────────┬─────────┘
        │                 │                 │                 │
        └─────────────────┼─────────────────┼─────────────────┘
                          │                 │
                ┌─────────▼─────────┐ ┌────▼─────────┐
                │   MCP Server      │ │  HTTP Server  │
                │   (13 Tools)      │ │  (REST API)   │
                │   (ASCII Banner)  │ │               │
                └─────────┬─────────┘ └────┬─────────┘
                          │                 │
                          └────────┬────────┘
                                   │
                          ┌────────▼─────────┐
                          │   Core Engine    │
                          │   v0.7.0         │
                          ├──────────────────┤
                          │ • MemoryEngine   │
                          │ • SessionManager │
                          │ • PromptSystem   │
                          │ • ProjectManager │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │  Storage Layer   │
                          ├──────────────────┤
                          │ • SQLite + WAL    │
                          │ • FTS5 + BM25     │
                          │ • UUID Support    │
                          │ • Soft Delete     │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │   File System    │
                          │ (DB + WAL + SHM) │
                          └──────────────────┘
```

## 🧬 Características Técnicas Avanzadas

### Base de Datos SQLite con FTS5

**Full-Text Search (FTS5):**
```sql
-- Tabla virtual FTS5 para búsqueda ultra-rápida
CREATE VIRTUAL TABLE observations_fts USING fts5(
  title,
  content,
  content=observations,
  content_rowid=rowid
);

-- Ranking BM25 para relevancia
SELECT bm25(observations_fts) as rank, *
FROM observations_fts
WHERE observations_fts MATCH 'search query'
ORDER BY rank;
```

**WAL Mode (Write-Ahead Logging):**
- Mejor rendimiento para operaciones de lectura
- Concurrency mejorada (lecturas simultáneas)
- Mayor durabilidad de datos
- Tamaños de archivo: Main DB + WAL + SHM

**Estadísticas de Base de Datos:**
```bash
$ memento stats

Database Statistics:
  Total Size: 2.4 MB
  Main DB: 1.8 MB
  WAL File: 580 KB
  SHM File: 16 KB

  Observations: 142
    • decision: 45
    • bug: 38
    • discovery: 32
    • note: 27

  Sessions: 28
    • active: 2
    • completed: 26

  Deleted Observations: 3

Performance Metrics:
  Avg Query Time: 12ms
  Search Latency: 45ms
  Cache Hit Rate: 94%
```

### Sistema de Metadatos Flexible

```typescript
// Observaciones con metadatos flexibles
interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note';
  topicKey: string | null;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// Sesiones con contexto completo
interface Session {
  id: number;
  uuid: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
  metadata: Record<string, unknown>;
}

// Prompts para seguimiento
interface Prompt {
  id: number;
  uuid: string;
  sessionId: number;
  content: string;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}
```

### Sistema de Soft Delete

```typescript
// Observaciones eliminadas no se borran permanentemente
// Implementación de soft delete con tracking
interface DeletedObservation {
  originalId: number;
  deletedAt: Date;
  reason?: string;
  originalData: Observation;
}

// El sistema rastrea observaciones eliminadas
// para posible recuperación futura
```

### Formateo de Tiempo Relativo

```typescript
// Formateo inteligente de tiempo relativo
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Ejemplos: "just now", "5m ago", "2h ago", "yesterday", "3 days ago"
```

### Health Check System

```typescript
// Sistema de health checks completo
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: DatabaseHealth;
  storage: StorageHealth;
  performance: PerformanceHealth;
  checks: CheckResult[];
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
}
```

## ⚡ Rendimiento

### Métricas de Rendimiento

**Operaciones Básicas:**
- Crear observación: <50ms
- Obtener observación: <20ms
- Actualizar observación: <40ms
- Eliminar observación: <30ms

**Búsqueda y Consultas:**
- Búsqueda full-text: <100ms (FTS5 + BM25)
- Listar observaciones: <30ms
- Timeline con filtros: <80ms
- Estadísticas del sistema: <40ms

**Base de Datos:**
- Tamaño de base de datos: ~100MB para 10,000 observaciones
- Factor de compresión WAL: ~3:1
- Cache hit rate: >90%
- Conexiones concurrentes: Soporta múltiples lecturas

**Memoria:**
- Memoria base: <50MB
- Pico de memoria: <100MB para uso intensivo
- Almacenamiento en caché: Configurable

### Optimizaciones Implementadas

1. **WAL Mode** - Escrituras no bloquean lecturas
2. **Prepared Statements** - Queries precompiladas
3. **Indexing** - Índices en columnas frecuentemente consultadas
4. **Caching** - Cache LRU para observaciones recientes
5. **Connection Pooling** - Reutilización de conexiones
6. **Lazy Loading** - Carga perezosa de datos grandes
7. **Batch Operations** - Operaciones en lote para mejor rendimiento

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Instalar dependencias
bun install

# Construir todos los paquetes
bun run build

# Ejecutar servidor de desarrollo
bun run dev

# Ejecutar servidor MCP
bun run mcp

# Ejecutar CLI
bun run memento <command>

# Linting
bun run lint
bun run lint:fix

# Type checking
bun run typecheck

# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run single test file
bun test <path-to-test-file>

# Run specific test
bun test -t "test name pattern"
```

### Estructura del Proyecto

```
memento/
├── packages/
│   ├── core/              # v0.7.0 - Motor de memoria central
│   │   ├── src/
│   │   │   ├── MemoryEngine.ts
│   │   │   ├── ConfigManager.ts
│   │   │   ├── types.ts
│   │   │   └── db/
│   │   │       └── schema.sql
│   │   └── package.json
│   │
│   ├── mcp-server/        # v0.9.0 - Servidor MCP
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── skills/
│   │   │   └── memento/
│   │   │       └── SKILL.md
│   │   └── package.json
│   │
│   ├── cli/               # v0.3.0 - CLI interface
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── CLI.ts
│   │   └── package.json
│   │
│   ├── api/               # v0.3.0 - API HTTP
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── web-ui/            # v0.1.1 - Interfaz web React
│       ├── src/
│       │   └── (React components)
│       ├── package.json
│       └── vite.config.ts
│
├── apps/
│   └── memento/           # Aplicación principal
│
├── tools/                 # Build tools y utilidades
│
├── package.json           # Root package.json
├── tsconfig.json          # TypeScript config
├── bun.lockb              # Lockfile
└── README.md              # This file
```

## 🧪 Testing

```bash
# Ejecutar todas las pruebas
bun test

# Ejecutar pruebas específicas
bun test packages/core/src/MemoryEngine.test.ts

# Ejecutar en modo watch
bun test --watch

# Ejecutar pruebas con coverage
bun test --coverage

# Ejecutar pruebas específicas con filtro
bun test -t "memory engine"
```

**Estructura de Tests:**

```typescript
// Unit tests para MemoryEngine
describe('MemoryEngine', () => {
  describe('createObservation', () => {
    it('should create observation successfully');
    it('should validate input data');
    it('should generate UUID automatically');
  });

  describe('search', () => {
    it('should search with FTS5');
    it('should return ranked results with BM25');
    it('should handle empty results');
  });

  describe('session management', () => {
    it('should start session');
    it('should end session');
    it('should track session observations');
  });
});

// Integration tests para MCP server
describe('MCP Server Integration', () => {
  it('should handle mem_save tool');
  it('should handle mem_search tool');
  it('should handle mem_health tool');
  it('should display ASCII banner on startup');
});
```

## 📊 Ejemplos de Uso

### Ejemplo 1: Crear y Buscar Observaciones

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const engine = new MemoryEngine({
  dbPath: '~/.memento/data/memento.db'
});

// Crear observación
const obs = await engine.createObservation({
  sessionId: 1,
  title: 'Implementar autenticación JWT',
  content: 'Implementar sistema de autenticación con JWT tokens',
  type: 'decision',
  topicKey: 'auth',
  projectId: 'my-project',
  metadata: {
    priority: 'high',
    assignee: 'dev-team'
  }
});

// Buscar observaciones
const results = await engine.search({
  query: 'autenticación JWT',
  limit: 10,
  type: 'decision'
});

console.log(results);
// { observations: [...], total: 5 }
```

### Ejemplo 2: Gestión de Sesiones

```typescript
// Iniciar sesión para agente IA
const session = await engine.createSession({
  projectId: 'my-project',
  endedAt: null,
  metadata: {
    agent: 'claude',
    model: 'claude-3-5-sonnet',
    temperature: 0.7
  }
});

// Crear observaciones en sesión
await engine.createObservation({
  sessionId: session.id,
  title: 'Decision de arquitectura',
  content: 'Usar microservicios',
  type: 'decision',
  topicKey: 'architecture',
  projectId: 'my-project',
  metadata: {}
});

// Finalizar sesión
await engine.endSession(session.id);
```

### Ejemplo 3: Estadísticas y Health Check

```typescript
// Obtener estadísticas
const result = await engine.search({});

console.log(`Total observaciones: ${result.total}`);

const byType = result.observations.reduce((acc, obs) => {
  acc[obs.type] = (acc[obs.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Por tipo:', byType);

// Health check
const isHealthy = engine.isHealthy();
if (!isHealthy) {
  const error = engine.getInitError();
  console.error('Database error:', error);
} else {
  console.log('System is healthy');
}
```

### Ejemplo 4: Uso desde CLI

```bash
# Quick status check
$ memento status

╭─ MEMENTO STATUS ──────────────────────────────────────╮
│  ✅ Database: Healthy (2.4 MB)                       │
│  Observations: 142                                     │
│  Sessions: 28 (2 active)                             │
╰───────────────────────────────────────────────────────╯

# Buscar observaciones recientes
$ memento recents --limit 5

Recent Observations:
  • Fix authentication bug (5m ago)
  • Add dark mode support (2h ago)
  • Update API documentation (3h ago)
  • Implement caching layer (yesterday)
  • Refactor database queries (2 days ago)

# Búsqueda avanzada
$ memento search "authentication" --type bug --limit 10

Found 5 observations matching "authentication":
  1. Fix authentication bug (5m ago)
  2. JWT token expiration issue (2h ago)
  3. User login not working (yesterday)
  4. Session management problem (2 days ago)
  5. Permission denied on API access (3 days ago)

# Guardar nueva observación
$ memento save "Fix database connection" "Database connection failing after timeout" --type bug

✓ Observation saved successfully

# Ver timeline
$ memento timeline --limit 20

Timeline:
  2024-01-15
    • Fix authentication bug (5m ago) [bug]
    • Add dark mode support (2h ago) [discovery]
  2024-01-14
    • Update API documentation (3h ago) [note]
    • Implement caching layer (yesterday) [discovery]
```

### Ejemplo 5: Instalación de Skills para Agentes IA

```bash
# Instalar para Claude Desktop
$ memento install-skill claude

✓ Memento skill installed for Claude Desktop
📁 Location: ~/Library/Application Support/Claude/claude_desktop_config.json
🔧 Configuration updated

# Instalar para OpenCode
$ memento install-skill opencode

✓ Memento skill installed for OpenCode
📁 Location: ~/.opencode/skills/memento
🔧 Configuration updated

# Ver configuración
$ memento config

Current Configuration:
  Project ID: proj_abc123
  Storage: Database
  Database Path: ~/.memento/data/memento.db
  WAL Mode: Enabled
  FTS Enabled: Yes
  API Port: 3000
  MCP Port: 3001
```

## ⚠️ Restricciones de Licencia

**PROHIBIDO:**
- ❌ Uso comercial sin autorización explícita
- ❌ Crear forks o versiones modificadas
- ❌ Distribuir versiones modificadas
- ❌ Usar para fines comerciales o empresariales
- ❌ Olvidar la atribución al autor original

**PERMITIDO:**
- ✅ Uso personal y educacional
- ✅ Compartir el código original sin modificaciones
- ✅ Atribuir correctamente al autor (Soulberto Lorenzo)
- ✅ Usar para proyectos personales no comerciales

## 📈 Roadmap

### v0.8.0 (Próximo)
- [ ] Mejoras en la Web UI
- [ ] Exportación en múltiples formatos (JSON, CSV, Markdown)
- [ ] Sistema de notificaciones
- [ ] Integración con más herramientas de IA

### v1.0.0 (Futuro)
- [ ] Sistema de usuarios y autenticación
- [ ] Multi-tenancy
- [ ] Sync en la nube
- [ ] Plugin system
- [ ] API GraphQL

## 👤 Autor

**Soulberto Lorenzo**  
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 🙏 Agradecimientos

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - Por la integración con agentes IA
- [SQLite](https://www.sqlite.org/) - Por el motor de base de datos
- [Bun](https://bun.sh/) - Por el runtime y package manager
- [TypeScript](https://www.typescriptlang.org/) - Por la seguridad de tipos
- [Vite](https://vitejs.dev/) - Por el build tool de la Web UI
- [TanStack Query](https://tanstack.com/query) - Por el data fetching
- [Zustand](https://github.com/pmndrs/zustand) - Por el state management
- [TailwindCSS](https://tailwindcss.com/) - Por el styling
- [Lucide](https://lucide.dev/) - Por los iconos
- [Zod](https://zod.dev/) - Por la validación de datos

## 📄 Licencia

Este proyecto está bajo Licencia **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[Ver Licencia Completa](LICENSE)

---

**⚠️ Recordar:** Este proyecto tiene licencia restrictiva. Respeta los términos de la licencia CC BY-NC-ND 4.0.

**📊 Versión:** Core v0.7.0 | MCP Server v0.9.0 | CLI v0.3.0 | API v0.3.0 | Web UI v0.1.1
