# Export & Import

Export observations to JSON, XML, or TXT format for backups, migration, or sharing across projects.

## Export

```bash
# Export all observations as JSON
memento export --format json --output backup.json

# Export by project
memento export --project my-app --format json

# Export by type and date range
memento export --type decision --from 2025-01-01 --to 2025-01-31
```

### Via MCP

```typescript
// mem_export
{
  format: "json",           // json | xml | txt
  project_id: "my-app",     // optional filter
  type: "decision",         // optional filter
  topic_key: "architecture", // optional filter
  date_from: "2025-01-01",  // optional
  date_to: "2025-01-31",    // optional
  include_deleted: false     // include soft-deleted?
}
```

### Response

```json
{
  "format": "json",
  "recordCount": 42,
  "exportedAt": "2025-01-15T10:30:00Z",
  "content": "..."
}
```

## Formats

| Format | Use Case |
|--------|----------|
| `json` | Machine-readable, re-importable, API integration |
| `xml` | Enterprise systems, SOAP integrations |
| `txt` | Human-readable, grep-friendly, notes |

## Import

Import data from a previously exported JSON file:

```bash
memento import backup.json --project my-app
```

## Filters

All filters are optional:

| Filter | Description |
|--------|-------------|
| `project_id` | Export observations from a specific project |
| `type` | Export only a specific observation type |
| `topic_key` | Export observations with a specific topic |
| `date_from` | ISO date string — export from this date |
| `date_to` | ISO date string — export until this date |
| `include_deleted` | Include soft-deleted observations |

## See Also

- [Observations](/docs/core-concepts/observations) — what you're exporting
- [Merge](/docs/capabilities/merge) — consolidate after import
