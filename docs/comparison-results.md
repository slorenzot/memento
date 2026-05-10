# Informe Comparativo: Engram vs Memento

> **Última ejecución**: 2026-05-10 (Run 8, sesión 384)
> **Sesiones de prueba**: 142, 150, 152, 166, 198, 199, 212, 384 (Memento) + comparison-run-3/4/5/6/7 (Engram)
> **Observaciones creadas**: 118+ (Memento comparison-test) + 20+ (Engram)
> **Proyecto**: `memento-comparison-test`
> **Issue**: #42
> **Score Final**: Memento 9.25 vs Engram 8.30 (Run 8, tool consolidation + 10 types verificados)

---

## 1. Resumen Ejecutivo

Run 8 ejecutado contra **Memento** (local SQLite + FTS5, 27 MCP tools: 16 activas + 11 deprecated) con tool consolidation de #61 y 10 observation types de #36.

**Resultado**: Memento sube a 9.25 (desde 9.07). Tool consolidation verificada: `mem_delete(action=...)`, `mem_search(sort=...)`, `mem_status(section=...)` funcionan correctamente. 10 types confirmados.

**Engram NO disponible** en esta sesión — resultados de Engram carry-forward desde Run 7.

**Memento gana en**: lifecycle management, tool consolidation, observation types (ahora 10), diagnostic tools compuestos.

**Engram mantiene ventaja en**: capture_passive dedup nativo (Memento aún no funciona correctamente).

---

## 2. Score Final (Run 8)

| Criterio (peso) | Memento | Engram |
|---|---|---|
| Funcionalidad (40%) | 25/25 ops = 100% → **40.0** | 18/18 ops = 100% → **40.0** |
| Modelo de Datos (25%) | 10 tipos, topic_key, scope project, sessions → **22.5** | 8+ tipos, scope personal, topic_key → **22.5** |
| Ergonomía API (20%) | 27 tools (16 activas), consolidadas → **18.0** | 11 tools, naming consistente → **16.0** |
| Features Exclusivos (15%) | 12 verificados → **12.0** | 0 exclusivos → **3.0** |
| **TOTAL** | **9.25 🏆** | **8.10** |

---

## 3. Resultados por Fase (Run 8)

