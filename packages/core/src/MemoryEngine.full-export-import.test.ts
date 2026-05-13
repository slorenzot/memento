import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import * as crypto from 'crypto';
import { MemoryEngine } from './MemoryEngine';
import {
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
} from './test-helpers';
import type { FullExportData } from './types';

describe('Full Export/Import (v2.0)', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'test-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── listPrompts() ──────────────────────────────────────────

  describe('listPrompts()', () => {
    it('should return empty list when no prompts exist', async () => {
      const result = await engine.listPrompts({ projectId: 'test-project' });
      expect(result.prompts).toBeInstanceOf(Array);
      expect(result.prompts.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should list prompts for a project', async () => {
      // Insert a prompt directly
      engine.db.prepare(
        'INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), sessionId, 'Test prompt content', 'test-project', Date.now(), '{}');

      const result = await engine.listPrompts({ projectId: 'test-project' });
      expect(result.total).toBe(1);
      expect(result.prompts[0].content).toBe('Test prompt content');
      expect(result.prompts[0].projectId).toBe('test-project');
    });

    it('should filter prompts by sessionId', async () => {
      const session2 = await seedSession(engine, 'test-project');

      engine.db.prepare(
        'INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), sessionId, 'Prompt 1', 'test-project', Date.now(), '{}');
      engine.db.prepare(
        'INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), session2.id, 'Prompt 2', 'test-project', Date.now(), '{}');

      const result = await engine.listPrompts({ sessionId: sessionId });
      expect(result.total).toBe(1);
      expect(result.prompts[0].content).toBe('Prompt 1');
    });
  });

  // ─── exportProject() ────────────────────────────────────────

  describe('exportProject()', () => {
    it('should export all data types for a project', async () => {
      // Seed data
      await seedObservation(engine, sessionId, {
        title: 'Export Obs 1',
        content: 'Content 1',
        type: 'decision',
        topicKey: 'arch/export',
      });
      await seedObservation(engine, sessionId, {
        title: 'Export Obs 2',
        content: 'Content 2',
        type: 'bug',
      });

      // Seed journal
      await engine.writeJournal({
        projectId: 'test-project',
        sessionId,
        title: 'Journal Entry 1',
        body: 'Body of journal entry',
        tags: ['debugging', 'perf'],
        model: 'sonnet',
        provider: 'anthropic',
      });

      // Seed prompt
      engine.db.prepare(
        'INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), sessionId, 'Prompt content', 'test-project', Date.now(), '{}');

      const exported = await engine.exportProject('test-project');

      // Validate structure
      expect(exported.version).toBe('2.0');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.source.project).toBe('test-project');
      expect(exported.source.allProjects).toBe(false);

      // Validate stats
      expect(exported.stats.totalObservations).toBe(2);
      expect(exported.stats.totalSessions).toBeGreaterThanOrEqual(1);
      expect(exported.stats.totalPrompts).toBe(1);
      expect(exported.stats.totalJournalEntries).toBe(1);

      // Validate observations
      expect(exported.observations).toBeInstanceOf(Array);
      expect(exported.observations.length).toBe(2);
      expect(exported.observations[0].uuid).toBeDefined();
      expect(exported.observations[0].scope).toBe('project');
      expect(exported.observations[0].pinned).toBe(false);
      expect(exported.observations[0].readOnly).toBe(false);
      expect(exported.observations[0].revisionCount).toBe(0);

      // Validate sessions
      expect(exported.sessions).toBeInstanceOf(Array);
      expect(exported.sessions[0].uuid).toBeDefined();

      // Validate journal
      expect(exported.journal).toBeInstanceOf(Array);
      expect(exported.journal[0].tags).toEqual(['debugging', 'perf']);
      expect(exported.journal[0].model).toBe('sonnet');

      // Validate prompts
      expect(exported.prompts).toBeInstanceOf(Array);
      expect(exported.prompts[0].content).toBe('Prompt content');
    });

    it('should export project even if not in projects table', async () => {
      const exported = await engine.exportProject('nonexistent-project');
      expect(exported.stats.totalObservations).toBe(0);
      expect(exported.projects[0].name).toBe('nonexistent-project');
    });

    it('should handle journal supersedes via UUID', async () => {
      const entry1 = await engine.writeJournal({
        projectId: 'test-project',
        sessionId,
        title: 'Original Entry',
        body: 'Original body',
        tags: ['test'],
      });
      const entry2 = await engine.writeJournal({
        projectId: 'test-project',
        sessionId,
        title: 'Corrected Entry',
        body: 'Corrected body',
        tags: ['test'],
        supersedes: entry1.id,
      });

      const exported = await engine.exportProject('test-project');
      expect(exported.journal.length).toBe(2);

      // Find the superseded entry
      const supersededEntry = exported.journal.find(j => j.uuid === entry1.uuid);
      const correctedEntry = exported.journal.find(j => j.uuid === entry2.uuid);

      expect(supersededEntry).toBeDefined();
      expect(correctedEntry).toBeDefined();
      expect(correctedEntry!.supersededByUuid).toBeNull(); // It supersedes, not is superseded
      // The superseded entry doesn't have supersededByUuid set in our export
      // (supersededBy is on the newer entry pointing to older)
    });

    it('should export deleted observations when includeDeleted', async () => {
      const obs = await seedObservation(engine, sessionId, {
        title: 'To Delete',
        content: 'Will be deleted',
        type: 'note',
      });
      await engine.deleteObservation(obs.id, { reason: 'test' });

      const exported = await engine.exportProject('test-project');
      expect(exported.stats.totalObservations).toBe(1);
      expect(exported.observations[0].deletedAt).not.toBeNull();
    });
  });

  // ─── importProject() ────────────────────────────────────────

  describe('importProject()', () => {
    it('should import all data types into a new project', async () => {
      const importData: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'source-project', allProjects: false },
        stats: { totalProjects: 1, totalSessions: 1, totalObservations: 2, totalPrompts: 1, totalJournalEntries: 1 },
        projects: [{ name: 'source-project', createdAt: new Date().toISOString(), metadata: {} }],
        sessions: [{ uuid: crypto.randomUUID(), projectId: 'source-project', startedAt: new Date().toISOString(), endedAt: null, metadata: {} }],
        observations: [
          { uuid: crypto.randomUUID(), title: 'Imported Obs 1', content: 'Content 1', type: 'decision', topicKey: 'arch/import', projectId: 'source-project', scope: 'project', pinned: false, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: {} },
          { uuid: crypto.randomUUID(), title: 'Imported Obs 2', content: 'Content 2', type: 'bug', topicKey: null, projectId: 'source-project', scope: 'personal', pinned: true, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: { source: 'test' } },
        ],
        prompts: [{ uuid: crypto.randomUUID(), content: 'Imported prompt', projectId: 'source-project', createdAt: new Date().toISOString(), metadata: {} }],
        journal: [{ uuid: crypto.randomUUID(), title: 'Journal Entry', body: 'Journal body', tags: ['import', 'test'], projectId: 'source-project', model: null, provider: null, agent: null, supersededByUuid: null, invalidatedAt: null, metadata: {}, createdAt: new Date().toISOString() }],
      };

      const result = await engine.importProject(importData, { projectId: 'target-project' });

      expect(result.imported.projects).toBe(1);
      expect(result.imported.sessions).toBe(1);
      expect(result.imported.observations).toBe(2);
      expect(result.imported.prompts).toBe(1);
      expect(result.imported.journalEntries).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors.length).toBe(0);

      // Verify observations were actually created
      const searchResult = await engine.search({ projectId: 'target-project' });
      expect(searchResult.total).toBe(2);
      // Search returns DESC by default, so verify both exist
      const titles = searchResult.observations.map(o => o.title);
      expect(titles).toContain('Imported Obs 1');
      expect(titles).toContain('Imported Obs 2');

      // Verify pinned observation
      const pinnedObs = searchResult.observations.find(o => o.title === 'Imported Obs 2');
      expect(pinnedObs?.pinned).toBe(true);
      expect(pinnedObs?.scope).toBe('personal');
      expect(pinnedObs?.metadata).toEqual({ source: 'test' });
    });

    it('should handle dry run without creating data', async () => {
      const importData: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'dry-run-project', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 1, totalPrompts: 0, totalJournalEntries: 0 },
        projects: [],
        sessions: [],
        observations: [
          { uuid: crypto.randomUUID(), title: 'Dry Run Obs', content: 'Content', type: 'note', topicKey: null, projectId: 'dry-run', scope: 'project', pinned: false, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: {} },
        ],
        prompts: [],
        journal: [],
      };

      const result = await engine.importProject(importData, { projectId: 'target', dryRun: true });

      expect(result.imported.observations).toBe(1);

      // Verify nothing was actually created
      const searchResult = await engine.search({ projectId: 'target' });
      expect(searchResult.total).toBe(0);
    });

    it('should skip duplicate observations by UUID', async () => {
      const uuid = crypto.randomUUID();

      // First import
      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'p1', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 1, totalPrompts: 0, totalJournalEntries: 0 },
        projects: [],
        sessions: [],
        observations: [
          { uuid, title: 'Original', content: 'Content', type: 'note', topicKey: null, projectId: 'p1', scope: 'project', pinned: false, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: {} },
        ],
        prompts: [],
        journal: [],
      };

      const result1 = await engine.importProject(data, { projectId: 'dup-test' });
      expect(result1.imported.observations).toBe(1);

      // Second import with same UUID
      data.observations[0].title = 'Updated';
      const result2 = await engine.importProject(data, { projectId: 'dup-test' });
      expect(result2.skipped.observations).toBe(1);
      expect(result2.imported.observations).toBe(0);
    });

    it('should overwrite duplicate observations when conflictStrategy=overwrite', async () => {
      const uuid = crypto.randomUUID();

      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'p1', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 1, totalPrompts: 0, totalJournalEntries: 0 },
        projects: [],
        sessions: [],
        observations: [
          { uuid, title: 'Original', content: 'Content', type: 'note', topicKey: null, projectId: 'p1', scope: 'project', pinned: false, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: {} },
        ],
        prompts: [],
        journal: [],
      };

      await engine.importProject(data, { projectId: 'overwrite-test' });

      data.observations[0].title = 'Overwritten';
      const result = await engine.importProject(data, { projectId: 'overwrite-test', conflictStrategy: 'overwrite' });

      expect(result.overwritten.observations).toBe(1);

      // Verify title was updated
      const searchResult = await engine.search({ projectId: 'overwrite-test' });
      expect(searchResult.observations[0].title).toBe('Overwritten');
    });

    it('should import journal entries with tags', async () => {
      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'p1', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 0, totalPrompts: 0, totalJournalEntries: 2 },
        projects: [],
        sessions: [],
        observations: [],
        prompts: [],
        journal: [
          { uuid: crypto.randomUUID(), title: 'Entry 1', body: 'Body 1', tags: ['a', 'b'], projectId: 'p1', model: 'sonnet', provider: 'anthropic', agent: 'test', supersededByUuid: null, invalidatedAt: null, metadata: {}, createdAt: new Date().toISOString() },
          { uuid: crypto.randomUUID(), title: 'Entry 2', body: 'Body 2', tags: ['c'], projectId: 'p1', model: null, provider: null, agent: null, supersededByUuid: null, invalidatedAt: null, metadata: {}, createdAt: new Date().toISOString() },
        ],
      };

      const result = await engine.importProject(data, { projectId: 'journal-test' });

      expect(result.imported.journalEntries).toBe(2);

      // Verify journal was created with tags
      const journalResult = await engine.searchJournal({ projectId: 'journal-test' });
      expect(journalResult.total).toBe(2);

      const entry1 = journalResult.entries.find(e => e.title === 'Entry 1');
      expect(entry1?.tags).toEqual(['a', 'b']);
      expect(entry1?.model).toBe('sonnet');
      expect(entry1?.agent).toBe('test');
    });

    it('should import journal supersedes references via UUID', async () => {
      const uuid1 = crypto.randomUUID();
      const uuid2 = crypto.randomUUID();

      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'p1', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 0, totalPrompts: 0, totalJournalEntries: 2 },
        projects: [],
        sessions: [],
        observations: [],
        prompts: [],
        journal: [
          { uuid: uuid1, title: 'Original', body: 'Body 1', tags: [], projectId: 'p1', model: null, provider: null, agent: null, supersededByUuid: null, invalidatedAt: null, metadata: {}, createdAt: new Date().toISOString() },
          { uuid: uuid2, title: 'Corrected', body: 'Body 2', tags: [], projectId: 'p1', model: null, provider: null, agent: null, supersededByUuid: uuid1, invalidatedAt: null, metadata: {}, createdAt: new Date().toISOString() },
        ],
      };

      const result = await engine.importProject(data, { projectId: 'supersedes-test' });
      expect(result.imported.journalEntries).toBe(2);

      // Verify supersedes relationship
      const journalResult = await engine.searchJournal({ projectId: 'supersedes-test' });
      const corrected = journalResult.entries.find(e => e.title === 'Corrected');
      expect(corrected).toBeDefined();

      const original = journalResult.entries.find(e => e.title === 'Original');
      expect(corrected!.supersededBy).toBe(original!.id);
    });

    it('should reject invalid observation types', async () => {
      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'p1', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 1, totalPrompts: 0, totalJournalEntries: 0 },
        projects: [],
        sessions: [],
        observations: [
          { uuid: crypto.randomUUID(), title: 'Bad Type', content: 'Content', type: 'invalid_type' as any, topicKey: null, projectId: 'p1', scope: 'project', pinned: false, readOnly: false, revisionCount: 0, createdAt: new Date().toISOString(), deletedAt: null, metadata: {} },
        ],
        prompts: [],
        journal: [],
      };

      const result = await engine.importProject(data, { projectId: 'invalid-test' });
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid type');
    });

    it('should handle empty data gracefully', async () => {
      const data: FullExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        source: { project: 'empty', allProjects: false },
        stats: { totalProjects: 0, totalSessions: 0, totalObservations: 0, totalPrompts: 0, totalJournalEntries: 0 },
        projects: [],
        sessions: [],
        observations: [],
        prompts: [],
        journal: [],
      };

      const result = await engine.importProject(data);
      expect(result.imported.observations).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should throw on missing version', async () => {
      const data = {} as FullExportData;
      expect(engine.importProject(data)).rejects.toThrow('missing version');
    });
  });

  // ─── Round-trip: export → import ────────────────────────────

  describe('Round-trip export → import', () => {
    it('should preserve all data through export-import cycle', async () => {
      // Seed comprehensive data
      await seedObservation(engine, sessionId, {
        title: 'RT Obs 1',
        content: 'Content with special chars: <>&"\'',
        type: 'decision',
        topicKey: 'arch/rt-test',
      });

      await engine.writeJournal({
        projectId: 'test-project',
        sessionId,
        title: 'RT Journal',
        body: 'Journal body',
        tags: ['round-trip'],
        model: 'sonnet',
        provider: 'anthropic',
      });

      engine.db.prepare(
        'INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), sessionId, 'RT Prompt', 'test-project', Date.now(), '{}');

      // Export from source engine
      const exported = await engine.exportProject('test-project');

      // Import into a SEPARATE engine (clean DB) to avoid UUID conflicts
      const targetCtx = createTestDb();
      const targetEngine = targetCtx.engine;

      try {
        const result = await targetEngine.importProject(exported, { projectId: 'rt-target' });

        expect(result.imported.observations).toBe(1);
        expect(result.imported.journalEntries).toBe(1);
        expect(result.imported.prompts).toBe(1);
        expect(result.failed).toBe(0);

        // Verify data integrity
        const imported = await targetEngine.search({ projectId: 'rt-target' });
        expect(imported.observations[0].title).toBe('RT Obs 1');
        expect(imported.observations[0].content).toContain('<>&"\'');
        expect(imported.observations[0].topicKey).toBe('arch/rt-test');
      } finally {
        targetEngine.close();
      }
    });
  });
});
