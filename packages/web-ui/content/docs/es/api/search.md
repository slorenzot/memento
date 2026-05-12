# API de Búsqueda

Endpoints de búsqueda para encontrar observaciones.

## Buscar Observaciones

```
GET /api/observations/search?q=consulta&type=decision&project_id=mi-app&limit=10&mode=keyword
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Consulta de búsqueda (sintaxis FTS5) |
| `type` | string | Filtrar por tipo de observación |
| `project_id` | string | Filtrar por proyecto |
| `topic_key` | string | Filtrar por tema (coincidencia exacta) |
| `limit` | number | Resultados máximos (por defecto: 10) |
| `offset` | number | Offset de paginación |
| `mode` | string | `keyword`, `semantic`, o `hybrid` |

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "observations": [
      {
        "id": 42,
        "title": "Corregido query N+1",
        "type": "bug",
        "content": "## Qué\n...",
        "score": -2.45,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

## Timeline

```
GET /api/observations/timeline?project_id=mi-app&limit=50
```

Devuelve observaciones en orden cronológico estricto (las más antiguas primero).

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `project_id` | string | Filtrar por proyecto |
| `limit` | number | Resultados máximos (por defecto: 50) |
| `offset` | number | Offset de paginación |
