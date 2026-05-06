# Plan de Pruebas Comparativas: Engram vs Memento

> **Fecha**: 2026-05-05
> **Proyecto**: slorenzot/memento
> **Objetivo**: Comparar rendimiento, capacidad y ergonomía de dos sistemas de memoria persistente para IA

---

## 1. Objetivo

Comparar el rendimiento, capacidad y ergonomía de dos sistemas de memoria persistente para IA mediante la simulación de un flujo de trabajo real de desarrollo, ejecutando las mismas operaciones en ambos sistemas y documentando los resultados.

## 2. Alcance

| Incluido | Excluido |
|----------|----------|
| Todas las tools de lectura y escritura | Tests de concurrencia |
| Flujos de sesión completa | Tests de carga/estrés |
| Búsqueda FTS5 vs búsqueda Engram | Tests de red (ambos son locales) |
| Lifecycle management (merge, delete, export) | Migración de datos entre sistemas |
| Captura de métricas de respuesta | Benchmarks de rendimiento con datos masivos |

## 3. Escenario de Simulación

**Contexto**: Una IA trabaja en el proyecto `memento` implementando un feature de validación de schemas.

### Fase 1: Inicialización

| Paso | Operación | Engram Tool | Memento Tool |
|------|-----------|-------------|--------------|
| 1.1 | Iniciar sesión | `engram_mem_session_start` | `memento_mem_session_start` |
| 1.2 | Verificar estado | `engram_mem_context` | `memento_mem_health` |

### Fase 2: Captura de Decisiones

| Paso | Operación | Engram Tool | Memento Tool |
|------|-----------|-------------|--------------|
| 2.1 | Guardar decisión de arquitectura | `engram_mem_save` (type: decision) | `memento_mem_save` (type: decision) |
| 2.2 | Guardar patrón establecido | `engram_mem_save` (type: pattern) | `memento_mem_save` (type: note) |
| 2.3 | Guardar discovery no-obvio | `engram_mem_save` (type: discovery) | `memento_mem_save` (type: discovery) |
| 2.4 | Guardar bug encontrado | `engram_mem_save` (type: bugfix) | `memento_mem_save` (type: bug) |

### Fase 3: Recuperación de Contexto

| Paso | Operación | Engram Tool | Memento Tool |
|------|-----------|-------------|--------------|
| 3.1 | Buscar por keyword | `engram_mem_search` (query: "schema") | `memento_mem_search` (query: "schema") |
| 3.2 | Buscar por tipo | `engram_mem_search` (type: decision) | `memento_mem_search` (type: decision) |
| 3.3 | Buscar por proyecto | `engram_mem_search` (project: "memento") | `memento_mem_search` (project_id: "memento") |
| 3.4 | Obtener observación completa | `engram_mem_get_observation` | `memento_mem_get_observation` |

### Fase 4: Mutación y Lifecycle

| Paso | Operación | Engram Tool | Memento Tool |
|------|-----------|-------------|--------------|
| 4.1 | Actualizar observación | `engram_mem_update` | `memento_mem_update` |
| 4.2 | Soft-delete | ❌ No disponible | `memento_mem_delete` |
| 4.3 | Restaurar | ❌ No disponible | `memento_mem_restore` |
| 4.4 | Merge (dry run) | ❌ No disponible | `memento_mem_merge` (dry_run: true) |
| 4.5 | Export a JSON | ❌ No disponible | `memento_mem_export` |

### Fase 5: Cierre de Sesión

| Paso | Operación | Engram Tool | Memento Tool |
|------|-----------|-------------|--------------|
| 5.1 | Session summary | `engram_mem_session_summary` | ❌ No disponible |
| 5.2 | Captura pasiva | `engram_mem_capture_passive` | ❌ No disponible |
| 5.3 | End session | `engram_mem_session_end` | `memento_mem_session_end` |

## 4. Datos de Prueba (Fixtures)

### Observación 1 — Decisión de Arquitectura

```
title: "Chose Zod for schema validation"
type: decision
topic_key: "architecture/validation"
content:
  What: Selected Zod as the schema validation library for observation types
  Why: Need runtime validation of observation data before SQLite insertion
  Where: packages/core/src/MemoryEngine.ts
  Learned: Zod 4 has breaking changes from v3 — need to use the correct import path
```

### Observación 2 — Patrón

```
title: "FTS5 trigger pattern for soft-delete sync"
type: pattern (Engram) / note (Memento)
topic_key: "pattern/fts5-triggers"
content:
  What: Established pattern for keeping FTS5 index in sync with soft-deletes
  Why: FTS5 doesn't natively support soft-delete — need triggers
  Where: packages/core/src/MemoryEngine.ts (lines 141-173)
  Learned: Must have separate triggers for soft-delete and undelete operations
```

### Observación 3 — Discovery

```
title: "SQLite WAL mode enables concurrent reads"
type: discovery
topic_key: "discovery/sqlite-wal"
content:
  What: Discovered that WAL mode allows concurrent read operations while writing
  Why: Important for MCP server that may serve multiple tool calls simultaneously
  Where: packages/core/src/MemoryEngine.ts (PRAGMA journal_mode = WAL)
  Learned: WAL mode creates .wal and .shm files that need cleanup consideration
```

