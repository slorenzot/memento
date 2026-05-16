import { MemoryEngine, GLOBAL_DB_PATH } from '@slorenzot/memento-core';

let engine: MemoryEngine | null = null;

/**
 * Get the MemoryEngine singleton.
 * Uses the centralized DB at ~/.memento/memento.db unless MEMENTO_DB_PATH is set.
 *
 * IMPORTANT: This module must only be imported from Server Components,
 * Route Handlers, or Server Actions — never from client components.
 */
export function getEngine(): MemoryEngine {
  if (!engine) {
    const dbPath = process.env.MEMENTO_DB_PATH || GLOBAL_DB_PATH;
    engine = new MemoryEngine(dbPath);
  }
  return engine;
}
