# API Introduction

Memento Web UI includes a REST API built with Next.js 15 Route Handlers. All endpoints return JSON.

## Base URL

```
http://localhost:8086/api
```

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/config` | System configuration |
| GET | `/api/context` | Recent observations |
| GET | `/api/projects` | List projects |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/[id]` | Get session details |
| GET | `/api/observations` | List observations |
| GET | `/api/observations/[id]` | Get observation |
| POST | `/api/observations` | Create observation |
| PATCH | `/api/observations/[id]` | Update observation |
| DELETE | `/api/observations/[id]` | Soft-delete observation |
| GET | `/api/observations/search` | Search observations |
| GET | `/api/observations/timeline` | Timeline view |
| GET | `/api/observations/deleted` | List deleted |
| POST | `/api/observations/[id]/restore` | Restore deleted |
| POST | `/api/observations/purge` | Permanent delete |
| POST | `/api/observations/merge` | Merge observations |
| POST | `/api/observations/export` | Export observations |

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Observation not found",
  "code": "NOT_FOUND"
}
```

## Content Type

- Request: `application/json`
- Response: `application/json`

## See Also

- [Observations API](/docs/api/observations) — CRUD endpoints
- [Sessions API](/docs/api/sessions) — session endpoints
- [Search API](/docs/api/search) — search endpoints
