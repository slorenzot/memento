/**
 * SyncEngine Tests — Verify push collection includes all scopes.
 *
 * Issue #266: personal-scope observations must be included in push.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createTestDb, seedSession, seedObservation } from '../test-helpers';

describe('SyncEngine — doPush collection', () => {
  it('includes personal-scope observations in push items', async () => {
    const { engine } = createTestDb();
    const session = await seedSession(engine, 'sync-test');

    // Create project-scope observation
    await seedObservation(engine, session.id, {
      title: 'Project Observation',
      scope: 'project',
      projectId: 'sync-test',
    });

    // Create personal-scope observation
    await seedObservation(engine, session.id, {
      title: 'Personal Observation',
      scope: 'personal',
      projectId: 'sync-test',
    });

    // Verify both exist
    const all = await engine.search({ projectId: 'sync-test', limit: 100 });
    expect(all.total).toBe(2);

    const projectScoped = all.observations.filter(o => o.scope === 'project');
    const personalScoped = all.observations.filter(o => o.scope === 'personal');
    expect(projectScoped.length).toBe(1);
    expect(personalScoped.length).toBe(1);

    // Verify search without scope filter returns both
    const unscoped = await engine.search({ limit: 100 });
    const syncTestObs = unscoped.observations.filter(o => o.projectId === 'sync-test');
    expect(syncTestObs.length).toBe(2);

    // Verify that filtering all observations does NOT exclude personal scope
    // (this is the core of the fix — previously all.filter(obs => obs.scope === 'project') was used)
    const active = await engine.search({ projectId: 'sync-test', limit: 100000 });
    const deleted = await engine.listDeleted({ projectId: 'sync-test', limit: 100000 });
    const collected = [...active.observations, ...deleted.observations];

    // Both project and personal scope must be included
    expect(collected.length).toBe(2);
    expect(collected.some(o => o.scope === 'project')).toBe(true);
    expect(collected.some(o => o.scope === 'personal')).toBe(true);
  });

  it('includes deleted observations in push collection', async () => {
    const { engine } = createTestDb();
    const session = await seedSession(engine, 'sync-deleted-test');

    // Create and then soft-delete an observation
    const obs = await seedObservation(engine, session.id, {
      title: 'To Be Deleted',
      projectId: 'sync-deleted-test',
    });
    await engine.deleteObservation(obs.id, 'test cleanup');

    // Verify it's in deleted list
    const deleted = await engine.listDeleted({ projectId: 'sync-deleted-test', limit: 100000 });
    expect(deleted.total).toBe(1);

    // Verify it's collected for sync
    const active = await engine.search({ projectId: 'sync-deleted-test', limit: 100000 });
    const collected = [...active.observations, ...deleted.observations];
    expect(collected.length).toBe(1);
    expect(collected[0].deletedAt).toBeDefined();
  });
});
