import type { MemoryEngine, Observation, Session } from '@slorenzot/memento-core';

export interface SessionsService {
  listSessions: (params: {
    projectId?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => Promise<{ sessions: Session[]; total: number }>;
  getSessionObservations: (sessionId: number) => Promise<Observation[]>;
}

/**
 * Creates a sessions service wrapping MemoryEngine's session queries.
 */
export function createSessionsService(engine: MemoryEngine): SessionsService {
  return {
    async listSessions(params) {
      const result = await engine.listSessions(params);
      return result;
    },

    async getSessionObservations(sessionId: number): Promise<Observation[]> {
      const result = await engine.search({
        limit: 100,
        offset: 0,
        includeDeleted: false,
      });
      // Filter by sessionId (MemoryEngine.search doesn't support sessionId filter)
      return result.observations.filter((obs) => obs.sessionId === sessionId);
    },
  };
}
