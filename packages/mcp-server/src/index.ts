#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId, normalizeProjectId } from '@slorenzot/memento-core';
import { registerTools } from './tools.js';
import type { McpServerContext } from './tools.js';

// ─── Configuration ──────────────────────────────────────────

const config = loadConfig();
const dbPath = resolveDbPath(config);
const projectId = getProjectId(config);

const engine = new MemoryEngine(dbPath);
if (engine.isHealthy()) {
  console.error(`✓ Database initialized successfully at: ${dbPath}`);
  // Register canonical project in projects table (Issue #177)
  engine.registerProject(projectId, process.cwd());
} else {
  const initError = engine.getInitError();
  console.error(`✗ Failed to initialize database at ${dbPath}:`, initError?.message);
  console.error('  The server will start but database operations will fail until this is resolved.');
}

const ctx: McpServerContext = {
  engine,
  projectId,
  dbPath,
  activeSessionId: null,
};

const server = new McpServer({
  name: 'memento',
  version: '1.0.0',
});

registerTools(server, ctx);

// ─── Server Startup ─────────────────────────────────────────
const BANNER = `
 ╔══════════════════════════════════════════════════╗
 ║                                                  ║
 ║     MEMENTO — Persistent Memory System           ║
 ║                                                  ║
 ║     Version: 1.0.0                               ║
 ║     MCP Server: memento                          ║
 ║     Storage: SQLite Persistent                   ║
 ║     Tools: mem_*                         ║
 ║                                                  ║
 ╚══════════════════════════════════════════════════╝
`;

async function main() {
  console.error(BANNER);

  if (!engine.isHealthy()) {
    const initError = engine.getInitError();
    console.error('\n⚠️  WARNING: Database initialization failed');
    console.error(`   Error: ${initError?.message || 'Unknown error'}`);
    console.error(`   Database path: ${dbPath}`);
    console.error('\n   The server will start, but database operations will fail.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('\n✓ Memento MCP Server started successfully');
  console.error(`  Database: ${dbPath}`);
  console.error(`  Project: ${projectId}`);
  console.error(`  Health: ${engine.isHealthy() ? '✓ Healthy' : '✗ Unhealthy'}`);
  console.error(`  Tools: 16 (mem_*)`);
  console.error(`  Ready to accept connections...\n`);
}

main().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
