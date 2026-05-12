# Informe Comparativo: Engram vs Memento

> **Última ejecución**: 2026-05-06 (Run 7, sesiones 212 + comparison-run-7)
> **Sesiones de prueba**: 142, 150, 152, 166, 198, 199, 212 (Memento) + comparison-run-3/4/5/6/7 (Engram)
> **Observaciones creadas**: 47+ (Memento) + 20+ (Engram)
> **Proyecto**: `memento-comparison-test`
> **Issue**: #42
> **Score Final**: Memento 9.07 vs Engram 8.30 (Run 6, tools #33 verificadas nativamente)

---

## 1. Resumen Ejecutivo

Se ejecutaron las 5 fases del plan comparativo contra **Memento** (local SQLite + FTS5, 23 MCP tools) y **Engram** (11 tools) en ejecución lado a lado.

**Resultado**: Memento gana por 0.77 puntos (9.07 vs 8.30). Las 5 tools de Issue #33 fueron verificadas nativamente en Run 6. Run 7 confirma todos los resultados excepto `capture_passive` dedup — el fix (PR #43) está en el código pero el servidor MCP necesita reinicio.

**Engram gana en modelo de datos**: 8+ tipos de observación (pattern, architecture, config, preference, learning) vs 6 de Memento (decision, bug, discovery, note, summary, learning), y scope personal. Issue #36 cerrará esta brecha.

**Memento gana en lifecycle management**: delete/restore/merge/export + limpieza de duplicados.

---

## 2. Score Final (Run 6 — más reciente con tools #33 verificadas)

| Criterio (peso) | Memento | Engram |
|---|---|---|
| Funcionalidad (40%) | 24.5/25 ops = 98% → **39.2** | 18/18 ops = 100% → **40.0** |
| Modelo de Datos (25%) | 6 tipos, topic_key, scope, sessions → **20.0** | 8+ tipos, scope personal, topic_key → **22.5** |
| Ergonomía API (20%) | 23 tools, naming consistente → **18.0** | 11 tools, naming consistente → **16.0** |
| Features Exclusivos (15%) | 10 verificados → **13.5** | 0 exclusivos → **4.5** |
| **TOTAL** | **9.07 🏆** | **8.30** |

---

## 3. Resultados por Fase (Run 7 — último)

### Phase 1: Inicialización

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_start | ✅ (session 212) | ✅ (comparison-run-7) |
| health/context check | ✅ (healthy, 145 obs, 23 tools) | ✅ (context con historial 7 runs) |

### Phase 2: Captura (4 fixtures + 5 tools #33)

| Operación | Memento | Engram |
|-----------|---------|--------|
| save decision (Zod) | ✅ (id 178) | ✅ |
| save note/pattern (FTS5) | ✅ (id 179) | ✅ |
| save discovery (WAL) | ✅ (id 180) | ✅ |
| save bug/bugfix (special chars) | ✅ (id 181) | ✅ |
| **save_prompt** | ✅ (id 3) | ✅ |
| **context** | ✅ (43 obs) | ✅ (rich: sessions+prompts+obs) |
| **suggest_topic_key** | ✅ (`pattern/fts5-trigger-pattern-for-soft-delete-sync`) | ✅ (idéntico) |
| **session_summary (NATIVA)** | ✅ (id 182, type=summary) | ✅ |
| **capture_passive** | ✅ (3 learnings, ids 183-185) | ✅ (3 learnings) |

### Phase 3: Recuperación

| Operación | Memento | Engram |
|-----------|---------|--------|
| search keyword "schema" + type=decision | ✅ (7 resultados) | ✅ (1 resultado) |
| search type="learning" | ✅ (2 resultados) | ❓ |
| search type="summary" | ✅ (3 resultados, incluye nativos) | ❓ |
| get_observation (learning) | ✅ (type=learning, source metadata) | ✅ |

### Phase 4: Mutación y Lifecycle

| Operación | Memento | Engram |
|-----------|---------|--------|
| update | ✅ (id 178) | ✅ |
| delete (soft) | ✅ (id 181 → excluido de search) | ❌ No tiene tool |
| restore | ✅ (id 181 → vuelve a search) | ❌ No tiene tool |
| delete duplicates (cleanup) | ✅ (ids 186-188) | ❌ No tiene tool |
| merge (dry_run) | ✅ (6 grupos, 47 obs acumuladas) | ❌ No tiene tool |
| export JSON | ✅ (47 registros) | ❌ No tiene tool |

### Phase 5: Cierre

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_end | ✅ (endedAt timestamp) | ✅ |
| session_summary | ✅ **NATIVA** (id 182, isSessionSummary=true) | ✅ (tool nativa) |
| capture_passive dedup (2da llamada) | ⚠️ Fix en código pero MCP server no reiniciado | ✅ (saved=0, dups=3) |

---

## 4. Matriz de Capacidades

### Tools Memento (23 total — verificadas ✅)

| Tool | Categoría | Status |
|------|-----------|--------|
| mem_save | CRUD | ✅ |
| mem_search | Búsqueda | ✅ |
| mem_get_observation | CRUD | ✅ |
| mem_update | CRUD | ✅ |
| mem_delete | Lifecycle | ✅ |
| mem_restore | Lifecycle | ✅ |
| mem_purge | Lifecycle | ✅ |
| mem_merge | Lifecycle | ✅ |
| mem_export | Lifecycle | ✅ |
| mem_session_start | Sesión | ✅ |
| mem_session_end | Sesión | ✅ |
| mem_list_sessions | Sesión | ✅ |
| mem_get_session | Sesión | ✅ |
| mem_save_prompt | Conveniencia | ✅ (verificada Run 6/7) |
| mem_context | Conveniencia | ✅ (verificada Run 6/7) |
| mem_suggest_topic_key | Conveniencia | ✅ (verificada Run 6/7) |
| mem_session_summary | Conveniencia | ✅ (verificada Run 6/7 — id 182, type=summary) |
| mem_capture_passive | Conveniencia | ⚠️ (funciona, dedup fix en código, pendiente reinicio MCP) |
| mem_timeline | Diagnóstico | ✅ |
| mem_stats | Diagnóstico | ✅ |
| mem_health | Diagnóstico | ✅ |
| mem_config | Diagnóstico | ✅ |
| mem_list_deleted | Diagnóstico | ✅ |

### Tools Engram (11 total — verificadas ✅)

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
| mem_capture_passive | Conveniencia | ✅ (dedup correcto: saved=0, dups=3) |
| mem_suggest_topic_key | Conveniencia | ✅ |
| mem_save_prompt | Conveniencia | ✅ |

---

## 5. Comparación de Modelo de Datos

| Aspecto | Memento | Engram |
|---------|---------|--------|
| **Tipos** | 6 (decision, bug, discovery, note, summary, learning) | 8+ (decision, bugfix, discovery, pattern, architecture, config, preference, learning) |
| **Scopes** | project | project + personal |
| **Topic Keys** | ✅ | ✅ |
| **Sessions** | ✅ con metadata | ✅ |
| **Soft-delete** | ✅ con restore | ❌ |
| **Metadata** | ✅ objeto libre | ✅ + duplicates/revisions count |
| **UUID** | ✅ por observación | ❌ |

---

## 6. Score Acumulado (7 Runs)

| Run | Memento | Engram | Nota |
|-----|---------|--------|------|
| Run 1 | 8.65 | — | Solo Memento |
| Run 2 | 8.65 | — | Solo Memento (WAL auto-checkpoint) |
| Run 3 | 8.65 | 6.25 | Primer test ambos, Engram SQLITE_BUSY |
| Run 4 | 8.90 | 8.09 | Ambos secuenciales, restore falso positivo |
| Run 5 | 8.90 | 8.30 | #33 implementado, 5 tools asumidas (no verificadas) |
| **Run 6** | **9.07** | **8.30** | #33 verificado nativamente, dedup bug encontrado |
| Run 7 | 9.07 | 8.30 | Fix mergeado (PR #43), MCP server no reiniciado |

---

## 7. Hallazgos Clave

1. **Issue #33 verificado** — Las 5 tools fueron ejecutadas nativamente. Todas funcionan.
2. **capture_passive dedup fix mergeado (PR #43)** — En código, pendiente reinicio del MCP server para activar.
3. **Engram dedup funciona de fábrica** — `saved=0, duplicates=3` en segunda llamada.
4. **6 tipos verificados en Memento** — `decision, bug, discovery, note, summary, learning`.
5. **Lifecycle management limpia duplicados** — ids 186-188 eliminados con mem_delete.
6. **Merge escala** — 6 grupos, 47 obs acumuladas de 7 runs.
7. **FTS5 search con `#` crashea** — Issue conocido, no es nuevo.
8. **MCP server no recoge cambios automáticamente** — Requiere reinicio manual.

---

## 8. Bugs Conocidos

| # | Sistema | Bug | Severidad | Estado |
|---|---------|-----|-----------|--------|
| 1 | Memento | `mem_capture_passive` dedup fix en código, MCP no reiniciado | 🟡 Medium | Fix mergeado (PR #43), pendiente reinicio |
| 2 | Memento | FTS5 search crashea con caracteres especiales (#, *, etc.) | 🟡 Medium | Abierto |
| 3 | Engram | `mem_search(type=...)` crashea con FTS5 syntax error | 🔴 High | Abierto |

---

## 9. Veredicto

> **Memento como sistema principal (9.07 vs 8.30).** Con #33 verificado nativamente en Run 6, Memento confirma que sus 23 tools funcionan. El fix de capture_passive dedup (PR #43) está mergeado y verificado en tests unitarios (41/41). Pendiente reinicio del MCP server.
>
> **Engram mantiene ventaja en modelo de datos** (8+ tipos, scope personal, dedup nativo en capture_passive). Issue #36 cerrará esa brecha en Memento.
>
> **Recomendación final**: Memento como sistema primario. Engram puede coexistir para casos específicos que necesiten scope personal o tipos granulares.

---

## 10. Próximos Pasos

1. **Reiniciar MCP server** para activar capture_passive dedup fix
2. **Run 8** post-reinicio para confirmar dedup en producción
3. Implementar Issue #36 (expanded types: pattern, architecture, config, preference)
4. Implementar Issue #36 (personal scope)
5. Fix FTS5 special chars en search (issue existente)
6. Considerar si Engram debe agregar lifecycle management
7. Cleanup datos de test del proyecto `memento-comparison-test` (47+ obs acumuladas)
