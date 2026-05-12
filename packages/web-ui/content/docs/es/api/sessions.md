# API de Sesiones

Endpoints para gestionar sesiones de memoria.

## Listar Sesiones

```
GET /api/sessions
```

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `project_id` | string | Filtrar por proyecto |
| `limit` | number | Resultados máximos (por defecto: 20) |

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 7,
        "projectId": "mi-app",
        "endedAt": null,
        "metadata": {},
        "createdAt": "2025-01-15T09:00:00Z"
      }
    ],
    "total": 1
  }
}
```

## Obtener Sesión

```
GET /api/sessions/:id
```

Devuelve los detalles de la sesión incluyendo las observaciones asociadas.

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": 7,
    "projectId": "mi-app",
    "endedAt": null,
    "metadata": { "agent": "claude" },
    "observations": [...],
    "createdAt": "2025-01-15T09:00:00Z"
  }
}
```
