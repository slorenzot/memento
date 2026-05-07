# @slorenzot/memento-cli

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-cli.svg)](https://www.npmjs.com/package/@slorenzot/memento-cli)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

> Command line interface for Memento memory system with search, management, and administrative commands for AI coding agents.

## 🚀 Installation

```bash
# Using Bun (recommended)
bun add -g @slorenzot/memento-cli

# Using npm
npm install -g @slorenzot/memento-cli

# Using yarn
yarn global add @slorenzot/memento-cli
```

## 💡 Basic Usage

### Shell/Bun
```bash
# Show general help
memento --help

# Show version
memento --version
```

## 🔧 Available Commands

### Main Commands

#### `search [query]`
Searches observations in memory using full-text search.

**Parameters:**
- `query` (optional): Search text

**Options:**
- `--type, -t`: Filter by type (`decision|bug|discovery|note`)
- `--project, -p`: Filter by project ID
- `--limit, -l`: Maximum number of results
- `--offset, -o`: Pagination offset

**Examples:**
```bash
# Simple search
memento search "database architecture"

# Filtered search
memento search "configuration" --type decision --limit 5

# Search in specific project
memento search "bug" --project my-app --type bug
```

---

#### `save [title] [content]`
Saves a new observation to memory.

**Parameters:**
- `title`: Observation title
- `content`: Observation content

**Options:**
- `--type, -t`: Observation type (`decision|bug|discovery|note`)
- `--topic, -k`: Topic or category
- `--project, -p`: Project ID
- `--metadata, -m`: JSON metadata

**Examples:**
```bash
# Save simple observation
memento save "Important decision" "Use PostgreSQL in production"

# Save with type and project
memento save "Bug found" "Connection error" --type bug --project my-app

# Save with metadata
memento save "Configuration complete" "Server ready" --metadata '{"status":"ready","port":3000}'
```

---

#### `get [id]`
Gets a specific observation by ID.

**Parameters:**
- `id`: Numeric ID of the observation

**Examples:**
```bash
# Get observation by ID
memento get 123

# Output will show all observation details
```

---

#### `update <id> [options]`
Updates an existing observation.

**Parameters:**
- `id`: Numeric ID of the observation

**Options:**
- `--title, -t`: New title
- `--content, -c`: New content
- `--type`: New type
- `--topic, -k`: New topic

**Examples:**
```bash
# Update title
memento update 123 --title "Corrected title"

# Update content
memento update 123 --content "Updated content"

# Update multiple fields
memento update 123 --title "New" --type decision
```

---

#### `delete <id>`
Deletes an observation by ID.

**Parameters:**
- `id`: Numeric ID of the observation

**Examples:**
```bash
# Delete observation
memento delete 123
```

---

### Session Commands

#### `session start [project]`
Starts a new tracking session.

**Parameters:**
- `project` (optional): Project ID

**Examples:**
```bash
# Start session
memento session start my-app
```

---

#### `session end <id>`
Ends an active session.

**Parameters:**
- `id`: Numeric ID of the session

**Examples:**
```bash
# End session
memento session end 456
```

---

#### `session list [project]`
Lists project sessions.

**Parameters:**
- `project` (optional): Project ID

**Options:**
- `--limit, -l`: Maximum number of results

**Examples:**
```bash
# List all sessions
memento session list

# List sessions for specific project
memento session list my-app --limit 10
```

---

### Utility Commands

#### `stats`
Shows memory system statistics.

**Examples:**
```bash
# View statistics
memento stats

# Expected output:
# Total observations: 150
# By type: decision: 45, bug: 30, discovery: 50, note: 25
# Active sessions: 3
# Last update: 2024-04-04 10:30:00
```

---

#### `timeline [project]`
Shows a chronological timeline of observations.

**Parameters:**
- `project` (optional): Project ID

**Options:**
- `--limit, -l`: Maximum number of results
- `--session, -s`: Filter by session ID

**Examples:**
```bash
# View full timeline
memento timeline

# View timeline for specific project
memento timeline my-app --limit 20
```

---

## 📝 Programmatic API

### Node.js/TypeScript Usage

```typescript
import { CLI } from '@slorenzot/memento-cli';

// Create CLI instance
const cli = new CLI('./data/memento.db');

// Execute command programmatically
// Note: This usage is for custom integration
// For normal usage, use shell commands

// Main commands are executed through the run() method
cli.run(['search', 'architecture']);

// Close connection
cli.close();
```

## ⚡ Practical Examples

### Example 1: Complete Workflow

```bash
# Start session for tracking
SESSION_ID=$(memento session start my-app | grep "ID:" | cut -d' ' -f2)
echo "Session started: $SESSION_ID"

# Save observations during work
memento save "Architecture decision" "Use microservices" --project my-app
memento save "Bug found" "Authentication error" --type bug --project my-app

# Search for previous decisions
memento search "architecture" --type decision --project my-app

# End session
memento session end $SESSION_ID
```

### Example 2: Search and Analysis Script

```bash
#!/bin/bash

# Search for project bugs
echo "=== Searching for project bugs ==="
memento search "bug" --type bug --project my-app --limit 10

# Search for recent decisions
echo ""
echo "=== Recent decisions ==="
memento search --type decision --project my-app --limit 5

# Show statistics
echo ""
echo "=== System statistics ==="
memento stats
```

### Example 3: Git Hooks Integration

```bash
# pre-commit hook
#!/bin/bash

# Save commits as observations
MESSAGE=$(git log -1 --pretty=%B)
memento save "Commit: $(git rev-parse --short HEAD)" "$MESSAGE" --type note

echo "Commit saved to Memento"
```

### Example 4: Export and Backup

```bash
# Export project observations
memento timeline my-app --limit 1000 > backup-observations.txt

# Create backup with metadata
echo "Backup created: $(date)" > backup-info.txt
memento stats >> backup-info.txt
```

## 🔧 Configuration

### Configuration File

The CLI looks for configuration in `~/.memento/config.json`:

```json
{
  "databasePath": "./data/memento.db",
  "defaultProject": "my-app",
  "outputFormat": "json",
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

### Environment Variables

- `MEMENTO_DB_PATH`: Custom database path
- `MEMENTO_DEFAULT_PROJECT`: Default project

**Examples:**
```bash
# Use custom database
export MEMENTO_DB_PATH="/custom/path/database.db"
memento search "query"
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
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Progress indicators
- `ink` - Terminal UI components
- `zod` - Schema validation

### Peer Dependencies
- `bun` v1.0+ (recommended)
- `node` v20+ (compatible)

## 🛠️ Development

```bash
# Clone the project
git clone https://github.com/slorenzot/memento.git
cd memento/packages/cli

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
- **Fixed**: Improved CLI argument handling
- **Updated**: Command output optimization

### [0.1.0] - 2024-04-04
- **Added**: Initial CLI version
- **Added**: Memory management commands
- **Added**: Search and statistics commands
- **Added**: Full color and progress support

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
