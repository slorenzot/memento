import type { Server } from 'node:http';

import { MemoryEngine } from '@slorenzot/memento-core';

export class APIServer {
  private port: number;
  private memory: MemoryEngine;
  private server: Server | null = null;

  constructor(port: number, dbPath: string) {
    this.port = port;
    this.memory = new MemoryEngine(dbPath);
    this.server = null;
  }

  async start(): Promise<void> {
    // Basic server implementation
    console.log(`API server starting on port ${this.port}`);
    // Placeholder for actual Express server
  }

  close(): void {
    if (this.server) {
      this.server.close();
    }
    this.memory.close();
  }
}
