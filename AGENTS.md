# AGENTS.md

This file contains guidelines for AI agents working on the Memento codebase.

## Build, Lint, and Test Commands

```bash
# Install dependencies
bun install

# Build project
bun run build

# Run development server
bun run dev

# Run MCP server
bun run mcp

# Run CLI
bun run memento <command>

# Linting
bun run lint
bun run lint:fix

# Type checking
bun run typecheck

# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run single test file
bun test <path-to-test-file>

# Run specific test
bun test -t "test name pattern"
```

## Project Structure

```
memento/
├── packages/
│   ├── core/           # Core memory engine
│   ├── mcp-server/     # MCP server implementation
│   ├── api/            # HTTP API
│   ├── cli/            # CLI interface
│   └── web-ui/         # React web UI
├── apps/
│   └── memento/        # Main application
└── tools/              # Build tools and utilities
```

## Code Style Guidelines

### TypeScript Configuration
- Use TypeScript strict mode
- Enable all strict type checking options
- Enable noImplicitAny, strictNullChecks, strictFunctionTypes
- Use ES2022 target
- Use Bun (NodeNext) module resolution

### Imports
- Use named exports for most cases
- Use default exports only for React components and main entry points
- Organize imports: external libs, internal libs, relative imports
- Use absolute imports from `@memento/*` packages
- Avoid deep relative imports (use `../../` max 2 levels)

```typescript
// Good
import { useState, useEffect } from 'react';
import { useObservations } from '@memento/core';
import { formatDate } from '../utils/date';

// Avoid
import { SomeComponent } from '../../../../shared/components';
```

### Naming Conventions

**Files:**
- PascalCase for React components: `ObservationList.tsx`
- kebab-case for utilities: `date-formatter.ts`
- camelCase for hooks: `useObservations.ts`
- kebab-case for test files: `observation-list.test.tsx`

**Variables/Functions:**
- camelCase: `sessionSummary`, `searchObservations`
- PascalCase for classes: `MemoryEngine`, `StorageLayer`
- UPPER_SNAKE_CASE for constants: `MAX_SESSIONS`, `DEFAULT_PAGE_SIZE`

**Types/Interfaces:**
- PascalCase: `Observation`, `Session`, `SearchParams`
- Prefix interfaces with `I` only if needed to distinguish from type: `IMCPTool`

### Component Structure

```typescript
// Import order: React, external libs, internal, styles
import { useState, useEffect } from 'react';
import clsx from 'clsx';

import { Observation } from '@memento/core/types';
import { useObservations } from '../hooks/useObservations';

import styles from './ObservationList.module.css';

// Props interface
interface ObservationListProps {
  observations: Observation[];
  onObservationClick: (id: string) => void;
  className?: string;
}

// Component definition
export function ObservationList({
  observations,
  onObservationClick,
  className,
}: ObservationListProps) {
  // Hooks
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { search } = useObservations();

  // Effects
  useEffect(() => {
    // effect logic
  }, [observations]);

  // Event handlers
  const handleClick = (id: string) => {
    setSelectedId(id);
    onObservationClick(id);
  };

  // Render
  return (
    <ul className={clsx(styles.root, className)}>
      {observations.map((obs) => (
        <li key={obs.id} onClick={() => handleClick(obs.id)}>
          {obs.title}
        </li>
      ))}
    </ul>
  );
}
```

### Error Handling

```typescript
// Use Result type for operations that can fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Async error handling with try-catch
async function createObservation(data: ObservationData): Promise<Result<Observation>> {
  try {
    const observation = await db.observations.create({ data });
    return { success: true, data: observation };
  } catch (error) {
    console.error('Failed to create observation:', error);
    return { success: false, error: error as Error };
  }
}

// Validation errors
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Database Operations

- Use Prisma/Drizzle ORM for all database operations
- Use transactions for multi-step operations
- Always handle database errors gracefully
- Use prepared statements for frequently executed queries
- Implement proper indexes for search performance

### Testing Guidelines

```typescript
// Unit test example
import { describe, it, expect, beforeEach } from 'bun:test';
import { MemoryEngine } from '../MemoryEngine';

describe('MemoryEngine', () => {
  let engine: MemoryEngine;

  beforeEach(() => {
    engine = new MemoryEngine();
  });

  it('should create observation successfully', async () => {
    const result = await engine.createObservation({
      title: 'Test',
      content: 'Test content',
      type: 'decision',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test');
    }
  });

  it('should handle invalid data', async () => {
    const result = await engine.createObservation({
      title: '',
      content: '',
      type: 'invalid' as any,
    });

    expect(result.success).toBe(false);
  });
});
```

### MCP Tool Guidelines

- Implement all 15 tools defined in PRD
- Use clear, descriptive tool names
- Provide detailed input validation
- Include proper error messages
- Document expected output format
- Support both Agent and Admin profiles

### API Guidelines

- Use RESTful conventions
- Implement proper HTTP status codes
- Use JWT for authentication
- Implement rate limiting
- Provide OpenAPI/Swagger documentation
- Use TypeScript types for request/response

### Performance Guidelines

- Response time: <100ms for basic operations
- Search performance: <500ms for complex queries
- Implement caching for frequently accessed data
- Use lazy loading for large datasets
- Optimize database queries with proper indexes
- Monitor memory usage: <100MB for basic server

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration
- Implement input validation and sanitization
- Use AES-256 encryption for sensitive data
- Implement proper CORS configuration
- Use security headers (CSP, XSS protection)

### Git Commit Messages

```
type(scope): subject

body

footer
```

Types: feat, fix, docs, style, refactor, test, chore
Scope: core, mcp, api, cli, web-ui
Subject: max 50 chars, imperative mood
Body: detailed explanation, max 72 chars per line
Footer: breaking changes, closes #issue

Example:
```
feat(core): add full-text search with FTS5

Implement SQLite FTS5 for fast full-text search
across observations with BM25 ranking.

- Add observations_fts virtual table
- Implement search endpoint
- Add unit tests

Closes #42
```

## Workflows

### Issue & Fix Workflow (MANDATORY)

**Trigger**: Any code change — bug fix, feature, refactor, docs update

**NO se commitea directo a `main`. SIEMPRE branch + PR.**

```
1. Crear Issue (bug/feature/docs) en GitHub
2. Crear branch desde main:
   - fix/{issue}-{description}   (bugs)
   - feat/{issue}-{description}  (features)
   - docs/{issue}-{description}  (docs)
3. Implementar cambio + tests en el branch
4. Ejecutar tests: bun test
5. Crear PR con formato:
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
