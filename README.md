# Memento

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io)
[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-core.svg)](https://www.npmjs.org/package/@slorenzot/memento-core)

[English](README.md) | [Español](README.es.md)

**Memento** is a persistent memory system designed specifically for AI coding agents. It solves the forgetting problem by providing a persistent brain that allows agents to maintain context, learn, and improve over time.

> Memento doesn't just remember — it COORDINATES. It's the shared brain that enables an orchestrator to delegate work to sub-agents, track progress, resume interrupted tasks, and measure costs. All with 3 tables and zero friction.

## ⚠️ Important: Restrictive License

This project is under **CC BY-NC-ND 4.0 License**:
- ✅ **Personal and educational use permitted**
- ✅ **Share with attribution to the author**
- ❌ **Commercial use NOT permitted**
- ❌ **Modifications or forks NOT permitted**
- ❌ **Distribution of modified versions NOT permitted**

**Author:** Soulberto Lorenzo (slorenzot@gmail.com)

## 🎯 Key Features

- 🔍 **Advanced Full-Text Search**: SQLite FTS5 with BM25 ranking for ultra-fast semantic search
- 🧠 **Persistent Memory**: Durable storage with SQLite in WAL mode for high performance
- 🔌 **MCP Integration**: 15 fully implemented MCP tools for AI agents
- 🌐 **Multi-Interface**: CLI with 12+ commands, RESTful HTTP API, and modern React 18 Web UI
- 📊 **Smart Sessions**: Complete session management system with context tracking
- ⚡ **High Performance**: Optimized with Bun runtime, <100ms responses for basic operations
- 🛡️ **Type Safety**: Strict TypeScript with Zod validation and complete type safety
- 🧪 **Well Tested**: Comprehensive test coverage with Bun test framework
- 🔧 **Flexible Configuration**: `.mementorc` system with environment variable support
- 📈 **Dashboard & Statistics**: Detailed system metrics and real-time usage analytics

## 🚀 Installation

### Prerequisites
- [Bun](https://bun.sh/) v1.0+ (runtime and package manager)
- Node.js v20+ (for compatibility)

### Install from GitHub

```bash
# Clone the repository
git clone https://github.com/slorenzot/memento.git
cd memento

# Install dependencies
bun install

# Build the project
bun run build

# Verify installation
bun test

# Start development server
bun run dev
```

## 📦 NPM Packages

- [`@slorenzot/memento-core`](https://www.npmjs.org/package/@slorenzot/memento-core) v1.0.0 - Core memory engine
- [`@slorenzot/memento-mcp-server`](https://www.npmjs.org/package/@slorenzot/memento-mcp-server) v1.0.0 - MCP server
- [`@slorenzot/memento-cli`](https://www.npmjs.org/package/@slorenzot/memento-cli) v1.0.0 - CLI interface
- [`@slorenzot/memento-api`](https://www.npmjs.org/package/@slorenzot/memento-api) v0.3.0 - HTTP API
- [`@slorenzot/memento-web-ui`](https://www.npmjs.org/package/@slorenzot/memento-web-ui) v0.1.1 - React web interface

## 📦 Usage

### MCP Server (Recommended for AI Agents)

```bash
# Install globally
bun add -g @slorenzot/memento-mcp-server

# Start MCP server
memento-server

# The server displays an ASCII banner on startup
# Configure in MCP client (Claude Desktop, VS Code, etc.)
# Command: memento-server
```

**15 Available MCP Tools:**

**Observation Management:**
- `mem_save` - Save observations with automatic UUID
- `mem_get_observation` - Get a specific observation by ID
- `mem_update` - Update an existing observation
- `mem_delete` - Delete an observation (soft delete)
- `mem_search` - Full-text search with FTS5 and BM25 ranking

**Session Management:**
- `mem_session_start` - Start a new session with metadata
- `mem_session_end` - End the active session
- `mem_list_sessions` - List all sessions
- `mem_get_session` - Get specific session details

**Utilities:**
- `mem_timeline` - Chronological timeline of observations
- `mem_stats` - System statistics
- `mem_health` - System health check
- `mem_config` - View and modify configuration

**MCP Server Features:**
- Informative ASCII banner on startup
- Advanced error handling with descriptive messages
- Robust health check system
- Support for Agent and Admin profiles

### CLI Interface

```bash
# Install globally
bun add -g @slorenzot/memento-cli

# Observation management commands
memento save "Title" "Content" --type decision --tags tag1,tag2
memento search "search query" --limit 10
memento get <id>
memento update <id> --title "New title" --content "New content"
memento delete <id>

# Session commands
memento timeline --limit 20
memento stats

# Status and configuration commands
memento status                    # Quick health check and executive summary
memento recents                   # Show recent observations with relative time
memento config                    # View current configuration

# Server commands
memento serve                     # Start HTTP API
memento mcp                       # Start MCP server

# AI agent configuration commands
memento setup                     # Configure for AI agents
memento install-skill opencode    # Install skill for OpenCode
memento install-skill claude     # Install skill for Claude
memento install-skill /custom/path # Install skill from custom path
```

**Detailed CLI Commands:**

**`status`** - Quick health check and executive summary:
```bash
$ memento status

╭─ MEMENTO STATUS ──────────────────────────────────────╮
│                                                       │
│  ✅ Database: Healthy (2.4 MB)                       │
│  ✅ WAL Mode: Enabled                                 │
│  ✅ Last Sync: 2m ago                                 │
│                                                       │
│  Observations: 142 (3 deleted)                        │
│  Sessions: 28 (2 active)                              │
│  Recent Activity: 5m ago                              │
│                                                       │
│  Storage: /Users/user/.memento/data                  │
│  Project ID: proj_abc123                              │
│                                                       │
╰───────────────────────────────────────────────────────╯
```

**`recents`** - Show recent observations with relative time:
```bash
$ memento recents --limit 10

Recent Observations:
  • Fix authentication bug (5m ago)
  • Add dark mode support (2h ago)
  • Update API documentation (3h ago)
  • Implement caching layer (yesterday)
  • Refactor database queries (2 days ago)
```

**`install-skill`** - Install Memento AI skill and slash commands:
```bash
# For OpenCode
memento install-skill opencode

# For Claude Desktop
memento install-skill claude

# For custom paths
memento install-skill /custom/path/to/agent
```

### HTTP API

```bash
# Install
bun add @slorenzot/memento-api

# Start API server
memento-api

# Usage examples
curl http://localhost:3000/api/health
curl http://localhost:3000/api/observations
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","type":"decision"}'

# Search
curl http://localhost:3000/api/observations/search?q=test&limit=10

# Sessions
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"projectId":"proj_123","metadata":{"agent":"claude"}}'
```

**Available API Endpoints:**
- `GET /api/health` - Health check
- `GET /api/stats` - System statistics
- `GET /api/config` - Current configuration
- `GET /api/observations` - List observations
- `POST /api/observations` - Create observation
- `GET /api/observations/:id` - Get observation
- `PATCH /api/observations/:id` - Update observation
- `DELETE /api/observations/:id` - Delete observation
- `GET /api/observations/search` - FTS5 search
- `GET /api/observations/timeline` - Timeline
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Web UI

```bash
# Install
bun add @slorenzot/memento-web-ui

# Start web interface
memento-web-ui

# Open http://localhost:5173
```

**Modern Tech Stack:**
- **React 18** - UI framework with modern hooks
- **Vite** - Ultra-fast build tool
- **TanStack Query** - Data fetching with automatic caching
- **Zustand** - Lightweight and fast state management
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Modern and consistent icons
- **Zod** - Data validation with TypeScript

**Web UI Features:**
- Interactive dashboard with real-time statistics
- Instant full-text search
- Timeline visualization
- Session management
- Rich observation editor
- Native dark mode
- Responsive design for mobile and desktop
- Data export in multiple formats

## ⚙️ Configuration

### .mementorc File

Create a `.mementorc` file in your project root or home directory:

```json
{
  "projectId": "my-project-id",
  "storage": {
    "method": "database",
    "path": "~/.memento/data"
  },
  "database": {
    "path": "~/.memento/data/memento.db",
    "walMode": true,
    "ftsEnabled": true
  },
  "api": {
    "port": 3000,
    "host": "localhost"
  },
  "mcp": {
    "port": 3001,
    "host": "localhost"
  },
  "ui": {
    "port": 5173,
    "host": "localhost"
  }
}
```

### Environment Variables

```bash
# Configuration overrides
export MEMENTO_PROJECT_ID="my-project-id"
export MEMENTO_DB_PATH="/custom/path/to/db.db"
export MEMENTO_API_PORT=8080
export MEMENTO_STORAGE_METHOD="database"
```

### Configuration Options

- **projectId** - Unique project identifier (UUID or string)
- **storage.method** - Storage method ("database" or "storage")
- **storage.path** - Storage path (supports relative and absolute paths with ~)
- **database.path** - Path to SQLite database
- **database.walMode** - Enable WAL mode for better performance
- **database.ftsEnabled** - Enable full-text search with FTS5
- **api.port** - API server port
- **mcp.port** - MCP server port
- **ui.port** - Web interface port

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACES                                │
├───────────────┬───────────────────┬───────────────┬─────────────────────┤
│   AI Agents   │     Web UI        │     CLI       │      HTTP API      │
│ (Claude/Cursor)│   (React 18)     │   (Bun CLI)   │   (RESTful API)    │
│   MCP Client  │  (TanStack Query) │ (12+ Commands)│   (Express/Hono)   │
└───────┬───────┴─────────┬─────────┴───────┬───────┴─────────┬─────────┘
        │                 │                 │                 │
        └─────────────────┼─────────────────┼─────────────────┘
                          │                 │
                ┌─────────▼─────────┐ ┌────▼─────────┐
                │   MCP Server      │ │  HTTP Server  │
                │   (15 Tools)      │ │  (REST API)   │
                │   (ASCII Banner)  │ │               │
                └─────────┬─────────┘ └────┬─────────┘
                          │                 │
                          └────────┬────────┘
                                   │
                          ┌────────▼─────────┐
                          │   Core Engine    │
                          │   v1.0.0         │
                          ├──────────────────┤
                          │ • MemoryEngine   │
                          │ • SessionManager │
                          │ • PromptSystem   │
                          │ • ProjectManager │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │  Storage Layer   │
                          ├──────────────────┤
                          │ • SQLite + WAL    │
                          │ • FTS5 + BM25     │
                          │ • UUID Support    │
                          │ • Soft Delete     │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │   File System    │
                          │ (DB + WAL + SHM) │
                          └──────────────────┘
```

## 🧬 Advanced Technical Features

### SQLite Database with FTS5

**Full-Text Search (FTS5):**
```sql
-- FTS5 virtual table for ultra-fast search
CREATE VIRTUAL TABLE observations_fts USING fts5(
  title,
  content,
  content=observations,
  content_rowid=rowid
);

-- BM25 ranking for relevance
SELECT bm25(observations_fts) as rank, *
FROM observations_fts
WHERE observations_fts MATCH 'search query'
ORDER BY rank;
```

**WAL Mode (Write-Ahead Logging):**
- Better performance for read operations
- Improved concurrency (simultaneous reads)
- Greater data durability
- File sizes: Main DB + WAL + SHM

**Database Statistics:**
```bash
$ memento stats

Database Statistics:
  Total Size: 2.4 MB
  Main DB: 1.8 MB
  WAL File: 580 KB
  SHM File: 16 KB

  Observations: 142
    • decision: 45
    • bug: 38
    • discovery: 32
    • note: 27

  Sessions: 28
    • active: 2
    • completed: 26

  Deleted Observations: 3

Performance Metrics:
  Avg Query Time: 12ms
  Search Latency: 45ms
  Cache Hit Rate: 94%
```

### Flexible Metadata System

```typescript
// Observations with flexible metadata
interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note';
  topicKey: string | null;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// Sessions with complete context
interface Session {
  id: number;
  uuid: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
  metadata: Record<string, unknown>;
}

// Prompts for tracking
interface Prompt {
  id: number;
  uuid: string;
  sessionId: number;
  content: string;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}
```

### Soft Delete System

```typescript
// Deleted observations are not permanently removed
// Soft delete implementation with tracking
interface DeletedObservation {
  originalId: number;
  deletedAt: Date;
  reason?: string;
  originalData: Observation;
}

// The system tracks deleted observations
// for possible future recovery
```

### Relative Time Formatting

```typescript
// Smart relative time formatting
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Examples: "just now", "5m ago", "2h ago", "yesterday", "3 days ago"
```

### Health Check System

```typescript
// Complete health check system
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: DatabaseHealth;
  storage: StorageHealth;
  performance: PerformanceHealth;
  checks: CheckResult[];
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
}
```

## ⚡ Performance

### Performance Metrics

**Basic Operations:**
- Create observation: <50ms
- Get observation: <20ms
- Update observation: <40ms
- Delete observation: <30ms

**Search and Queries:**
- Full-text search: <100ms (FTS5 + BM25)
- List observations: <30ms
- Timeline with filters: <80ms
- System statistics: <40ms

**Database:**
- Database size: ~100MB for 10,000 observations
- WAL compression ratio: ~3:1
- Cache hit rate: >90%
- Concurrent connections: Supports multiple readers

**Memory:**
- Base memory: <50MB
- Peak memory: <100MB for intensive use
- Cache storage: Configurable

### Implemented Optimizations

1. **WAL Mode** - Writes don't block reads
2. **Prepared Statements** - Precompiled queries
3. **Indexing** - Indexes on frequently queried columns
4. **Caching** - LRU cache for recent observations
5. **Connection Pooling** - Connection reuse
6. **Lazy Loading** - Lazy loading of large data
7. **Batch Operations** - Batch operations for better performance

## 🔧 Development

### Available Scripts

```bash
# Install dependencies
bun install

# Build all packages
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

### Project Structure

```
memento/
├── packages/
│   ├── core/              # v1.0.0 - Core memory engine
│   │   ├── src/
│   │   │   ├── MemoryEngine.ts
│   │   │   ├── SessionManager.ts
│   │   │   ├── ConfigManager.ts
│   │   │   ├── types.ts
│   │   │   └── db/
│   │   │       └── schema.sql
│   │   └── package.json
│   │
│   ├── mcp-server/        # v1.0.0 - MCP server
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── skills/
│   │   │   └── memento/
│   │   │       └── SKILL.md
│   │   └── package.json
│   │
│   ├── cli/               # v1.0.0 - CLI interface
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── CLI.ts
│   │   └── package.json
│   │
│   ├── api/               # v0.3.0 - HTTP API
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── web-ui/            # v0.1.1 - React web interface
│       ├── src/
│       │   └── (React components)
│       ├── package.json
│       └── vite.config.ts
│
├── apps/
│   └── memento/           # Main application
│
├── tools/                 # Build tools and utilities
│
├── package.json           # Root package.json
├── tsconfig.json          # TypeScript config
├── bun.lockb              # Lockfile
└── README.md              # This file
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific tests
bun test packages/core/src/MemoryEngine.test.ts

# Run in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific tests with filter
bun test -t "memory engine"
```

**Test Structure:**

```typescript
// Unit tests for MemoryEngine
describe('MemoryEngine', () => {
  describe('createObservation', () => {
    it('should create observation successfully');
    it('should validate input data');
    it('should generate UUID automatically');
  });

  describe('search', () => {
    it('should search with FTS5');
    it('should return ranked results with BM25');
    it('should handle empty results');
  });

  describe('session management', () => {
    it('should start session');
    it('should end session');
    it('should track session observations');
  });
});

// Integration tests for MCP server
describe('MCP Server Integration', () => {
  it('should handle mem_save tool');
  it('should handle mem_search tool');
  it('should handle mem_health tool');
  it('should display ASCII banner on startup');
});
```

## 📊 Usage Examples

### Example 1: Create and Search Observations

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const engine = new MemoryEngine({
  dbPath: '~/.memento/data/memento.db'
});

// Create observation
const obs = await engine.createObservation({
  sessionId: 1,
  title: 'Implement JWT authentication',
  content: 'Implement authentication system with JWT tokens',
  type: 'decision',
  topicKey: 'auth',
  projectId: 'my-project',
  metadata: {
    priority: 'high',
    assignee: 'dev-team'
  }
});

// Search observations
const results = await engine.search({
  query: 'JWT authentication',
  limit: 10,
  type: 'decision'
});

console.log(results);
// { observations: [...], total: 5 }
```

### Example 2: Session Management

```typescript
// Start session for AI agent
const session = await engine.createSession({
  projectId: 'my-project',
  endedAt: null,
  metadata: {
    agent: 'claude',
    model: 'claude-3-5-sonnet',
    temperature: 0.7
  }
});

// Create observations in session
await engine.createObservation({
  sessionId: session.id,
  title: 'Architecture decision',
  content: 'Use microservices',
  type: 'decision',
  topicKey: 'architecture',
  projectId: 'my-project',
  metadata: {}
});

// End session
await engine.endSession(session.id);
```

### Example 3: Statistics and Health Check

```typescript
// Get statistics
const result = await engine.search({});

console.log(`Total observations: ${result.total}`);

const byType = result.observations.reduce((acc, obs) => {
  acc[obs.type] = (acc[obs.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('By type:', byType);

// Health check
const isHealthy = engine.isHealthy();
if (!isHealthy) {
  const error = engine.getInitError();
  console.error('Database error:', error);
} else {
  console.log('System is healthy');
}
```

### Example 4: CLI Usage

```bash
# Quick status check
$ memento status

╭─ MEMENTO STATUS ──────────────────────────────────────╮
│  ✅ Database: Healthy (2.4 MB)                       │
│  Observations: 142                                     │
│  Sessions: 28 (2 active)                             │
╰───────────────────────────────────────────────────────╯

# Search recent observations
$ memento recents --limit 5

Recent Observations:
  • Fix authentication bug (5m ago)
  • Add dark mode support (2h ago)
  • Update API documentation (3h ago)
  • Implement caching layer (yesterday)
  • Refactor database queries (2 days ago)

# Advanced search
$ memento search "authentication" --type bug --limit 10

Found 5 observations matching "authentication":
  1. Fix authentication bug (5m ago)
  2. JWT token expiration issue (2h ago)
  3. User login not working (yesterday)
  4. Session management problem (2 days ago)
  5. Permission denied on API access (3 days ago)

# Save new observation
$ memento save "Fix database connection" "Database connection failing after timeout" --type bug

✓ Observation saved successfully

# View timeline
$ memento timeline --limit 20

Timeline:
  2024-01-15
    • Fix authentication bug (5m ago) [bug]
    • Add dark mode support (2h ago) [discovery]
  2024-01-14
    • Update API documentation (3h ago) [note]
    • Implement caching layer (yesterday) [discovery]
```

### Example 5: AI Agent Skill Installation

```bash
# Install for Claude Desktop
$ memento install-skill claude

✓ Memento skill installed for Claude Desktop
📁 Location: ~/Library/Application Support/Claude/claude_desktop_config.json
🔧 Configuration updated

# Install for OpenCode
$ memento install-skill opencode

✓ Memento skill installed for OpenCode
📁 Location: ~/.opencode/skills/memento
🔧 Configuration updated

# View configuration
$ memento config

Current Configuration:
  Project ID: proj_abc123
  Storage: Database
  Database Path: ~/.memento/data/memento.db
  WAL Mode: Enabled
  FTS Enabled: Yes
  API Port: 3000
  MCP Port: 3001
```

## ⚠️ License Restrictions

**PROHIBITED:**
- ❌ Commercial use without explicit authorization
- ❌ Creating forks or modified versions
- ❌ Distributing modified versions
- ❌ Using for commercial or enterprise purposes
- ❌ Forgetting attribution to the original author

**PERMITTED:**
- ✅ Personal and educational use
- ✅ Sharing the original code without modifications
- ✅ Proper attribution to the author (Soulberto Lorenzo)
- ✅ Using for personal non-commercial projects

## 📖 Migration Guide

For upgrading between major versions, see [MIGRATION.md](./MIGRATION.md).

## 📈 Roadmap

### v1.1.0 (Next)
- [ ] Web UI improvements
- [ ] Multi-format export (JSON, CSV, Markdown)
- [ ] Notification system
- [ ] Integration with more AI tools

### v2.0.0 (Future)
- [ ] User system and authentication
- [ ] Multi-tenancy
- [ ] Cloud sync
- [ ] Plugin system
- [ ] GraphQL API

## 👤 Author

**Soulberto Lorenzo**
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 🙏 Acknowledgments

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - For AI agent integration
- [SQLite](https://www.sqlite.org/) - For the database engine
- [Bun](https://bun.sh/) - For the runtime and package manager
- [TypeScript](https://www.typescriptlang.org/) - For type safety
- [Vite](https://vitejs.dev/) - For the Web UI build tool
- [TanStack Query](https://tanstack.com/query) - For data fetching
- [Zustand](https://github.com/pmndrs/zustand) - For state management
- [TailwindCSS](https://tailwindcss.com/) - For styling
- [Lucide](https://lucide.dev/) - For icons
- [Zod](https://zod.dev/) - For data validation

## 📄 License

This project is licensed under **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[View Full License](LICENSE)

---

**⚠️ Remember:** This project has a restrictive license. Please respect the CC BY-NC-ND 4.0 license terms.

**📊 Version:** Core v1.0.0 | MCP Server v1.0.0 | CLI v1.0.0 | API v0.3.0 | Web UI v0.1.1
