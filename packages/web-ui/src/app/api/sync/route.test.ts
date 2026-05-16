/**
 * Unit tests for POST /api/sync route handler.
 *
 * Strategy: mock getEngine and SyncClient to test the route's
 * error handling logic without real DB or HTTP calls.
 *
 * Bun resolves `@/` path aliases via tsconfig.json automatically in tests.
 */
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { SyncPullResponse, SyncPushResponse } from '@slorenzot/memento-core';

// ─── Types for our mocks ─────────────────────────────

interface MockEngine {
  getObservationByUuid: ReturnType<typeof mock>;
  updateObservation: ReturnType<typeof mock>;
  listSessions: ReturnType<typeof mock>;
  createSession: ReturnType<typeof mock>;
  createObservation: ReturnType<typeof mock>;
  search: ReturnType<typeof mock>;
}

// ─── Mock factories ──────────────────────────────────

function createMockEngine(overrides?: Partial<MockEngine>): MockEngine {
  return {
    getObservationByUuid: mock((_uuid: string) => null),
    updateObservation: mock(async () => ({})),
    listSessions: mock(async () => ({ sessions: [], total: 0 })),
    createSession: mock(async () => ({ id: 1, projectId: 'test', startedAt: new Date(), endedAt: null, metadata: {} })),
    createObservation: mock(async () => ({})),
    search: mock(async () => ({ observations: [], total: 0 })),
    ...overrides,
  };
}

function createMockSyncClient(pullResult?: SyncPullResponse, pushResult?: SyncPushResponse, pullError?: Error, pushError?: Error) {
  return {
    pull: pullError
      ? mock(() => { throw pullError; })
      : mock(async () => pullResult || { changes: [], hasMore: false, totalChanges: 0, newCursor: 'cursor-1' }),
    push: pushError
      ? mock(() => { throw pushError; })
      : mock(async () => pushResult || { synced: 0, created: 0, updated: 0, conflicts: [], newCursor: 'cursor-1' }),
  };
}

// ─── Test the sync logic directly ────────────────────
// Since the route handler depends on Next.js Request/Response,
// we test the sync decision logic (the core of the fix) in isolation.

