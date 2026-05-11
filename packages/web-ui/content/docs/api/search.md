# Search API

Search endpoints for finding observations.

## Search Observations

```
GET /api/observations/search?q=query&type=decision&project_id=my-app&limit=10&mode=keyword
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (FTS5 syntax) |
| `type` | string | Filter by observation type |
| `project_id` | string | Filter by project |
| `topic_key` | string | Filter by topic (exact match) |
| `limit` | number | Max results (default: 10) |
| `offset` | number | Pagination offset |
| `mode` | string | `keyword`, `semantic`, or `hybrid` |

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
        "content": "## What\n...",
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
GET /api/observations/timeline?project_id=my-app&limit=50
```

Returns observations in strict chronological order (oldest first).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | string | Filter by project |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
