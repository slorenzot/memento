# TUI Package

`@slorenzot/memento-tui` — Terminal User Interface built with Ink and React.

## Tech Stack

- **Framework:** Ink (React for CLI)
- **Module:** ESM
- **State:** React hooks (`useMemento`, `useSessions`, `useSearch`)
- **Backend:** `@slorenzot/memento-core`

## Installation

```bash
bun add -g @slorenzot/memento-tui
memento-tui
```

## Views

| View | Description |
|------|-------------|
| Dashboard | Stats overview |
| Observations | List and browse observations |
| Sessions | Session list with details |
| Search | Search with real-time results |
| Projects | Project overview |
| Detail | Observation detail view |

## Architecture

```
TUI (src/)
  ├── views/       — Screen components (Dashboard, ObservationsList, etc.)
  ├── components/  — Shared UI (Badge, StatusBar, ListSelector, etc.)
  ├── hooks/       — Data hooks (useMemento, useSessions, useSearch)
  └── theme.ts     — Color theme
```

## See Also

- [Core Package](/docs/packages/core) — underlying engine
- [CLI Package](/docs/packages/cli) — simpler CLI alternative
