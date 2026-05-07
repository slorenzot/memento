# @slorenzot/memento-mcp-server

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-mcp-server.svg)](https://www.npmjs.com/package/@slorenzot/memento-mcp-server)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io)

> Model Context Protocol (MCP) server providing 15 memory tools for AI agent integration with Claude Desktop, VS Code, and other MCP clients.

## 🚀 Installation

```bash
# Using Bun (recommended)
bun add @slorenzot/memento-mcp-server

# Using npm
npm install @slorenzot/memento-mcp-server
```

## 💡 Basic Usage

### TypeScript
```typescript
import { MCPServer } from '@slorenzot/memento-mcp-server';

// Initialize MCP server
const server = new MCPServer('./data/memento.db');

// Start server (uses stdio for MCP communication)
// Note: This server is designed to be executed by MCP clients
// No need to call start() manually in production
```

### Shell/Bun
```bash
# Run MCP server (recommended)
npx -p @slorenzot/memento-mcp-server

# Or using bunx (if installed globally)
bunx @slorenzot/memento-mcp-server

# Use with custom database path environment variable
MEMENTO_DB_PATH=/custom/path/database.db npx -p @slorenzot/memento-mcp-server
```

## 🔧 Core API

### Main Class

#### `MCPServer(dbPath?: string)`

MCP server constructor with automatic memory engine integration.

**Parameters:**
- `dbPath` (optional): Path to the database file. Default: `'./data/memento.db'`

**Example:**
```typescript
const server = new MCPServer('./custom/path.db');
```

---

#### Control Methods

##### `start()`

Starts the MCP server and begins listening for MCP requests via stdio.

**Returns:** `Promise<void>`

**Note:** This method is called automatically when the server starts as a standalone process.

---

##### `close()`

Stops the MCP server and closes the database connection.

**Returns:** `void`

**Example:**
```typescript
const server = new MCPServer();

// On cleanup or shutdown
server.close();
```

---

## 🛠️ Available MCP Tools

The server provides 15 MCP tools for memory management:

### Observation Management

#### `mem_save`
Saves a new observation to memory.

**Parameters:**
```typescript
{
  title: string;
  content: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  topic_key?: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
}
```

**Usage example:**
```typescript
await mem_save({
  title: 'Architecture decision',
  content: 'Use PostgreSQL instead of MySQL',
  type: 'decision',
  project_id: 'my-project'
});
```

---

#### `mem_search`
Searches observations using full-text search.

**Parameters:**
```typescript
{
  query?: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  project_id?: string;
  topic_key?: string;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_get_observation`
Gets a specific observation by ID.

**Parameters:**
```typescript
{
  id: number;
}
```

---

#### `mem_update`
Updates an existing observation.

**Parameters:**
```typescript
{
  id: number;
  title?: string;
  content?: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  topic_key?: string;
  metadata?: Record<string, unknown>;
}
```

---

#### `mem_delete`
Deletes an observation by ID.

**Parameters:**
```typescript
{
  id: number;
}
```

---

### Session Management

#### `mem_session_start`
Starts a new session for conversation tracking.

**Parameters:**
```typescript
{
  project_id: string;
  metadata?: Record<string, unknown>;
}
```

---

#### `mem_session_end`
Ends an active session.

**Parameters:**
```typescript
{
  id: number;
}
```

---

#### `mem_list_sessions`
Lists all sessions for a project.

**Parameters:**
```typescript
{
  project_id?: string;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_get_session`
Gets a specific session.

**Parameters:**
```typescript
{
  id: number;
}
```

---

### Utility Tools

#### `mem_timeline`
Gets a chronological timeline of observations.

**Parameters:**
```typescript
{
  project_id?: string;
  session_id?: number;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_stats`
Gets memory system statistics.

**Returns:** Usage metrics, totals by type, etc.

---

#### `mem_import`
Imports observations from JSON.

**Parameters:**
```typescript
{
  data: Array<{
    title: string;
    content: string;
    type?: string;
    project_id?: string;
  }>;
}
```

---

#### `mem_export`
Exports observations to JSON.

**Parameters:**
```typescript
{
  project_id?: string;
  type?: string;
  limit?: number;
}
```

---

### System Tools

#### `mem_health`
Checks the memory system health status.

**Returns:** Connection status, database health, etc.

---

#### `mem_config`
Gets the current server configuration.

**Returns:** Path configuration, version, etc.

---

## ⚡ Practical Examples

### Example 1: Claude Desktop Integration

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "node_modules/@slorenzot/memento-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "./data/memento.db"
      }
    }
  }
}
```

### Example 2: Programmatic Server Usage

```typescript
import { MCPServer } from '@slorenzot/memento-mcp-server';

