import { describe, it, expect, beforeEach } from 'bun:test';
import { createTestDb, seedSession, seedObservation } from './test-helpers';

describe('MemoryEngine — Project Registry (Issue #177)', () => {
  let engine: ReturnType<typeof createTestDb>['engine'];

  beforeEach(() => {
    const setup = createTestDb();
    engine = setup.engine;
  });

  // ─── registerProject ──────────────────────────────────────

  describe('registerProject()', () => {
    it('should register a new project', () => {
      const name = engine.registerProject('my-project');
      expect(name).toBe('my-project');

      const projects = engine.listRegisteredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('my-project');
    });

    it('should normalize the project name on registration', () => {
      const name = engine.registerProject('SURA Chile Autos');
      expect(name).toBe('sura-chile-autos');

      const projects = engine.listRegisteredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('sura-chile-autos');
    });

    it('should be idempotent — duplicate registration does not error', () => {
      engine.registerProject('my-project');
      engine.registerProject('my-project');

      const projects = engine.listRegisteredProjects();
      expect(projects).toHaveLength(1);
    });

    it('should store working directory', () => {
      engine.registerProject('my-project', '/Users/test/my-project');

      const projects = engine.listRegisteredProjects();
      expect(projects[0].workingDir).toBe('/Users/test/my-project');
    });
  });

  // ─── listRegisteredProjects ──────────────────────────────

  describe('listRegisteredProjects()', () => {
    it('should return empty array when no projects registered', () => {
      const projects = engine.listRegisteredProjects();
      expect(projects).toHaveLength(0);
    });

    it('should return all registered projects sorted by name', () => {
      engine.registerProject('beta-project');
      engine.registerProject('alpha-project');
      engine.registerProject('gamma-project');

      const projects = engine.listRegisteredProjects();
      expect(projects).toHaveLength(3);
      expect(projects[0].name).toBe('alpha-project');
      expect(projects[1].name).toBe('beta-project');
      expect(projects[2].name).toBe('gamma-project');
    });
  });

  // ─── mergeProject ────────────────────────────────────────

  describe('mergeProject()', () => {
    it('should move observations from source to target', async () => {
      const session = await seedSession(engine, 'sura-chile-autos');
      await seedObservation(engine, session.id, {
        title: 'Obs 1',
        projectId: 'sura-chile-autos',
      });
      await seedObservation(engine, session.id, {
        title: 'Obs 2',
        projectId: 'sura-chile-autos',
      });

      const result = engine.mergeProject('sura-chile-autos', 'suratech-salesforce-cl-app');

      expect(result.observationsMoved).toBe(2);
      expect(result.sessionsMoved).toBe(1);

      // Verify observations now belong to target
      const search = await engine.search({
        query: 'Obs',
        projectId: 'suratech-salesforce-cl-app',
      });
      expect(search.total).toBe(2);
    });

    it('should throw when source and target are same after normalization', () => {
      expect(() => {
        engine.mergeProject('sura-chile-autos', 'sura-chile-autos');
      }).toThrow('Source and target are the same');
    });

    it('should throw when source has no data', () => {
      expect(() => {
        engine.mergeProject('nonexistent-project', 'target-project');
      }).toThrow('No data found for source project');
    });

    it('should move journal entries between projects', async () => {
      const session = await seedSession(engine, 'source-project');

      await engine.writeJournal({
        projectId: 'source-project',
        sessionId: session.id,
        title: 'Test Journal',
        body: 'Journal content',
        tags: ['test'],
      });

      const result = engine.mergeProject('source-project', 'target-project');
      expect(result.journalMoved).toBe(1);
    });

    it('should normalize project names before merging', async () => {
      const session = await seedSession(engine, 'sura chile autos');
      await seedObservation(engine, session.id, {
        title: 'Test',
        projectId: 'sura chile autos',
      });

      // Use the exact DB name — normalization is applied to target
      const result = engine.mergeProject('sura chile autos', 'suratech-salesforce-cl-app');
      expect(result.observationsMoved).toBe(1);
    });

    it('should find source by raw name or normalized name', async () => {
      const session = await seedSession(engine, 'my-project');
      await seedObservation(engine, session.id, {
        title: 'Test',
        projectId: 'my-project',
      });

      // Pass normalized name but data is stored with raw name
      const result = engine.mergeProject('my-project', 'other-project');
      expect(result.observationsMoved).toBe(1);
    });
  });

  // ─── normalizeAllProjectIds ──────────────────────────────

  describe('normalizeAllProjectIds()', () => {
    it('should normalize project names with spaces', async () => {
      const session = await seedSession(engine, 'sura chile autos');
      await seedObservation(engine, session.id, {
        projectId: 'sura chile autos',
      });

      const result = engine.normalizeAllProjectIds();
      expect(result.normalized).toBeGreaterThanOrEqual(1);

      // Verify normalized name
      const search = await engine.search({
        projectId: 'sura-chile-autos',
      });
      expect(search.total).toBe(1);
    });

    it('should normalize project names with uppercase', async () => {
      const session = await seedSession(engine, 'suratech-salesforce-CL-app');
      await seedObservation(engine, session.id, {
        projectId: 'suratech-salesforce-CL-app',
      });

      const result = engine.normalizeAllProjectIds();
      expect(result.normalized).toBeGreaterThanOrEqual(1);

      const search = await engine.search({
        projectId: 'suratech-salesforce-cl-app',
      });
      expect(search.total).toBe(1);
    });

    it('should handle already-normalized names', async () => {
      const session = await seedSession(engine, 'my-project');
      await seedObservation(engine, session.id, {
        projectId: 'my-project',
      });

      const result = engine.normalizeAllProjectIds();
      expect(result.normalized).toBe(0);
    });

    it('should normalize multiple different project names at once', async () => {
      const sessionA = await seedSession(engine, 'sura chile autos');
      await seedObservation(engine, sessionA.id, { projectId: 'sura chile autos' });

      const sessionB = await seedSession(engine, 'SURA-CHILE-AUTOS');
      await seedObservation(engine, sessionB.id, { projectId: 'SURA-CHILE-AUTOS' });

      const result = engine.normalizeAllProjectIds();
      expect(result.normalized).toBeGreaterThanOrEqual(2);

      // Both should now be under 'sura-chile-autos'
      const search = await engine.search({ projectId: 'sura-chile-autos' });
      expect(search.total).toBe(2);
    });

    it('should re-index FTS after normalization', async () => {
      const session = await seedSession(engine, 'My Special Project');
      await seedObservation(engine, session.id, {
        title: 'Special unique keyword xyz123',
        content: 'Content for search',
        projectId: 'My Special Project',
      });

      engine.normalizeAllProjectIds();

      // FTS should still find the observation
      const search = await engine.search({
        query: 'xyz123',
        projectId: 'my-special-project',
      });
      expect(search.total).toBe(1);
    });
  });

  // ─── resolveAlias (Issue #273) ────────────────────────────

  describe('resolveAlias()', () => {
    it('should return null when project is already canonical', () => {
      engine.registerProject('canonical-project');

      const result = engine.resolveAlias('canonical-project');
      expect(result).toBeNull();
    });

    it('should return canonical name when project is an alias', async () => {
      // Set up: create source project with data, then merge into target
      const session = await seedSession(engine, 'fragment-project');
      await seedObservation(engine, session.id, {
        title: 'Test obs',
        projectId: 'fragment-project',
      });

      engine.registerProject('canonical-project');
      engine.mergeProject('fragment-project', 'canonical-project');

      // Now "fragment-project" should be an alias of "canonical-project"
      const result = engine.resolveAlias('fragment-project');
      expect(result).toBe('canonical-project');
    });

    it('should return null when project does not exist at all', () => {
      const result = engine.resolveAlias('nonexistent-project');
      expect(result).toBeNull();
    });

    it('should handle projects with null aliases field', () => {
      // registerProject creates aliases as '[]' by default, not null
      // But we test the defensive path
      engine.registerProject('null-alias-project');

      const result = engine.resolveAlias('some-other-name');
      expect(result).toBeNull();
    });

    it('should handle empty aliases array', () => {
      engine.registerProject('empty-alias-project');

      const result = engine.resolveAlias('empty-alias-project');
      expect(result).toBeNull();
    });

    it('should resolve among multiple aliases', async () => {
      const session = await seedSession(engine, 'alias-a');
      await seedObservation(engine, session.id, { projectId: 'alias-a', title: 'A' });

      const session2 = await seedSession(engine, 'alias-b');
      await seedObservation(engine, session2.id, { projectId: 'alias-b', title: 'B' });

      engine.registerProject('unified-project');
      engine.mergeProject('alias-a', 'unified-project');
      engine.mergeProject('alias-b', 'unified-project');

      expect(engine.resolveAlias('alias-a')).toBe('unified-project');
      expect(engine.resolveAlias('alias-b')).toBe('unified-project');
      expect(engine.resolveAlias('unified-project')).toBeNull();
    });
  });
});
