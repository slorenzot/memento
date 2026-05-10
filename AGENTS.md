# AGENTS.md

## Project Overview

Memento — persistent memory system for AI coding agents. Runtime: **Bun**. Tests: **bun:test**. Monorepo via **bun workspaces** with 6 published packages under `@slorenzot/memento-*`.

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run build` | Build all packages (`--filter '*'`) |
| `bun test` | Build + run all tests |
| `bun run lint` / `lint:fix` | ESLint |
| `bun run typecheck` | TypeScript `--noEmit` |
| `bun run dev` | Start web-ui dev server |
| `bun run mcp` | Start MCP server |
| `bun run memento <cmd>` | Run CLI |

## Architecture

```
packages/core        → @slorenzot/memento-core     (CJS, bun:sqlite)
packages/mcp-server  → @slorenzot/memento-mcp-server (CJS, depends on core)
packages/cli         → @slorenzot/memento-cli       (CJS, depends on core)
packages/api         → @slorenzot/memento-api       (CJS, depends on core)
packages/web-ui      → @slorenzot/memento-web-ui    (ESM, React + Vite)
apps/tui             → @slorenzot/memento-tui       (ESM, Ink + React)
```

Dependency flow: `core → mcp-server → cli / api / tui → web-ui`

## Build Pipeline

- **core / mcp-server / cli / api / tui**: `tsc` → `dist/`
- **web-ui**: `tsc --declaration --emitDeclarationOnly` + `vite build`
- **Root**: `bun run --filter '*' build`
- **Tests**: `bun run build && bun test`

## Database Architecture

- **Engine**: `bun:sqlite` with raw SQL (no ORM)
- **6 tables**: `sessions`, `observations`, `prompts`, `projects`, `journal`, `journal_tags`
- **FTS5 virtual tables**:
  - `observations_fts` — standalone mode (no content=), synced at application level
  - `journal_fts` — content='journal', insert-only trigger
- **PRAGMAs**: WAL mode, foreign_keys ON, busy_timeout 5000ms
- **Migrations**: inline SQL with try/catch per column
- **Test DB**: temp file per test via `createTestDb()` in `test-helpers.ts`

## Testing Patterns

- **Framework**: `bun:test` (`describe`, `it`, `expect`, `beforeEach`)
- **Fresh DB per test**: `createTestDb()` creates isolated temp-file database
- **Helpers** (`packages/core/src/test-helpers.ts`): `seedSession()`, `seedObservation()`, `seedMultipleObservations()`
- **File convention**: `MemoryEngine.{feature}.test.ts` (e.g. `MemoryEngine.merge.test.ts`, `MemoryEngine.delete.test.ts`)
- **MCP tools**: tested in `MCPTools.test.ts` and `packages/mcp-server/src/__tests__/tools.unit.test.ts`
- **Benchmark**: `test-helpers.ts` provides `measureTime()`, `expectUnder()`, `bench()` helpers

## Code Conventions

- **10 observation types**: `decision | bug | discovery | note | summary | learning | pattern | architecture | config | preference`
- **27 MCP tools** (16 active + 11 deprecated): all prefixed `mem_*` (defined in `packages/mcp-server/src/tools.ts`)
- **Consolidated tools**: `mem_delete(action=...)`, `mem_search(sort=...)`, `mem_status(section=...)` absorb 10 deprecated tools
- **MCP responses**: plain text, not JSON
- **Module format**: CJS for core/mcp/cli/api, ESM for web-ui/tui
- **Named exports**: default exports only for React components and entry points
- **Internal imports**: `@memento/*` workspace aliases, max 2 levels deep (`../../`)

## Package Versions

| Package | Version | Format | Bin |
|---------|---------|--------|-----|
| @slorenzot/memento-core | 1.0.0 | CJS | — |
| @slorenzot/memento-mcp-server | 1.0.0 | CJS | `memento-mcp` |
| @slorenzot/memento-cli | 1.0.0 | CJS | `memento` |
| @slorenzot/memento-api | 0.3.0 | CJS | `memento-api` |
| @slorenzot/memento-web-ui | 0.1.1 | ESM | — |
| @slorenzot/memento-tui | 0.1.0 | ESM | `memento-tui` |

## Git Conventions

- **Format**: `type(scope): subject` — scopes: `core`, `mcp`, `api`, `cli`, `web-ui`, `tui`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Subject**: max 50 chars, imperative mood
- **Workflow**: See [Issue & Fix Workflow](#issue--fix-workflow-mandatory) below

## Workflows

### Issue & Fix Workflow (MANDATORY)

**Trigger**: Any code change — bug fix, feature, refactor, docs update

**NO se commitea directo a `main`. SIEMPRE branch + PR.**

```
1. Crear Issue (bug/feature/docs) en GitHub
2. Crear branch desde develop:
   - fix/{issue}-{description}   (bugs)
   - feat/{issue}-{description}  (features)
   - docs/{issue}-{description}  (docs)
3. Implementar cambio + tests en el branch
4. Ejecutar tests: bun test
5. Crear PR contra develop con formato:
   - Título: tipo(scope): descripción
   - Body: descripción del cambio + "Fixes #{issue}" o "Closes #{issue}"
6. PR merge → cierra Issue automáticamente
```

**Reglas**:
- NUNCA commit directo a `main` — siempre branch + PR
- El commit message usa `Fixes #{issue}` o `Closes #{issue}` en el body del PR, NO en el commit
- Un Issue se cierra cuando el PR se mergea, no cuando se commitea
- Si el Issue no existe, crearlo ANTES de empezar a codear
- Los tests (`bun test`) DEBEN pasar antes de crear el PR

**Merge rules**:
- SIEMPRE `gh pr merge --squash --delete-branch` SIN `--subject`/`--body` para que GitHub use el body original del PR
- El body del PR DEBE incluir `Closes #{issue}` o `Fixes #{issue}` para cierre automático
- DESPUÉS del merge, verificar con `gh issue view {N} --json state` que el Issue se cerró
- Si no se cerró automáticamente, cerrar manualmente con `gh issue close {N} --reason completed`

### Memento Epic Workflow (MEW)

**Trigger**: Epic issues (#49, #50, #61, #30) — complex multi-step features requiring structured phases. Non-Epic issues use the standard delegation protocol.

**Priority Rule**: P0 Bugs (always first) > P1 Minor Issues (standard protocol) > P2 Epics (MEW)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  ASSESS   │───▶│   PLAN   │───▶│  BUILD   │───▶│  CHECK   │
│ delegate  │    │ inline   │    │ delegate │    │ delegate │
│ explore   │    │ orchestr.│    │ per task │    │ tester   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Phases**:

1. **ASSESS** — delegate to `explore`: read issue + explore codebase → validate proposal, identify gaps. Saves to `mew/{issue}/assess`
2. **PLAN** — orchestrator inline: break into atomic tasks with dependencies. Saves to `mew/{issue}/plan`
3. **BUILD** — delegate per task: implement in dependency order using standard delegation matrix. Tracks in `mew/{issue}/build-progress`
4. **CHECK** — delegate to `tester`: run tests + validate against issue requirements. Saves to `mew/{issue}/check`

**State Tracking**: All phase artifacts stored in persistent memory with topic_key `mew/{issue-number}/{phase}`.

**Epic Execution Order**:

| Priority | Epic | Rationale |
|----------|------|-----------|
| 1st | #61 Tool Consolidation (26→16) | Reduces token cost before adding features |
| 2nd | #50 OpenCode Plugin | System prompt injection, improves UX |
| 3rd | #49 Semantic Search | Local embeddings, complex but no blockers |
| 4th | #30 Next.js Web UI | Largest epic, best when core is stable |

**Bug Rule**: If a bug is found during BUILD → PAUSE BUILD → create bug issue → fix via standard protocol → resume BUILD from last completed task.

**Pre-check**: Before starting any Epic, verify zero open bugs exist. If bugs are open → fix them first (P0 always wins).

**Commands**:
- `/mew-start {issue}` → Start ASSESS phase for an Epic
- `/mew-continue {issue}` → Run next pending phase
- `/mew-status` → Show all active Epics status

### Memento vs Engram Comparison Test

**Trigger**: When user asks to compare "Memento vs Engram" or "ejecuta la prueba comparativa"

**Issue tracker**: #42 (reemplaza #31, cerrado con 6 runs)

**Workflow**:

1. **Read the test plan**: `docs/comparison-plan.md`
2. **Read previous results**: `docs/comparison-results.md`
3. **Execute 5 phases** using BOTH `memento_mem_*` AND `engram_mem_*` tools against project `memento-comparison-test`:
   - Phase 1: Initialization — `mem_session_start` + `mem_health` (Memento) / `engram_mem_session_start` + `engram_mem_context` (Engram)
   - Phase 2: Decision Capture — 4 fixtures via `mem_save` + 5 Issue #33 tools (`mem_save_prompt`, `mem_context`, `mem_suggest_topic_key`, `mem_session_summary`, `mem_capture_passive`)
   - Phase 3: Context Retrieval — search by keyword, type, project + `mem_get_observation` + verify new types (`learning`, `summary`)
   - Phase 4: Mutation & Lifecycle — `mem_update`, `mem_delete`, `mem_restore`, `mem_merge` (dry_run), `mem_export` + cross-call dedup verification
   - Phase 5: Session Close — `mem_session_summary` (NATIVE) + `mem_capture_passive` (dedup test) + `mem_session_end`
4. **Also test Memento-exclusive tools**: `mem_timeline`, `mem_stats`, `mem_config`, `mem_health`, `mem_list_deleted`
5. **Generate results** with scoring table:
   - Scoring: Functionality 40%, Data Model 25%, API Ergonomics 20%, Exclusive 15%
   - Results by phase table (AMBOS sistemas)
   - Capability matrix (23 Memento tools, 11 Engram tools)
   - Bugs found table
   - Key findings
   - Verdict
6. **Post results as comment** on Issue #42 via `gh issue comment 42`
7. **Update** `docs/comparison-results.md` with latest run data
8. **Commit changes** following Issue & Fix Workflow (branch + PR)

**Current state**: Run 6 completed — Memento 9.07 vs Engram 8.30

**Fixture data**: 4 observations with topic_keys (`architecture/validation`, `pattern/fts5-triggers`, `discovery/sqlite-wal`, `bugfix/fts5-special-chars`)

**Honesty Rules (mandatory)**:

- ✅ ONLY for operations that were **EXECUTED AND VERIFIED** during the test
- ⚠️ Operation works but has known limitations (document them)
- ❌ Operation failed or tool doesn't exist
- ❓ Operation **cannot be verified** — tool not available in session
- **NEVER** mark ✅ for capabilities documented but not tested (Run 5 did this — Run 6 caught it)
- **ALWAYS** execute `mem_capture_passive` twice with same content to verify dedup
- **ALWAYS** use `mem_session_summary` NATIVE tool, not `mem_save` with type "summary"
- Document what was **actually tested** vs what was **assumed from specs**
- If a tool is marked ✅ in the capability matrix, it MUST have been executed in at least one run
