# CLI Reference

Memento provides a command-line interface for terminal-based workflows.

## Installation

```bash
bun install -g @slorenzot/memento-cli
```

Or use directly with `bunx`:

```bash
bunx @slorenzot/memento-cli <command>
```

## Global Options

| Option | Description |
|--------|-------------|
| `--project <id>` | Project identifier (default: `default`) |
| `--db <path>` | Database path (default: `./data/memento.db`) |
| `--help` | Show help |
| `--version` | Show version |

## Commands

### `memento save`

Save an observation.

```bash
memento save "Fixed N+1 query in UserList" \
  --type bug \
  --project my-app \
  --topic bugfix/n1-query

# With content from stdin
echo "## What\nFixed the query" | memento save "Bug fix" --content-file -
```

**Options:**
- `--type` — observation type (default: `note`)
- `--project` — project identifier
- `--topic` — topic key
- `--scope` — `project` or `personal`
- `--content-file` — read content from file

### `memento search`

Search observations.

```bash
memento search "auth model"
memento search "database" --type decision --limit 5
memento search "performance" --mode semantic
```

**Options:**
- `--type` — filter by type
- `--project` — filter by project
- `--topic` — filter by topic key
- `--limit` — max results (default: 10)
- `--mode` — `keyword`, `semantic`, or `hybrid`
- `--sort` — `relevance` or `chronological`

### `memento context`

Get recent context for a project.

```bash
memento context
memento context --project my-app --limit 20
```

### `memento get`

Get full observation details.

```bash
memento get 42
```

### `memento session`

Manage sessions.

```bash
memento session start --project my-app
memento session end
memento session list
```

### `memento export`

Export observations.

```bash
memento export --format json --output backup.json
memento export --project my-app --type decision
```

### `memento import`

Import from a previously exported file.

```bash
memento import backup.json --project my-app
```

### `memento status`

System diagnostics.

```bash
memento status
memento status --section health
memento status --section stats
```

### `memento projects`

List projects.

```bash
memento projects list
```

### `memento pin` / `memento unpin`

Pin or unpin observations.

```bash
memento pin 42
memento unpin 42
```

### `memento lock` / `memento unlock`

Lock or unlock observations as read-only.

```bash
memento lock 42
memento unlock 42
```
