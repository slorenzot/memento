# Sessions API

Endpoints for managing memory sessions.

## List Sessions

```
GET /api/sessions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | string | Filter by project |
| `limit` | number | Max results (default: 20) |

**Response:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 7,
        "projectId": "my-app",
        "endedAt": null,
        "metadata": {},
        "createdAt": "2025-01-15T09:00:00Z"
      }
    ],
    "total": 1
  }
}
```

## Get Session

```
GET /api/sessions/:id
```

Returns session details including associated observations.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 7,
    "projectId": "my-app",
    "endedAt": null,
    "metadata": { "agent": "claude" },
    "observations": [...],
    "createdAt": "2025-01-15T09:00:00Z"
  }
}
```
