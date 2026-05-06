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

### Memento vs Engram Comparison Test

**Trigger**: When user asks to compare "Memento vs Engram" or "ejecuta la prueba comparativa"

**Workflow**:

1. **Read the test plan**: Issue #31 → `docs/comparison-plan.md`
2. **Execute 5 phases** using `memento_mem_*` tools against project `memento-comparison-test`:
   - Phase 1: Initialization — `mem_session_start` + `mem_health`
   - Phase 2: Decision Capture — 4 fixtures (decision, note, discovery, bug) via `mem_save`
   - Phase 3: Context Retrieval — search by keyword, type, project + `mem_get_observation`
   - Phase 4: Mutation & Lifecycle — `mem_update`, `mem_delete`, `mem_restore`, `mem_merge` (dry_run), `mem_export`
   - Phase 5: Session Close — manual session summary via `mem_save` + `mem_session_end`
3. **Also test Memento-exclusive tools**: `mem_timeline`, `mem_stats`, `mem_config`, `mem_list_deleted`
4. **Generate results** using the comment template from [#31 comment](https://github.com/slorenzot/memento/issues/31#issuecomment-4387993340):
   - Scoring table (Functionality 40%, Data Model 25%, API Ergonomics 20%, Exclusive 15%)
   - Results by phase table
   - Capability matrix (exclusive tools per system)
   - Key findings
   - Verdict
5. **Post results as comment** on Issue #31 via `gh issue comment 31`
6. **Save full report** to `docs/comparison-results.md`
7. **Update Issue #31 body** with checkbox status and scores

**Fixture data**: 4 observations with topic_keys (`architecture/validation`, `pattern/fts5-triggers`, `discovery/sqlite-wal`, `bugfix/fts5-special-chars`)

**Honesty Rules (mandatory)**:

- ✅ ONLY for operations that were **EXECUTED AND VERIFIED** during the test
- ⚠️ Operation works but via manual workaround (no native tool)
- ❌ Operation failed or tool doesn't exist
- ❓ Operation **cannot be verified** — tool not available in session
- **NEVER** mark ✅ for capabilities documented but not tested
- If Engram tools (`engram_mem_*`) are not connected: mark as `❓ No verificable`, NOT `✅ Nativo`
- Document what was **actually tested** vs what was **assumed from specs**
