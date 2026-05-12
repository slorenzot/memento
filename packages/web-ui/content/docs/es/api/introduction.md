# Introducción a la API

Memento Web UI incluye una API REST construida con Next.js 15 Route Handlers. Todos los endpoints devuelven JSON.

## URL Base

```
http://localhost:8086/api
```

## Resumen de Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Verificación de salud |
| GET | `/api/stats` | Estadísticas del dashboard |
| GET | `/api/config` | Configuración del sistema |
| GET | `/api/context` | Observaciones recientes |
| GET | `/api/projects` | Listar proyectos |
| GET | `/api/sessions` | Listar sesiones |
| GET | `/api/sessions/[id]` | Obtener detalles de sesión |
| GET | `/api/observations` | Listar observaciones |
| GET | `/api/observations/[id]` | Obtener observación |
| POST | `/api/observations` | Crear observación |
| PATCH | `/api/observations/[id]` | Actualizar observación |
| DELETE | `/api/observations/[id]` | Eliminar observación (lógico) |
| GET | `/api/observations/search` | Buscar observaciones |
| GET | `/api/observations/timeline` | Vista de timeline |
| GET | `/api/observations/deleted` | Listar eliminados |
| POST | `/api/observations/[id]/restore` | Restaurar eliminado |
| POST | `/api/observations/purge` | Eliminación permanente |
| POST | `/api/observations/merge` | Fusionar observaciones |
| POST | `/api/observations/export` | Exportar observaciones |

## Formato de Respuesta

Todos los endpoints devuelven JSON:

```json
{
  "success": true,
  "data": { ... }
}
```

Respuestas de error:

```json
{
  "success": false,
  "error": "Observation not found",
  "code": "NOT_FOUND"
}
```

## Tipo de Contenido

- Petición: `application/json`
- Respuesta: `application/json`

## Ver También

- [API de Observaciones](/es/docs/api/observations) — endpoints CRUD
- [API de Sesiones](/es/docs/api/sessions) — endpoints de sesiones
- [API de Búsqueda](/es/docs/api/search) — endpoints de búsqueda
