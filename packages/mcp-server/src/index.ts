import { MCPServer } from './MCPServer';

const server = new MCPServer();

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
