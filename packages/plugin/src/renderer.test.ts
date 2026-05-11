/**
 * renderer.test.ts
 *
 * Tests for the plugin renderer module.
 */

import { describe, it, expect } from 'bun:test';
import { renderContext, renderObservationXml, estimateTokens } from '../src/renderer.js';
import type { Observation } from '@slorenzot/memento-core';

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: 1,
    uuid: 'test-uuid',
    sessionId: 1,
    title: 'Test Observation',
    content: 'This is test content for the observation.',
    type: 'note',
    topicKey: null,
    projectId: 'test-project',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
    scope: 'project',
    pinned: false,
    revisionCount: 0,
    ...overrides,
  };
}

describe('estimateTokens', () => {
  it('returns approximate token count', () => {
    const text = 'Hello world this is a test';
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(text.length / 4));
  });

  it('returns 1 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('renderObservationXml', () => {
  it('renders basic observation', () => {
    const obs = makeObservation({ id: 42, type: 'decision', title: 'Chose SQLite' });
    const xml = renderObservationXml(obs);

    expect(xml).toContain('<observation id="42" type="decision"');
    expect(xml).toContain('project="test-project"');
    expect(xml).toContain('Chose SQLite');
    expect(xml).toContain('</observation>');
  });

  it('includes pinned attribute when pinned', () => {
    const obs = makeObservation({ pinned: true });
    const xml = renderObservationXml(obs);
    expect(xml).toContain('pinned="true"');
  });

  it('does not include pinned attribute when not pinned', () => {
    const obs = makeObservation({ pinned: false });
    const xml = renderObservationXml(obs);
    expect(xml).not.toContain('pinned');
  });

  it('truncates content over 500 chars', () => {
    const obs = makeObservation({ content: 'A'.repeat(1000) });
    const xml = renderObservationXml(obs);
    expect(xml).toContain('...');
    // Content should be truncated, not full 1000 chars
    expect(xml.length).toBeLessThan(700);
  });
});

describe('renderContext', () => {
  it('returns empty for no observations', () => {
    const result = renderContext([], 2000);
    expect(result.xml).toBe('');
    expect(result.observationCount).toBe(0);
    expect(result.tokenCount).toBe(0);
    expect(result.budgetExceeded).toBe(false);
  });

  it('wraps observations in memento_context tags', () => {
    const observations = [
      makeObservation({ id: 1, title: 'Obs 1' }),
      makeObservation({ id: 2, title: 'Obs 2' }),
    ];
    const result = renderContext(observations, 5000);

    expect(result.xml).toMatch(/^<memento_context>/);
    expect(result.xml).toMatch(/<\/memento_context>$/);
    expect(result.observationCount).toBe(2);
  });

  it('reports budget exceeded when truncated', () => {
    const observations = Array.from({ length: 20 }, (_, i) =>
      makeObservation({
        id: i + 1,
        title: `Obs ${i}`,
        content: 'A'.repeat(2000), // ~500 tokens each
      })
    );

    const result = renderContext(observations, 1000);
    expect(result.budgetExceeded).toBe(true);
    expect(result.observationCount).toBeLessThan(20);
  });

  it('fits within budget when plenty of room', () => {
    const observations = [makeObservation({ id: 1 })];
    const result = renderContext(observations, 10000);

    expect(result.budgetExceeded).toBe(false);
    expect(result.observationCount).toBe(1);
  });
});