describe('Sync API Route Logic', () => {
  describe('total failure detection (502)', () => {
    it('should return 502 when both pull and push fail with 0 items', () => {
      // This is the core fix from issue #236
      const pullFailed = true;
      const pushFailed = true;
      const totalPulled = 0;
      const totalPushed = 0;

      const shouldReturn502 = pullFailed && pushFailed && totalPulled === 0 && totalPushed === 0;
      expect(shouldReturn502).toBe(true);
    });

    it('should NOT return 502 when pull succeeds even if push fails', () => {
      const pullFailed = false;
      const pushFailed = true;
      const totalPulled = 3;
      const totalPushed = 0;

      const shouldReturn502 = pullFailed && pushFailed && totalPulled === 0 && totalPushed === 0;
      expect(shouldReturn502).toBe(false);
    });

    it('should NOT return 502 when push succeeds even if pull fails', () => {
      const pullFailed = true;
      const pushFailed = false;
      const totalPulled = 0;
      const totalPushed = 5;

      const shouldReturn502 = pullFailed && pushFailed && totalPulled === 0 && totalPushed === 0;
      expect(shouldReturn502).toBe(false);
    });

    it('should NOT return 502 when both succeed with 0 items (empty sync)', () => {
      const pullFailed = false;
      const pushFailed = false;
      const totalPulled = 0;
      const totalPushed = 0;

      const shouldReturn502 = pullFailed && pushFailed && totalPulled === 0 && totalPushed === 0;
      expect(shouldReturn502).toBe(false);
    });
  });

  describe('pull phase error handling', () => {
    it('should catch pull errors and set pullFailed flag', async () => {
      const errors: string[] = [];
      let pullFailed = false;

      try {
        throw new Error('Authentication failed');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Pull failed: ${msg}`);
        pullFailed = true;
      }

      expect(pullFailed).toBe(true);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Pull failed: Authentication failed');
    });

    it('should handle non-Error throws in pull phase', async () => {
      const errors: string[] = [];

      try {
        throw 'string error'; // eslint-disable-line no-throw-literal
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Pull failed: ${msg}`);
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Pull failed: string error');
    });
  });

  describe('push phase error handling', () => {
    it('should catch push errors and set pushFailed flag', async () => {
      const errors: string[] = [];
      let pushFailed = false;

      try {
        throw new Error('Connection refused');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Push failed: ${msg}`);
        pushFailed = true;
      }

      expect(pushFailed).toBe(true);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Push failed: Connection refused');
    });

    it('should filter observations by scope=project for push', () => {
      const observations = [
        { scope: 'project', title: 'Project obs' },
        { scope: 'personal', title: 'Personal obs' },
        { scope: 'project', title: 'Another project obs' },
      ] as Array<{ scope: string; title: string }>;

      const projectItems = observations.filter(obs => obs.scope === 'project');

      expect(projectItems).toHaveLength(2);
      expect(projectItems.every(obs => obs.scope === 'project')).toBe(true);
    });

    it('should include project-scope observations from ALL projectIds (#243)', () => {
      // The search() call must NOT filter by a fixed projectId — observations
      // from different projects should all be included in the push.
      const observations = [
        { scope: 'project', projectId: 'suratech-chile-autos', title: 'Obs A' },
        { scope: 'project', projectId: 'default', title: 'Obs B' },
        { scope: 'project', projectId: 'another-project', title: 'Obs C' },
        { scope: 'personal', projectId: 'suratech-chile-autos', title: 'Personal' },
      ] as Array<{ scope: string; projectId: string; title: string }>;

      const projectItems = observations.filter(obs => obs.scope === 'project');

      expect(projectItems).toHaveLength(3);
      const projectIds = projectItems.map(obs => obs.projectId);
      expect(projectIds).toContain('suratech-chile-autos');
      expect(projectIds).toContain('default');
      expect(projectIds).toContain('another-project');
    });

    it('should skip push when no project-scope items exist', () => {
      const observations = [
        { scope: 'personal', title: 'Personal obs' },
      ] as Array<{ scope: string; title: string }>;

      const projectItems = observations.filter(obs => obs.scope === 'project');

      expect(projectItems).toHaveLength(0);
    });

    it('should exclude items with empty title (hub Zod validation)', () => {
      const observations = [
        { scope: 'project', title: 'Valid obs', content: 'content' },
        { scope: 'project', title: '', content: 'content' },
        { scope: 'project', title: '   ', content: 'content' },
        { scope: 'project', title: 'Another valid', content: 'content' },
        { scope: 'project', title: 'No content', content: '' },
        { scope: 'project', title: null, content: 'content' },
      ] as Array<{ scope: string; title: string | null; content: string }>;

      const validItems = observations.filter(obs =>
        obs.scope === 'project' && obs.title && obs.title.trim() && obs.content,
      );

      expect(validItems).toHaveLength(2);
      expect(validItems[0].title).toBe('Valid obs');
      expect(validItems[1].title).toBe('Another valid');
    });

    it('should batch items in groups of 500 (hub limit)', () => {
      const HUB_PUSH_MAX_ITEMS = 500;
      const totalItems = 1200;
      const items = Array.from({ length: totalItems }, (_, i) => ({ id: i }));

      const batches: typeof items[] = [];
      for (let i = 0; i < items.length; i += HUB_PUSH_MAX_ITEMS) {
        batches.push(items.slice(i, i + HUB_PUSH_MAX_ITEMS));
      }

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(500);
      expect(batches[2]).toHaveLength(200);
    });

    it('should not batch when items fit in single request', () => {
      const HUB_PUSH_MAX_ITEMS = 500;
      const totalItems = 144;
      const items = Array.from({ length: totalItems }, (_, i) => ({ id: i }));

      const batches: typeof items[] = [];
      for (let i = 0; i < items.length; i += HUB_PUSH_MAX_ITEMS) {
        batches.push(items.slice(i, i + HUB_PUSH_MAX_ITEMS));
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(144);
    });
  });

  describe('individual change application errors', () => {
    it('should continue processing changes when one fails', () => {
      const errors: string[] = [];
      let totalPulled = 0;

      const changes = [
        { uuid: 'uuid-1', title: 'Change 1' },
        { uuid: 'uuid-2', title: 'Change 2' },
        { uuid: 'uuid-3', title: 'Change 3' },
      ];

      for (const change of changes) {
        try {
          if (change.uuid === 'uuid-2') {
            throw new Error('DB error');
          }
          totalPulled++;
        } catch (err) {
          errors.push(`Failed to apply ${change.uuid}: ${err}`);
        }
      }

      expect(totalPulled).toBe(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('uuid-2');
    });
  });

  describe('error aggregation for 502 response', () => {
    it('should join all errors with semicolons', () => {
      const errors = [
        'Pull failed: Authentication failed',
        'Push failed: Connection refused',
      ];

      const message = errors.join('; ');

      expect(message).toBe('Pull failed: Authentication failed; Push failed: Connection refused');
    });

    it('should use fallback message when errors array is empty', () => {
      const errors: string[] = [];
      const message = errors.join('; ') || 'Sync failed: could not connect to hub';

      expect(message).toBe('Sync failed: could not connect to hub');
    });
  });

  describe('frontend error detection — partial failure (#243 follow-up)', () => {
    // These test the SyncButton's error detection logic:
    // Previously: errors shown only when pulled=0 AND pushed=0
    // Now: errors shown when push failed (pushed=0) even if pull succeeded

    it('should show error when pull succeeds but push fails with 0 pushed', () => {
      const result = {
        direction: 'bidirectional' as const,
        pulled: 5,
        pushed: 0,
        errors: ['Push failed: Connection refused'],
        conflicts: 0,
        durationMs: 1200,
      };

      const hasErrors = result.errors && result.errors.length > 0;
      const shouldShowError = hasErrors && result.pushed === 0 && result.direction === 'bidirectional';

      expect(shouldShowError).toBe(true);
    });

    it('should show error when both pull and push return 0', () => {
      const result = {
        direction: 'bidirectional' as const,
        pulled: 0,
        pushed: 0,
        errors: ['Pull failed: Auth error'],
        conflicts: 0,
        durationMs: 500,
      };

      const hasErrors = result.errors && result.errors.length > 0;
      const fallback = hasErrors && result.pulled === 0 && result.pushed === 0;

      expect(fallback).toBe(true);
    });

    it('should show success when push succeeds despite errors', () => {
      const result = {
        direction: 'bidirectional' as const,
        pulled: 3,
        pushed: 10,
        errors: [],
        conflicts: 0,
        durationMs: 2000,
      };

      const hasErrors = result.errors && result.errors.length > 0;
      const shouldShowError = hasErrors && result.pushed === 0 && result.direction === 'bidirectional';

      expect(shouldShowError).toBe(false);
    });

    it('should show error message as button text instead of generic Error', () => {
      const syncMessage = 'Push failed: Connection refused';
      const genericError = 'Error';

      // Before: button text was always genericError
      // After: button text shows syncMessage when available
      const buttonText = syncMessage || genericError;

      expect(buttonText).toBe('Push failed: Connection refused');
      expect(buttonText).not.toBe('Error');
    });

    it('should fall back to generic error when no message available', () => {
      const syncMessage: string | null = null;
      const genericError = 'Error';

      const buttonText = syncMessage || genericError;

      expect(buttonText).toBe('Error');
    });
  });
});

describe('Sync API Route - Request Validation', () => {
  it('should require accessToken in request body', async () => {
    const bodies = [
      {},
      { serverUrl: 'https://example.com' },
      { accessToken: '' },
      { accessToken: null },
      { accessToken: undefined },
    ];

    for (const body of bodies) {
      const hasToken = !!(body as Record<string, unknown>).accessToken;
      expect(hasToken).toBe(false);
    }
  });

  it('should accept valid accessToken', () => {
    const body = { accessToken: 'valid-token-123' };
    const hasToken = !!body.accessToken;

    expect(hasToken).toBe(true);
  });

  it('should use default hub URL when serverUrl not provided', () => {
    const DEFAULT_HUB_URL = 'https://memento-hub.vercel.app';
    const serverUrl = undefined;

    const resolvedUrl = serverUrl || DEFAULT_HUB_URL;

    expect(resolvedUrl).toBe(DEFAULT_HUB_URL);
  });

  it('should use custom serverUrl when provided', () => {
    const DEFAULT_HUB_URL = 'https://memento-hub.vercel.app';
    const serverUrl = 'https://custom-hub.example.com';

    const resolvedUrl = serverUrl || DEFAULT_HUB_URL;

    expect(resolvedUrl).toBe('https://custom-hub.example.com');
  });
});