// Create custom server
const server = new MCPServer('./memory.db');

// The server will automatically handle MCP requests
// when executed by an MCP client

// For manual control (testing)
const toolResult = await server.handleToolCall('mem_save', {
  title: 'Test observation',
  content: 'Test content',
  type: 'note',
  project_id: 'test-project'
});

console.log('Result:', toolResult);

// Close when done
server.close();
```

### Example 3: Complete Session Workflow

```typescript
// Using MCP tools through the server

// 1. Start session
const sessionStart = await mem_session_start({
  project_id: 'my-app',
  metadata: { agent: 'claude' }
});

console.log('Session started:', sessionStart.id);

// 2. Save observations during work
await mem_save({
  title: 'Configuration complete',
  content: 'Server configured on port 3000',
  type: 'decision',
  project_id: 'my-app'
});

// 3. Search for previous decisions
const searchResults = await mem_search({
  query: 'server configuration',
  type: 'decision'
});

console.log('Decisions found:', searchResults.observations);

// 4. End session
await mem_session_end({ id: sessionStart.id });

// 5. Get statistics
const stats = await mem_stats();
console.log('Total observations:', stats.total);
console.log('By type:', stats.by_type);
```

## 🔗 MCP Client Integration

### Claude Desktop
```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": [
        "run",
        "node_modules/@slorenzot/memento-mcp-server/dist/index.js"
      ],
      "env": {
        "DATABASE_PATH": "${userHome}/.memento/database.db"
      }
    }
  }
}
```

### VS Code (with MCP extension)
```json
{
  "mcp.servers": {
    "memento": {
      "command": "bun",
      "args": [
        "run",
        "node_modules/@slorenzot/memento-mcp-server/dist/index.js"
      ]
    }
  }
}
```

## ⚠️ Restrictive License

This package is under **CC BY-NC-ND 4.0 License**:
- ✅ **Personal and educational use permitted**
- ✅ **Share with attribution to the author**
- ❌ **Commercial use NOT permitted**
- ❌ **Modifications or forks NOT permitted**

**Author:** Soulberto Lorenzo (slorenzot@gmail.com)

## 🔄 Dependencies

### Main Dependencies
- `@slorenzot/memento-core` - Memory engine
- `@modelcontextprotocol/sdk` - Model Context Protocol SDK
- `zod` - Schema validation

### Peer Dependencies
- `bun` v1.0+ (recommended)
- `node` v20+ (compatible)

## 🛠️ Development

```bash
# Clone the project
git clone https://github.com/slorenzot/memento.git
cd memento/packages/mcp-server

# Install dependencies
bun install

# Development
bun run dev

# Build
bun run build

# Tests
bun test
```

## 📋 Changelog

### [0.1.1] - 2024-04-04
- **Fixed**: Core dependency updates
- **Fixed**: deleteObservation method correction
- **Updated**: Improved parameter validation

### [0.1.0] - 2024-04-04
- **Added**: Initial MCP server version
- **Added**: 15 memory management tools
- **Added**: Full Model Context Protocol integration
- **Added**: Claude Desktop and VS Code support

## 👤 Author

**Soulberto Lorenzo**
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 📄 License

This package is licensed under **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[View Full License](https://github.com/slorenzot/memento/blob/main/LICENSE)

---

**⚠️ Important:** This package has a restrictive license. Please respect the CC BY-NC-ND 4.0 license terms.

**[📖 Spanish version (Versión en español)](./README.es.md)**
