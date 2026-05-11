import { MemoryEngine } from '@slorenzot/memento-core';

let engine: MemoryEngine | null = null;

/**
 * Get the MemoryEngine singleton.
 * Uses the default db path (./data/memento.db) unless MEMENTO_DB_PATH is set.
 *
 * IMPORTANT: This module must only be imported from Server Components,
 * Route Handlers, or Server Actions — never from client components.
 */
export function getEngine(): MemoryEngine {
  if (!engine) {
    const dbPath = process.env.MEMENTO_DB_PATH || './data/memento.db';
    engine = new MemoryEngine(dbPath);
  }
  return engine;
}