### Observación 4 — Bug

```
title: "FTS5 MATCH crashes with special characters"
type: bugfix (Engram) / bug (Memento)
topic_key: "bugfix/fts5-special-chars"
content:
  What: User search queries with special chars cause FTS5 syntax errors
  Why: FTS5 interprets chars like *, ", ( as operators
  Where: packages/core/src/MemoryEngine.ts — search method
  Learned: Need to sanitize user input before passing to MATCH clause
```

## 5. Métricas a Capturar

| Métrica | Cómo se mide |
|---------|-------------|
| **Tiempo de respuesta** | Timestamps antes y después de cada llamada |
| **Éxito/Fracaso** | Boolean — ¿la operación completó sin error? |
| **Calidad de respuesta** | Evaluación subjetiva del formato y utilidad |
| **Campos devueltos** | Qué información retorna cada tool |
| **Errores encontrados** | Mensajes de error y comportamiento |
| **Tools exclusivas** | Funcionalidades que solo tiene uno de los dos |

## 6. Criterios de Evaluación

### 6.1 Funcionalidad (40%)

- ¿Todas las operaciones CRUD funcionan?
- ¿La búsqueda retorna resultados relevantes?
- ¿El lifecycle management opera correctamente?

### 6.2 Riqueza del Modelo de Datos (25%)

- ¿Cuántos tipos de observación soporta?
- ¿Qué metadatos captura?
- ¿Soporta topic_key para agrupación?

### 6.3 Ergonomía de API (20%)

- ¿Los nombres de tools son intuitivos?
- ¿Los mensajes de error son claros?
- ¿La estructura de response es consistente?

### 6.4 Capacidades Exclusivas (15%)

- ¿Qué puede hacer uno que el otro no?
- ¿Esas capacidades son relevantes para uso real?

## 7. Análisis Preliminar (basado en código)

### 7.1 Tools Disponibles

| Categoría | Engram | Memento | Ganador |
|-----------|--------|---------|---------|
| Save | `mem_save` | `mem_save` | Empate |
| Search | `mem_search` | `mem_search` (FTS5) | Por evaluar |
| Get by ID | `mem_get_observation` | `mem_get_observation` | Empate |
| Update | `mem_update` | `mem_update` | Empate |
| Delete | ❌ | `mem_delete` (soft) | Memento |
| Restore | ❌ | `mem_restore` | Memento |
| Purge | ❌ | `mem_purge` | Memento |
| Merge | ❌ | `mem_merge` | Memento |
| Export | ❌ | `mem_export` (JSON/XML/TXT) | Memento |
| Session Start | `mem_session_start` | `mem_session_start` | Empate |
| Session End | `mem_session_end` | `mem_session_end` | Empate |
| Session Summary | `mem_session_summary` | ❌ | Engram |
| Context | `mem_context` | ❌ | Engram |
| Suggest Topic | `mem_suggest_topic_key` | ❌ | Engram |
| Save Prompt | `mem_save_prompt` | ❌ | Engram |
| Passive Capture | `mem_capture_passive` | ❌ | Engram |
| Timeline | ❌ | `mem_timeline` | Memento |
| Stats | ❌ | `mem_stats` | Memento |
| Health | ❌ | `mem_health` | Memento |
| Config | ❌ | `mem_config` | Memento |
| List Deleted | ❌ | `mem_list_deleted` | Memento |
| List Sessions | ❌ | `mem_list_sessions` | Memento |

### 7.2 Tipos de Observación

| Engram | Memento |
|--------|---------|
| bugfix | bug |
| decision | decision |
| architecture | — |
| discovery | discovery |
| pattern | — |
| config | — |
| preference | — |
| learning | — |
| — | note |

### 7.3 Scopes

| Engram | Memento |
|--------|---------|
| project | project |
| personal | — |

## 8. Output Esperado

Al final de la ejecución, se entregará:

1. **Tabla comparativa detallada** con resultados reales de cada operación
2. **Métricas de rendimiento** (tiempo de respuesta por operación)
3. **Matriz de capacidades** (qué tiene cada uno)
4. **Veredicto** con recomendación de uso por escenario
5. **Observaciones** sobre bugs o comportamientos inesperados

## 9. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Datos de prueba contaminen producción | Usar proyecto `memento-comparison-test` |
| Engram service no disponible | Documentar el error y continuar con Memento |
| Resultados no comparables (diferente escala) | Normalizar métricas, enfocarse en funcionalidad |

## 10. Ejecución

- [ ] Fase 1: Inicialización (Engram + Memento)
- [ ] Fase 2: Captura de Decisiones (Engram + Memento)
- [ ] Fase 3: Recuperación de Contexto (Engram + Memento)
- [ ] Fase 4: Mutación y Lifecycle (Engram + Memento)
- [ ] Fase 5: Cierre de Sesión (Engram + Memento)
- [ ] Generación de tabla comparativa final
- [ ] Veredicto y recomendaciones
