/**
 * descriptions.unit.test.ts — Validates MCP tool metadata quality.
 *
 * Ensures every tool has:
 * - A meaningful description (not just a label)
 * - Correct MCP annotations (readOnlyHint, destructiveHint, idempotentHint)
 * - All parameters have .describe() with non-empty text
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createIntegrationSetup, type IntegrationSetup } from './helpers';

describe('Tool Metadata Quality', () => {
  let setup: IntegrationSetup;

  beforeEach(async () => {
    setup = await createIntegrationSetup();
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  // ─── Tool Count ───────────────────────────────────────────

  it('should register exactly 26 tools', async () => {
    const result = await setup.client.listTools();
    expect(result.tools).toHaveLength(26);
  });

  // ─── Tool Names ───────────────────────────────────────────

  it('should register all expected tool names', async () => {
    const result = await setup.client.listTools();
    const names = result.tools.map((t) => t.name).sort();

    const expected = [
      'mem_capture_passive',
      'mem_config',
      'mem_context',
      'mem_delete',
      'mem_export',
      'mem_get_observation',
      'mem_get_session',
      'mem_health',
      'mem_journal_read',
      'mem_journal_search',
      'mem_journal_write',
      'mem_list_deleted',
      'mem_list_sessions',
      'mem_merge',
      'mem_purge',
      'mem_restore',
      'mem_save',
      'mem_save_prompt',
      'mem_search',
      'mem_session_end',
      'mem_session_start',
      'mem_session_summary',
      'mem_stats',
      'mem_suggest_topic_key',
      'mem_timeline',
      'mem_update',
    ].sort();

    expect(names).toEqual(expected);
  });

  // ─── Description Quality ──────────────────────────────────

  it('every tool should have a description longer than 50 characters', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      expect(tool.description).toBeDefined();
      expect(tool.description!.length).toBeGreaterThan(
        50,
        `${tool.name} description is too short: "${tool.description}"`
      );
    }
  });

  it('every tool description should contain "Returns:" hint', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      expect(tool.description).toContain(
        'Returns:',
        `${tool.name} description should document return format`
      );
    }
  });

  // ─── Annotations ──────────────────────────────────────────

  it('should have a title annotation on every tool', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      expect(tool.annotations?.title).toBeDefined();
      expect(tool.annotations!.title!.length).toBeGreaterThan(0);
    }
  });

  const READ_ONLY_TOOLS = [
    'mem_search',
    'mem_get_observation',
    'mem_list_deleted',
    'mem_list_sessions',
    'mem_get_session',
    'mem_context',
    'mem_suggest_topic_key',
    'mem_timeline',
    'mem_stats',
    'mem_health',
    'mem_config',
    'mem_export',
    'mem_journal_read',
    'mem_journal_search',
  ];

  it('read-only tools should have readOnlyHint: true', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      if (READ_ONLY_TOOLS.includes(tool.name)) {
        expect(tool.annotations?.readOnlyHint).toBe(
          true,
          `${tool.name} should be readOnlyHint: true`
        );
      } else {
        expect(tool.annotations?.readOnlyHint).toBe(
          false,
          `${tool.name} should be readOnlyHint: false`
        );
      }
    }
  });

  const DESTRUCTIVE_TOOLS = ['mem_delete', 'mem_purge', 'mem_merge'];

  it('destructive tools should have destructiveHint: true', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      if (DESTRUCTIVE_TOOLS.includes(tool.name)) {
        expect(tool.annotations?.destructiveHint).toBe(
          true,
          `${tool.name} should be destructiveHint: true`
        );
      } else {
        expect(tool.annotations?.destructiveHint).toBe(
          false,
          `${tool.name} should be destructiveHint: false`
        );
      }
    }
  });

  // ─── Parameter Descriptions ───────────────────────────────

  it('every parameter should have a description', async () => {
    const result = await setup.client.listTools();

    for (const tool of result.tools) {
      const properties = (tool.inputSchema as any)?.properties;
      if (!properties) continue;

      for (const [paramName, paramDef] of Object.entries(properties)) {
        expect((paramDef as any).description).toBeDefined();
        expect(
          (paramDef as any).description.length
        ).toBeGreaterThan(
          0,
          `${tool.name}.${paramName} should have a description`
        );
      }
    }
  });

  // ─── Cross-Tool References ────────────────────────────────

  it('mem_search should mention mem_get_observation for full content', async () => {
    const result = await setup.client.listTools();
    const search = result.tools.find((t) => t.name === 'mem_search');
    expect(search!.description).toContain('mem_get_observation');
  });

  it('mem_delete should mention mem_restore and mem_purge', async () => {
    const result = await setup.client.listTools();
    const del = result.tools.find((t) => t.name === 'mem_delete');
    expect(del!.description).toContain('mem_restore');
    expect(del!.description).toContain('mem_purge');
  });

  it('mem_purge should mention mem_list_deleted', async () => {
    const result = await setup.client.listTools();
    const purge = result.tools.find((t) => t.name === 'mem_purge');
    expect(purge!.description).toContain('mem_list_deleted');
  });

  it('mem_merge should mention dry_run', async () => {
    const result = await setup.client.listTools();
    const merge = result.tools.find((t) => t.name === 'mem_merge');
    expect(merge!.description).toContain('dry_run');
  });

  it('mem_timeline should differentiate from mem_search', async () => {
    const result = await setup.client.listTools();
    const timeline = result.tools.find((t) => t.name === 'mem_timeline');
    expect(timeline!.description).toContain('mem_search');
  });
});
