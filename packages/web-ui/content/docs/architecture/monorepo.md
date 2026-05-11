# Monorepo Structure

Memento is organized as a Bun workspace monorepo.

## Layout

```
memento/
├── packages/
│   ├── core/           → @slorenzot/memento-core
│   ├── mcp-server/     → @slorenzot/memento-mcp-server
│   ├── cli/            → @slorenzot/memento-cli
│   ├── api/            → @slorenzot/memento-api (deprecated)
│   └── web-ui/         → @slorenzot/memento-web-ui
├── apps/
│   └── tui/            → @slorenzot/memento-tui
├── docs/               → Documentation and comparison results
├── package.json        → Root workspace config
└── AGENTS.md           → AI agent instructions
```

## Dependency Flow

```
core → mcp-server → cli / tui → web-ui
```

- **core** has zero external dependencies (only `bun:sqlite`)
- **mcp-server** depends on `core` and `@modelcontextprotocol/sdk`
- **cli** depends on `core`
- **web-ui** depends on `core` (via Route Handlers)
- **tui** depends on `core`

## Build Pipeline

```bash
# Build all packages
bun run --filter '*' build

# Build specific package
bun run --filter @slorenzot/memento-core build

# Run all tests (builds first)
bun test
```

### Build Outputs

| Package | Build Tool | Output |
|---------|-----------|--------|
| core | `tsc` | `dist/` (CJS) |
| mcp-server | `tsc` | `dist/` (CJS) |
| cli | `tsc` | `dist/` (CJS) |
| web-ui | `next build` | `.next/` |
| tui | `tsc` | `dist/` (ESM) |

## Package Versions

| Package | Version | Binary |
|---------|---------|--------|
| @slorenzot/memento-core | 1.0.0 | — |
| @slorenzot/memento-mcp-server | 1.0.0 | `memento-mcp` |
| @slorenzot/memento-cli | 1.0.0 | `memento` |
| @slorenzot/memento-web-ui | 0.2.0 | — |
| @slorenzot/memento-tui | 0.1.0 | `memento-tui` |

## Module Formats

| Package | Format | Why |
|---------|--------|-----|
| core, mcp-server, cli | CJS | `bun:sqlite` compatibility |
| web-ui | Next.js | App Router with Server Components |
| tui | ESM | Ink requires ESM |

## Workspace Aliases

Internal imports use `@memento/*` aliases:

```typescript
// In web-ui
import { MemoryEngine } from '@slorenzot/memento-core';
```

Max 2 levels of relative imports (`../../`). Use workspace references for cross-package imports.

## See Also

- [Core Package](/docs/packages/core) — engine details
- [Database Architecture](/docs/architecture/database) — SQLite design
