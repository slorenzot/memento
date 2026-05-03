import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { ScrollableContent } from './ScrollableContent';

describe('ScrollableContent', () => {
  const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`);

  it('should render content', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={lines} scrollOffset={0} visibleLines={10} />
    );

    const output = lastFrame();
    expect(output).toContain('Line 1');
  });

  it('should respect scroll offset', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={lines} scrollOffset={5} visibleLines={10} />
    );

    const output = lastFrame();
    // Should show lines starting from offset 5
    expect(output).toContain('Line 6');
    // Should NOT show lines before offset (exact match with newline or start)
    expect(output).not.toContain('Line 1\n');
  });

  it('should show scroll indicator when content overflows', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={lines} scrollOffset={0} visibleLines={5} />
    );

    const output = lastFrame();
    // Should have a scroll indicator (showing position)
    expect(output).toContain('↓');
  });

  it('should render empty content', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={[]} scrollOffset={0} visibleLines={10} />
    );

    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it('should show at beginning indicator when at top', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={lines} scrollOffset={0} visibleLines={5} />
    );

    const output = lastFrame();
    expect(output).toContain('TOP');
  });

  it('should show end indicator when at bottom', () => {
    const { lastFrame } = render(
      <ScrollableContent lines={lines} scrollOffset={15} visibleLines={5} />
    );

    const output = lastFrame();
    expect(output).toContain('END');
  });
});
