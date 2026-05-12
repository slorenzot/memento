# API de Observaciones

Endpoints CRUD para gestionar observaciones.

## Listar Observaciones

```
GET /api/observations
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `project_id` | string | Filtrar por proyecto |
| `type` | string | Filtrar por tipo |
| `limit` | number | Resultados máximos (por defecto: 50) |
| `offset` | number | Offset de paginación |

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
        "topicKey": "bugfix/n1-query",
        "projectId": "mi-app",
        "content": "## Qué\n...",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

## Obtener Observación

```
GET /api/observations/:id
```

**Respuesta:** Una observación con contenido completo.

## Crear Observación

```
POST /api/observations
```

**Cuerpo:**

```json
{
  "title": "Elegí SQLite sobre PostgreSQL",
  "content": "## Qué\n...",
  "type": "decision",
  "topicKey": "architecture/persistence",
  "projectId": "mi-app"
}
```

## Actualizar Observación

```
PATCH /api/observations/:id
```

**Cuerpo:** Cualquier campo actualizable (`title`, `content`, `type`, `topicKey`, `pinned`).

## Eliminar Observación

```
DELETE /api/observations/:id
```

Elimina lógicamente la observación. Usa el endpoint de purga para eliminación permanente.

## Restaurar Observación

```
POST /api/observations/:id/restore
```

Restaura una observación eliminada lógicamente.
