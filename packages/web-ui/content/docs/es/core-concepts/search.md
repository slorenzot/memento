# Búsqueda

Memento provee capacidades de búsqueda potentes para encontrar observaciones en tu memoria.

## Modos de búsqueda

| Modo | Cómo funciona | Mejor para |
|------|---------------|------------|
| `keyword` | Búsqueda de texto completo FTS5 | Términos exactos, frases específicas |
| `semantic` | Similitud de embeddings locales | Coincidencias conceptuales, "encontrar cosas parecidas" |
| `hybrid` | Combinado keyword + semántico | Lo mejor de ambos mundos |

### Búsqueda por keyword (default)

Usa SQLite FTS5 para búsqueda de texto completo rápida. Soporta sintaxis FTS5 estándar:

```bash
# Búsqueda simple
memento search "N+1 query"

# Operadores FTS5
memento search "auth AND migration"     # ambos términos
memento search "auth OR token"          # cualquier término
memento search "auth NOT oauth"         # excluir término
memento search "auth*"                  # coincidencia por prefijo
memento search '"database migration"'   # frase exacta
```

### Búsqueda semántica

Usa embeddings locales (vía `@huggingface/transformers`) para encontrar observaciones conceptualmente similares. No requiere API externa.

```bash
# Encontrar observaciones similares en significado
memento search "cómo manejamos la autenticación" --mode semantic
```

### Búsqueda híbrida

Combina resultados keyword y semánticos para máxima relevancia:

```bash
memento search "performance de base de datos" --mode hybrid
```

## Filtros

La búsqueda soporta múltiples filtros:

| Filtro | Parámetro | Ejemplo |
|--------|-----------|---------|
| Tipo | `type` | `--type decision` |
| Proyecto | `project_id` | `--project mi-app` |
| Topic | `topic_key` | `--topic architecture/auth` |
| Ámbito | `scope` | `--scope personal` |
| Incluir eliminados | `include_deleted` | `--include-deleted` |
| Paginación | `limit` / `offset` | `--limit 20 --offset 10` |

## Ordenamiento

| Orden | Descripción |
|-------|-------------|
| `relevance` (default) | Score de rank FTS5 — más relevantes primero |
| `chronological` | Created at ascendente — más antiguos primero |

## Los resultados de búsqueda están truncados

`mem_search` devuelve contenido truncado por performance. Usá `mem_get_observation` con el ID devuelto para obtener el contenido completo:

```
1. mem_search("auth model")  → devuelve [ { id: 42, title: "...", content: "..." } ]
2. mem_get_observation(42)   → devuelve contenido COMPLETO
```

## Tips de performance

- Empezá con valores de `limit` pequeños (10) y aumentá solo si es necesario
- Usá filtros `type` y `project_id` para acotar resultados
- La búsqueda keyword es la más rápida — usá semántica/híbrida solo cuando keyword no encuentra lo que necesitás
- La búsqueda semántica requiere generar embeddings (la primera ejecución descarga el modelo)

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — lo que estás buscando
- [Recuperación de contexto](/es/docs/capabilities/context-recovery) — contexto reciente sin búsqueda
- [Herramientas MCP](/es/docs/mcp/tools-reference) — `mem_search` y `mem_get_observation`
