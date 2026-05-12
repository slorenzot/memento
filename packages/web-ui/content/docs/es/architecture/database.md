# Arquitectura de Base de Datos

Memento usa SQLite como capa de persistencia — rápido, embebido y sin configuración.

## Motor

| Aspecto | Detalle |
|---------|---------|
| **Runtime** | `bun:sqlite` (binding nativo de Bun) |
| **Fallback** | `better-sqlite3` (para builds webpack de Next.js) |
| **PRAGMAs** | modo WAL, `foreign_keys = ON`, `busy_timeout = 5000ms` |

## Tablas

### `sessions`

Rastrea sesiones de conversación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `projectId` | TEXT | Identificador del proyecto |
| `endedAt` | TEXT | Timestamp ISO o NULL |
| `metadata` | TEXT | Blob JSON |
| `createdAt` | TEXT | Timestamp ISO |

### `observations`

La unidad de datos principal.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `sessionId` | INTEGER FK | Referencia a sessions |
| `title` | TEXT | Título corto y buscable |
| `content` | TEXT | Contenido completo (Markdown) |
| `type` | TEXT | Uno de 10 tipos |
| `topicKey` | TEXT | Clave de agrupación |
| `projectId` | TEXT | Alcance del proyecto |
| `scope` | TEXT | `project` o `personal` |
| `pinned` | INTEGER | Flag booleano |
| `readOnly` | INTEGER | Flag booleano |
| `deletedAt` | TEXT | Timestamp de eliminación lógica |
| `metadata` | TEXT | Blob JSON |
| `embedding` | BLOB | Embedding vectorial |
| `createdAt` | TEXT | Timestamp ISO |
| `updatedAt` | TEXT | Timestamp ISO |

### `journal`

Log de evidencia de solo agregación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `projectId` | TEXT | Identificador del proyecto |
| `sessionId` | INTEGER | Sesión opcional |
| `title` | TEXT | Título de la entrada |
| `body` | TEXT | Contenido completo del cuerpo |
| `supersedes` | INTEGER | ID de la entrada invalidada |
| `invalidatedAt` | TEXT | Cuándo fue reemplazada |
| `metadata` | TEXT | Blob JSON |
| `createdAt` | TEXT | Timestamp ISO |

### `journal_tags`

Tags para entradas de journal (muchos a muchos).

| Columna | Tipo |
|---------|------|
| `journalId` | INTEGER FK |
| `tag` | TEXT |

### `projects`

Rastrea proyectos conocidos.

### `prompts`

Almacena configuraciones de prompts para inyección.

## Tablas Virtuales FTS5

### `observations_fts`

Índice de búsqueda de texto completo para observaciones. Usa **modo standalone** (sin `content=`), sincronizado a nivel de aplicación.

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

Búsqueda de texto completo para entradas de journal. Usa **modo content table** con trigger automático de inserción.

## Migraciones

Las migraciones se manejan inline con `try/catch` por columna — sin framework de migración externo. Las nuevas columnas se agregan vía `ALTER TABLE ADD COLUMN` envueltas en try/catch para idempotencia.

## Características de Rendimiento

- **Modo WAL** permite lecturas concurrentes durante escrituras
- **FTS5** proporciona búsqueda de texto completo en sub-milisegundos
- **busy_timeout = 5000ms** previene errores de bloqueo bajo carga
- **foreign_keys** aplicadas para integridad de datos

## Ver También

- [Paquete Core](/es/docs/packages/core) — API del motor
- [Búsqueda](/es/docs/core-concepts/search) — modos de búsqueda y sintaxis FTS5
