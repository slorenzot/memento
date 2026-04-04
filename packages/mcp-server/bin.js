#!/usr/bin/env node
const { MCPServer } = require('./index.js');

// Get database path from environment or use default
const dbPath = process.env.MEMENTO_DB_PATH || './data/memento.db';

// Create and start the MCP server
const server = new MCPServer(dbPath);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down MCP server...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down MCP server...');
  server.close();
  process.exit(0);
});

console.error('Memento MCP Server starting...');
// Note: The actual MCP communication happens via stdio
// which is handled by the MCP client that spawns this process