# Referencia de Herramientas MCP

Referencia completa de las 21 herramientas MCP de Memento. Todas las herramientas devuelven respuestas en Markdown legible.

## Herramientas de Observaciones

### `mem_save`

Guarda una observación en la memoria persistente.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `title` | string | ✅ | Título corto y buscable |
| `content` | string | ✅ | Contenido estructurado (Qué/Por qué/Dónde/Aprendido) |
| `type` | enum | — | `decision`, `bug`, `discovery`, `note`, `summary`, `learning`, `pattern`, `architecture`, `config`, `preference` (por defecto: `note`) |
| `topic_key` | string | — | Clave estable para agrupar (ej: `"architecture/auth"`) |
| `project_id` | string | — | Identificador del proyecto |
| `scope` | enum | — | `project` o `personal` |
| `pinned` | boolean | — | Fijar para inyección permanente (por defecto: `false`) |
| `read_only` | boolean | — | Marcar como solo lectura (por defecto: `false`) |
| `metadata` | object | — | Metadatos adicionales |

**Respuesta:** Confirmación con ID de observación y `topic_key` sugerido si no se proporcionó.

---

### `mem_search`

Busca observaciones usando búsqueda de texto completo.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `query` | string | — | Consulta de búsqueda (sintaxis FTS5 o lenguaje natural) |
| `type` | enum | — | Filtrar por tipo de observación |
| `project_id` | string | — | Filtrar por proyecto |
| `topic_key` | string | — | Filtrar por tema (coincidencia exacta) |
| `limit` | number | — | Resultados máximos (por defecto: 10) |
| `offset` | number | — | Offset de paginación |
| `include_deleted` | boolean | — | Incluir eliminados lógicamente |
| `scope` | enum | — | `project` o `personal` |
| `sort` | enum | — | `relevance` (por defecto) o `chronological` |
| `mode` | enum | — | `keyword` (por defecto), `semantic`, o `hybrid` |

**Respuesta:** Lista Markdown de observaciones coincidentes (contenido truncado). Usa `mem_get_observation` para el contenido completo.

---

### `mem_get_observation`

Obtiene el contenido completo sin truncar de una observación específica.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | number | ✅ | ID de la observación |
| `include_deleted` | boolean | — | Incluir eliminados lógicamente (por defecto: `false`) |

**Respuesta:** Detalles completos de la observación en Markdown.

---

### `mem_update`

Actualiza una observación existente. Solo los campos proporcionados se actualizan.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | number | ✅ | ID de la observación |
| `title` | string | — | Nuevo título |
| `content` | string | — | Nuevo contenido |
| `type` | enum | — | Nuevo tipo |
| `topic_key` | string | — | Nueva clave de tema |
| `pinned` | boolean | — | Fijar/Desfijar |

**Respuesta:** Confirmación de la actualización.

---

### `mem_replace`

Reemplaza un fragmento de texto dentro del contenido de una observación — más eficiente en tokens que `mem_update` para cambios pequeños.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | number | ✅ | ID de la observación |
| `old_text` | string | ✅ | Texto exacto a buscar (debe ser único) |
| `new_text` | string | ✅ | Texto de reemplazo |

**Respuesta:** Confirmación con conteo de caracteres. Falla si el texto no se encuentra o aparece múltiples veces. Respeta la protección de solo lectura.

---

## Herramientas de Ciclo de Vida

### `mem_delete`

Elimina, restaura, purga o lista observaciones eliminadas.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `action` | enum | — | `soft` (por defecto), `restore`, `permanent`, `list` |
| `id` | number | — | Requerido para `soft` y `restore` |
| `confirm` | boolean | — | Debe ser `true` para `permanent` |
| `reason` | string | — | Razón de la eliminación |
| `project_id` | string | — | Filtro para `list` y `permanent` |
| `observation_ids` | number[] | — | IDs específicos a purgar |
| `limit` | number | — | Resultados máximos para `list` (por defecto: 20) |

---

### `mem_merge`

