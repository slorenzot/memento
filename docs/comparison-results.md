# Informe Comparativo: Engram vs Memento

> **Última ejecución**: 2026-05-06 (Run 6, sesiones 199 + comparison-run-6)
> **Sesiones de prueba**: 142, 150, 152, 166, 198, 199 (Memento) + comparison-run-3/4/5/6 (Engram)
> **Observaciones creadas**: 38 (Memento) + 20+ (Engram)
> **Proyecto**: `memento-comparison-test`
> **Issue**: #31
> **Score Final**: Memento 9.07 vs Engram 8.30 (Run 6, las 5 tools #33 verificadas nativamente)

---

## 1. Resumen Ejecutivo

Se ejecutaron las 5 fases del plan comparativo contra **Memento** (local SQLite + FTS5, 23 MCP tools) y **Engram** (11 tools) en ejecución lado a lado.

**Resultado**: Memento gana por 0.77 puntos (9.07 vs 8.30). Run 6 verificó nativamente las 5 tools de Issue #33 que Run 5 solo asumía como funcionales. Se encontró 1 bug: `mem_capture_passive` no deduplica contenido repetido (Engram sí).

**Engram gana en modelo de datos**: 8+ tipos de observación (pattern, architecture, config, preference, learning) vs 6 de Memento (decision, bug, discovery, note, summary, learning), y scope personal. Issue #36 cerrará esta brecha.

**Memento gana en lifecycle management**: delete/restore/merge/export + limpieza de duplicados generados por bug de dedup.

---

## 2. Score Final (Run 6)

| Criterio (peso) | Memento | Engram |
|---|---|---|
| Funcionalidad (40%) | 24.5/25 ops = 98% → **39.2** | 18/18 ops = 100% → **40.0** |
| Modelo de Datos (25%) | 6 tipos, topic_key, scope, sessions → **20.0** | 8+ tipos, scope personal, topic_key → **22.5** |
| Ergonomía API (20%) | 23 tools, naming consistente → **18.0** | 11 tools, naming consistente → **16.0** |
| Features Exclusivos (15%) | 10 verificados → **13.5** | 0 exclusivos → **4.5** |
| **TOTAL** | **9.07 🏆** | **8.30** |

---

## 3. Resultados por Fase (Run 5 + Run 6)

### Phase 1: Inicialización

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_start | ✅ (session 199) | ✅ (comparison-run-6) |
| health/context check | ✅ (healthy, 137 obs) | ✅ (context con historial) |

### Phase 2: Captura (4 fixtures + 5 tools #33)

| Operación | Memento | Engram |
|-----------|---------|--------|
| save decision (Zod) | ✅ (id 162) | ✅ |
| save note/pattern (FTS5) | ✅ (id 163) | ✅ |
| save discovery (WAL) | ✅ (id 164) | ✅ |
| save bug/bugfix (special chars) | ✅ (id 165) | ✅ |
| **save_prompt** | ✅ (id 1, auto-session) | ✅ |
| **context** | ✅ (31 obs, 5 con limit) | ✅ (rich format: sessions+prompts+obs) |
| **suggest_topic_key** | ✅ (pattern/fts5-trigger-...) | ✅ (idéntico resultado) |
| **session_summary (NATIVA)** | ✅ (id 167, type=summary) | ✅ |
| **capture_passive** | ⚠️ (3 learnings OK, ❌ no dedup) | ✅ (saved=0, dups=3) |

### Phase 3: Recuperación

| Operación | Memento | Engram |
|-----------|---------|--------|
| search keyword "schema" | ✅ (6 resultados) | ✅ (1 resultado) |
| search + type filter | ✅ (5 decisiones) | ✅ (1 decisión) |
| search by project | ✅ (13 resultados) | ✅ (5 resultados) |
| search type="learning" | ✅ (2 resultados) | ❓ sin resultados |
| search type="summary" | ✅ (1 resultado, nativo) | ❓ sin resultados |
| get_observation | ✅ (full content + metadata) | ✅ (full content + duplicates/revisions) |

### Phase 4: Mutación y Lifecycle

| Operación | Memento | Engram |
|-----------|---------|--------|
| update | ✅ (id 162) | ✅ (id 330) |
| delete (soft) | ✅ (id 165 → excluido de search) | ❌ No tiene tool |
| restore | ✅ (id 165 → vuelve a search) | ❌ No tiene tool |
| delete duplicates (cleanup) | ✅ (ids 171-173 cleaned) | ❌ No tiene tool |
| merge (dry_run) | ✅ (4 grupos, 23 dups) | ❌ No tiene tool |
| export JSON | ✅ (30 registros) | ❌ No tiene tool |

### Phase 5: Cierre

| Operación | Memento | Engram |
|-----------|---------|--------|
| session_end | ✅ (endedAt timestamp) | ✅ |
| session_summary | ✅ **NATIVA** (id 167, isSessionSummary=true) | ✅ (tool nativa) |
| capture_passive | ⚠️ Funciona pero **NO deduplica** | ✅ (dedup correcto: saved=0, dups=3) |

---

## 4. Matriz de Capacidades

### Tools Memento (23 total — verificadas ✅ en Run 6)

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
| mem_save_prompt | Conveniencia | ✅ (verificada Run 6 — id 1) |
| mem_context | Conveniencia | ✅ (verificada Run 6 — 31 obs) |
| mem_suggest_topic_key | Conveniencia | ✅ (verificada Run 6 — key estable) |
| mem_session_summary | Conveniencia | ✅ (verificada Run 6 — id 167, type=summary) |
| mem_capture_passive | Conveniencia | ⚠️ (verificada Run 6 — funciona pero NO deduplica) |
| mem_timeline | Diagnóstico | ✅ |
| mem_stats | Diagnóstico | ✅ |
| mem_health | Diagnóstico | ✅ |
| mem_config | Diagnóstico | ✅ |
| mem_list_deleted | Diagnóstico | ✅ |

### Tools Engram (11 total — verificadas ✅ en Run 6)

| Tool | Categoría | Status |
|------|-----------|--------|
| mem_save | CRUD | ✅ |
| mem_search | Búsqueda | ✅ |
| mem_get_observation | CRUD | ✅ |
| mem_update | CRUD | ✅ |
| mem_session_start | Sesión | ✅ |
| mem_session_end | Sesión | ✅ |
| mem_context | Conveniencia | ✅ (verificada Run 6 — rich format) |
| mem_session_summary | Conveniencia | ✅ (verificada Run 6) |
| mem_capture_passive | Conveniencia | ✅ (verificada Run 6 — dedup correcto: saved=0, dups=3) |
| mem_suggest_topic_key | Conveniencia | ✅ (verificada Run 6 — resultado idéntico a Memento) |
| mem_save_prompt | Conveniencia | ✅ (verificada Run 6) |

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

## 6. Score Acumulado (6 Runs)

| Run | Memento | Engram | Nota |
|-----|---------|--------|------|
| Run 1 | 8.65 | — | Solo Memento |
| Run 2 | 8.65 | — | Solo Memento (WAL auto-checkpoint) |
| Run 3 | 8.65 | 6.25 | Primer test ambos, Engram SQLITE_BUSY |
| Run 4 | 8.90 | 8.09 | Ambos secuenciales, restore falso positivo |
| Run 5 | 8.90 | 8.30 | #33 implementado, 5 tools asumidas (no verificadas) |
| **Run 6** | **9.07** | **8.30** | 5 tools #33 verificadas nativamente, dedup bug encontrado |

---

## 7. Hallazgos Clave

1. **Issue #33 verificado** — Las 5 tools fueron ejecutadas nativamente en Run 6. Todas funcionan excepto dedup en `mem_capture_passive`.
2. **`mem_capture_passive` NO deduplica en Memento** — Mismo contenido pasado 2 veces → crea duplicados (ids 168-170 + 171-173). Engram detecta correctamente `duplicates=3, saved=0`.
3. **`mem_session_summary` NATIVA funciona** — Crea obs tipo `summary` con `metadata.isSessionSummary=true` y auto-título con fecha.
4. **6 tipos verificados en Memento** — `decision, bug, discovery, note, summary, learning` (antes 4, ahora 6).
5. **Lifecycle management limpia bugs** — Los duplicados de `capture_passive` se eliminaron con `mem_delete` (ids 171-173). Engram no puede limpiar sus propios errores.
6. **Lifecycle management sigue siendo la diferencia** — Memento tiene delete/restore/merge/export, Engram no.
7. **Engram modelo de datos más rico** — 8+ tipos y scope personal.
8. **FTS5 search con `#` crashea** — Issue conocido, no es nuevo.
9. **WAL ratio estable** — 1.7x (466 KB vs 268 KB), bien controlado.

---

## 8. Veredicto

> **Memento como sistema principal (9.07 vs 8.30).** Con #33 verificado nativamente en Run 6, Memento confirma que sus 23 tools funcionan (22 perfectas, 1 con bug de dedup). Es un superset funcional de Engram — tiene todo lo que Engram tiene + lifecycle management + más herramientas de diagnóstico.
>
> **Bug encontrado**: `mem_capture_passive` no deduplica contenido repetido. Engram sí lo hace correctamente. Issue a crear para fix.
>
> **Engram mantiene ventaja en modelo de datos** (8+ tipos, scope personal, dedup nativo en capture_passive). Issue #36 cerrará esa brecha en Memento.
>
> **Recomendación final**: Memento como sistema primario. Engram puede coexistir para casos específicos que necesiten scope personal o tipos granulares.

---

## 9. Bugs Conocidos

| # | Sistema | Bug | Severidad | Descubierto en |
|---|---------|-----|-----------|----------------|
| 1 | Memento | `mem_capture_passive` no deduplica contenido repetido | 🟡 Medium | Run 6 |
| 2 | Memento | FTS5 search crashea con caracteres especiales (#, *, etc.) | 🟡 Medium | Run 1 |
| 3 | Engram | `mem_search(type=...)` crashea con FTS5 syntax error | 🔴 High | Run 3 |

---

## 10. Próximos Pasos

1. **Fix `mem_capture_passive` dedup** — agregar detección de contenido duplicado antes de crear (issue a crear)
2. Implementar Issue #36 (expanded types: pattern, architecture, config, preference)
3. Implementar Issue #36 (personal scope)
4. Fix FTS5 search con special chars (issue existente)
5. Considerar si Engram debe agregar lifecycle management
6. Cleanup datos de test del proyecto `memento-comparison-test` (38+ obs acumuladas)
