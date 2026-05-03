import { MemoryEngine } from '@slorenzot/memento-core';

export interface MementoConnection {
  engine: MemoryEngine;
  isReady: boolean;
  close: () => void;
}

/**
 * Creates a Memento engine connection.
 *
 * This is NOT a React hook — it's a plain factory function.
 * MemoryEngine initializes synchronously, so no async/state needed.
 *
 * Usage:
 *   const memento = createMementoConnection({ dbPath: './data/memento.db' });
 *   const stats = await memento.engine.getDashboardStats();
 *   memento.close();
 */
export function createMementoConnection(options?: { dbPath?: string }): MementoConnection {
  const dbPath = options?.dbPath ?? './data/memento.db';
  const engine = new MemoryEngine(dbPath);
  const isReady = engine.isHealthy();

  return {
    engine,
    isReady,
    close: () => {
      engine.close();
    },
  };
}