Fusiona observaciones relacionadas en un solo registro.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `project_id` | string | ✅ | Proyecto donde fusionar |
| `topic_key` | string | — | Fusionar por tema |
| `observation_ids` | number[] | — | Fusionar IDs específicos |
| `strategy` | enum | — | `by_topic` (por defecto), `by_similarity`, `by_ids` |
| `dry_run` | boolean | — | Previsualizar sin ejecutar (recomendado primero) |

---

## Fijar y Bloquear

### `mem_pin` / `mem_unpin`

Fija/Desfija una observación para inyección en el system prompt.

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | number | ✅ |

### `mem_lock` / `mem_unlock`

Bloquea/Desbloquea una observación como solo lectura.

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | number | ✅ |

---

## Herramientas de Sesión

### `mem_session_start`

Inicia una nueva sesión de memoria.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `project_id` | string | ✅ | Identificador del proyecto |
| `metadata` | object | — | Metadatos adicionales de la sesión |

### `mem_session_end`

Termina la sesión activa actual. No requiere parámetros.

### `mem_session_summary`

Guarda una observación de resumen de sesión.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `content` | string | ✅ | Resumen estructurado (Objetivo/Descubrimientos/Logros/Archivos) |
| `project_id` | string | ✅ | Identificador del proyecto |
| `session_id` | number | — | Usa la sesión activa si no se proporciona |

---

## Comodidad para Agentes

### `mem_context`

Obtiene observaciones recientes para recuperación de contexto. NO usa FTS5.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `project_id` | string | — | Filtrar por proyecto |
| `limit` | number | — | Resultados máximos (por defecto: 20) |
| `scope` | enum | — | `project` o `personal` |

### `mem_capture_passive`

Extrae aprendizajes de texto con des duplicación automática.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `content` | string | ✅ | Texto a analizar para aprendizajes |
| `project_id` | string | — | Identificador del proyecto |
| `session_id` | number | — | ID de sesión |
| `source` | string | — | Descripción de la fuente |

### `mem_status`

Diagnósticos del sistema.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `section` | enum | — | `all` (por defecto), `health`, `stats`, `config`, `sessions` |
| `session_id` | number | — | Obtener detalles de sesión específica |
| `project_id` | string | — | Filtrar sesiones por proyecto |
| `limit` | number | — | Sesiones máximas (por defecto: 20) |

---

## Exportación

### `mem_export`

Exporta observaciones a JSON, XML o TXT.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `format` | enum | — | `json` (por defecto), `xml`, `txt` |
| `project_id` | string | — | Filtrar por proyecto |
| `type` | enum | — | Filtrar por tipo |
| `topic_key` | string | — | Filtrar por tema |
| `date_from` | string | — | Fecha ISO — exportar desde |
| `date_to` | string | — | Fecha ISO — exportar hasta |
| `include_deleted` | boolean | — | Incluir eliminados lógicamente |

---

## Herramientas de Journal

### `mem_journal_write`

Crea una entrada de journal inmutable.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `title` | string | ✅ | Título corto y descriptivo |
| `body` | string | ✅ | Contenido completo del cuerpo |
| `tags` | string[] | — | Tags de clasificación |
| `project_id` | string | — | Identificador del proyecto |
| `supersedes` | number | — | ID de la entrada que esto corrige |
| `metadata` | object | — | Metadatos adicionales |

### `mem_journal_read`

Lee una entrada de journal por su ID.

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | number | ✅ |

### `mem_journal_search`

Busca entradas de journal con FTS5, tags y filtros de fecha.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `query` | string | — | Consulta de búsqueda FTS5 |
| `tags` | string[] | — | Filtrar por tags (lógica AND) |
| `project_id` | string | — | Filtrar por proyecto |
| `active_only` | boolean | — | Excluir entradas reemplazadas |
| `date_from` | string | — | Filtro de fecha ISO |
| `date_to` | string | — | Filtro de fecha ISO |
| `limit` | number | — | Resultados máximos (por defecto: 20) |
| `offset` | number | — | Offset de paginación |