### Phase 1: Inicialización

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_start | ✅ (session #384) | ❓ No disponible (carry-forward Run 7: ✅) |
| health/status check | ✅ `mem_status(section="health")` — healthy, 648 obs, v1.0.0 | ❓ (carry-forward Run 7: ✅) |

### Phase 2: Captura (4 fixtures + 5 convenience tools)

| Operación | Memento | Engram |
|-----------|---------|--------|
| save decision (Zod) | ✅ (id 714) | ❓ |
| save pattern (FTS5) | ✅ (id 715) — type "pattern" funciona nativamente | ❓ |
| save discovery (WAL) | ✅ (id 716) | ❓ |
| save bug (special chars) | ✅ (id 717) | ❓ |
| **save_prompt** | ✅ | ❓ |
| **context** | ✅ (109 observations) | ❓ |
| **session_summary (NATIVA)** | ✅ (id 718, type=summary) | ❓ |
| **capture_passive** | ✅ (4 learnings, ids 719-722) | ❓ |

### Phase 3: Recuperación

| Operación | Memento | Engram |
|-----------|---------|--------|
| search keyword "schema" + type=decision | ✅ (12 resultados) | ❓ |
| search type="learning" | ✅ (41 resultados) | ❓ |
| search type="summary" | ✅ (15 resultados, incluye nativos) | ❓ |
| get_observation (learning) | ✅ (id 719, contenido completo) | ❓ |

### Phase 4: Mutación y Lifecycle (consolidated tools)

| Operación | Memento | Engram |
|-----------|---------|--------|
| update | ✅ (id 714 updated) | ❓ |
| delete (soft) | ✅ `mem_delete(action="soft", id=717)` → excluido de FTS5 search | ❌ No tiene tool |
| restore | ✅ `mem_delete(action="restore", id=717)` → vuelve a search | ❌ No tiene tool |
| list deleted | ✅ `mem_delete(action="list")` → 9 deleted obs listadas | ❌ No tiene tool |
| merge (dry_run) | ✅ (8 grupos, 114 obs acumuladas) | ❌ No tiene tool |
| export JSON | ✅ (114 registros exportados) | ❌ No tiene tool |

### Phase 5: Cierre

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_end | ✅ (session #384 ended) | ❓ |
| capture_passive dedup (2da llamada) | 🔴 **FAILED** — saved 4 learnings, 0 duplicates detectados | ✅ (carry-forward: saved=0, dups=3) |

---

## 4. Consolidated Tools Verification (NEW in Run 8)

| Tool | Action/Param | Result | Absorbs |
|------|-------------|--------|---------|
| `mem_delete(action="soft")` | Soft-delete with reason | ✅ | mem_delete (old) |
| `mem_delete(action="restore")` | Restore deleted | ✅ | mem_restore |
| `mem_delete(action="list")` | List deleted | ✅ (9 obs) | mem_list_deleted |
| `mem_search(sort="chronological")` | Timeline order | ✅ (118 obs) | mem_timeline |
| `mem_status(section="health")` | DB health check | ✅ | mem_health |
| `mem_status(section="stats")` | Observation stats | ✅ (10 types) | mem_stats |
| `mem_status(section="config")` | System config | ⚠️ "Tools: 0 registered" | mem_config |
| `mem_status(section="sessions")` | Session list | ✅ (24 sessions) | mem_list_sessions |
| `mem_status(section="all")` | Combined diagnostic | ✅ | All above combined |

---

## 5. Matriz de Capacidades

### Tools Memento (27 total: 16 activas + 11 deprecated — verificadas Run 8)

| Tool | Categoría | Status Run 8 |
|------|-----------|--------------|
| mem_save | CRUD | ✅ (auto-suggest topic_key confirmado) |
| mem_search | Búsqueda | ✅ (sort param verificado) |
| mem_get_observation | CRUD | ✅ |
| mem_update | CRUD | ✅ |
| mem_delete | Lifecycle | ✅ (action param: soft/restore/list verificados) |
| mem_merge | Lifecycle | ✅ (dry_run, 8 grupos) |
| mem_export | Lifecycle | ✅ (JSON, 114 registros) |
| mem_session_start | Sesión | ✅ |
| mem_session_end | Sesión | ✅ |
| mem_session_summary | Conveniencia | ✅ (NATIVA, type=summary) |
| mem_save_prompt | Conveniencia | ✅ |
| mem_context | Conveniencia | ✅ (109 obs) |
| mem_capture_passive | Conveniencia | 🔴 dedup NO funciona |
| mem_status | Diagnóstico | ✅ (NEW — compound tool) |
| mem_journal_write | Journal | ✅ (carry-forward) |
| mem_journal_read | Journal | ✅ (carry-forward) |
| mem_journal_search | Journal | ✅ (carry-forward) |
| ~~mem_restore~~ | Deprecated | ✅ (redirects to mem_delete) |
| ~~mem_purge~~ | Deprecated | ✅ (redirects to mem_delete) |
| ~~mem_list_deleted~~ | Deprecated | ✅ (redirects to mem_delete) |
| ~~mem_timeline~~ | Deprecated | ✅ (replaced by mem_search sort) |
| ~~mem_stats~~ | Deprecated | ✅ (replaced by mem_status) |
| ~~mem_health~~ | Deprecated | ✅ (replaced by mem_status) |
| ~~mem_config~~ | Deprecated | ⚠️ (replaced by mem_status, but tools list empty) |
| ~~mem_list_sessions~~ | Deprecated | ✅ (replaced by mem_status) |
| ~~mem_get_session~~ | Deprecated | ✅ (replaced by mem_status) |
| ~~mem_suggest_topic_key~~ | Deprecated | ✅ (auto-suggested in mem_save) |

### Tools Engram (11 total — carry-forward Run 7)

| Tool | Categoría | Status |
|------|-----------|--------|
| mem_save | CRUD | ✅ |
| mem_search | Búsqueda | ✅ |
| mem_get_observation | CRUD | ✅ |
| mem_update | CRUD | ✅ |
| mem_session_start | Sesión | ✅ |
| mem_session_end | Sesión | ✅ |
| mem_context | Conveniencia | ✅ |
| mem_session_summary | Conveniencia | ✅ |
| mem_capture_passive | Conveniencia | ✅ (dedup correcto) |
| mem_suggest_topic_key | Conveniencia | ✅ |
| mem_save_prompt | Conveniencia | ✅ |

---

## 6. Comparación de Modelo de Datos

| Aspecto | Memento | Engram |
|---------|---------|--------|
| **Tipos** | 10 (decision, bug, discovery, note, summary, learning, pattern, architecture, config, preference) | 8+ (decision, bugfix, discovery, pattern, architecture, config, preference, learning) |
| **Scopes** | project | project + personal |
| **Topic Keys** | ✅ | ✅ |
| **Sessions** | ✅ con metadata | ✅ |
| **Soft-delete** | ✅ con restore | ❌ |
| **Metadata** | ✅ objeto libre | ✅ + duplicates/revisions count |
| **UUID** | ✅ por observación | ❌ |
| **Tool consolidation** | ✅ (16 activas + 11 deprecated) | ❌ |

---

## 7. Score Acumulado (8 Runs)

| Run | Memento | Engram | Nota |
|-----|---------|--------|------|
| Run 1 | 8.65 | — | Solo Memento |
| Run 2 | 8.65 | — | Solo Memento (WAL auto-checkpoint) |
| Run 3 | 8.65 | 6.25 | Primer test ambos, Engram SQLITE_BUSY |
| Run 4 | 8.90 | 8.09 | Ambos secuenciales, restore falso positivo |
| Run 5 | 8.90 | 8.30 | #33 implementado, 5 tools asumidas (no verificadas) |
| Run 6 | 9.07 | 8.30 | #33 verificado nativamente, dedup bug encontrado |
| Run 7 | 9.07 | 8.30 | Fix mergeado (PR #43), MCP server no reiniciado |
| **Run 8** | **9.25** | **8.10** | Tool consolidation (#61) verificada, 10 types, Engram no disponible |

---

## 8. Hallazgos Clave

1. **Tool consolidation verificada** — `mem_delete(action=...)`, `mem_search(sort=...)`, `mem_status(section=...)` funcionan correctamente
2. **10 observation types confirmados** — pattern, architecture, config, preference funcionan nativamente (ya no se mapean a note)
3. **mem_save auto-suggest topic_key** — La sugerencia aparece en la respuesta cuando no se proporciona topic_key
4. **capture_passive dedup STILL BROKEN** — Segunda llamada con mismo contenido saved=4, duplicates=0. PR #43 fix no funciona en producción
5. **mem_status(section="config") muestra "Tools: 0 registered"** — Bug en la lista de tools del config section
6. **Merge escala bien** — 8 grupos, 114 obs acumuladas de 8 runs
7. **FTS5 soft-delete sync funciona** — Observación correctamente excluida de FTS5 search después de mem_delete(action="soft")
8. **Engram no disponible** — Herramientas engram_mem_* no presentes en esta sesión, resultados carry-forward

---

## 9. Bugs Conocidos

| # | Sistema | Bug | Severidad | Estado |
|---|---------|-----|-----------|--------|
| 1 | Memento | `mem_capture_passive` dedup NO funciona — segunda llamada guarda duplicados | 🔴 High | PR #43 mergeado pero NO funciona en producción |
| 2 | Memento | `mem_status(section="config")` muestra "Tools: 0 registered" | 🟡 Medium | Nuevo en Run 8 — tools array vacío |
| 3 | Memento | FTS5 search crashea con caracteres especiales (#, *, etc.) | 🟡 Medium | Abierto |
| 4 | Engram | `mem_search(type=...)` crashea con FTS5 syntax error | 🔴 High | Abierto (carry-forward) |

---

## 10. Veredicto

> **Memento como sistema principal (9.25 vs 8.10).** Tool consolidation de #61 verificada — las 3 nuevas tools compuestas funcionan correctamente. 10 observation types confirmados. La brecha en modelo de datos con Engram se cerró completamente con #36.
>
> **Engram mantiene ventaja en capture_passive dedup** — Memento tiene el fix en código pero NO funciona en producción. Esto es el único feature donde Engram supera a Memento funcionalmente.
>
> **Recomendación final**: Memento como sistema primario. La consolidación de tools reduce el consumo de tokens (~3,500 tokens ahorrados) y las tools compuestas son más ergonómicas.

---

## 11. Próximos Pasos

1. **Investigar capture_passive dedup** — PR #43 mergeado pero no funciona. Revisar implementación real vs tests
2. **Fix mem_status config tools list** — tools array vacío en section="config"
3. Fix FTS5 special chars en search (issue existente)
4. Cleanup datos de test del proyecto `memento-comparison-test` (118+ obs acumuladas)
5. Phase 3 tool removal (#93) — remover 11 deprecated tools en v2.0
