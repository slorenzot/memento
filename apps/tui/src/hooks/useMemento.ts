import { MemoryEngine, resolveDbPath } from '@slorenzot/memento-core';

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
 *   const memento = createMementoConnection(); // uses ~/.memento/memento.db
 *   const memento = createMementoConnection({ dbPath: './custom.db' }); // override
 *   const stats = await memento.engine.getDashboardStats();
 *   memento.close();
 */
export function createMementoConnection(options?: { dbPath?: string }): MementoConnection {
  const dbPath = options?.dbPath ?? resolveDbPath();
  const engine = new MemoryEngine(dbPath);
  const isReady = engine.isHealthy();

  if (isReady) {
    console.error(`✓ Database initialized successfully at: ${dbPath}`);
  }

  return {
    engine,
    isReady,
    close: () => {
      engine.close();
    },
  };
}
