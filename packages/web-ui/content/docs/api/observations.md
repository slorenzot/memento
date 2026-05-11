# Observations API

CRUD endpoints for managing observations.

## List Observations

```
GET /api/observations
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | string | Filter by project |
| `type` | string | Filter by type |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "observations": [
      {
        "id": 42,
        "title": "Fixed N+1 query",
        "type": "bug",
        "topicKey": "bugfix/n1-query",
        "projectId": "my-app",
        "content": "## What\n...",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

## Get Observation

```
GET /api/observations/:id
```

**Response:** Single observation with full content.

## Create Observation

```
POST /api/observations
```

**Body:**

```json
{
  "title": "Chose SQLite over PostgreSQL",
  "content": "## What\n...",
  "type": "decision",
  "topicKey": "architecture/persistence",
  "projectId": "my-app"
}
```

## Update Observation

```
PATCH /api/observations/:id
```

**Body:** Any updatable field (`title`, `content`, `type`, `topicKey`, `pinned`).

## Delete Observation

```
DELETE /api/observations/:id
```

Soft-deletes the observation. Use the purge endpoint for permanent deletion.

## Restore Observation

```
POST /api/observations/:id/restore
```

Restores a soft-deleted observation.
