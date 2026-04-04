import { APIServer } from './APIServer';

const port = parseInt(process.env.API_PORT || '3000', 10);
const dbPath = process.env.DATABASE_PATH || './data/memento.db';

const server = new APIServer(port, dbPath);

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

server.start().catch((error: Error) => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});
