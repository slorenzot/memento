import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { SplitPane } from './SplitPane';

describe('SplitPane', () => {
  it('should render both panels', () => {
    const { lastFrame } = render(
      <SplitPane
        left={<Text>Left Panel</Text>}
        right={<Text>Right Panel</Text>}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Left Panel');
    expect(output).toContain('Right Panel');
  });

  it('should render border between panels', () => {
    const { lastFrame } = render(
      <SplitPane
        left={<Text>Left</Text>}
        right={<Text>Right</Text>}
      />
    );

    const output = lastFrame();
    // Box with border produces ─ or │ characters
    expect(output).toContain('│');
  });

  it('should indicate focused panel', () => {
    const { lastFrame } = render(
      <SplitPane
        left={<Text>Left</Text>}
        right={<Text>Right</Text>}
        focus="left"
      />
    );

    const output = lastFrame();
    expect(output).toContain('LEFT'); // Focused panel header is highlighted
  });

  it('should render with right focus', () => {
    const { lastFrame } = render(
      <SplitPane
        left={<Text>Left</Text>}
        right={<Text>Right</Text>}
        focus="right"
      />
    );

    const output = lastFrame();
    expect(output).toContain('RIGHT');
  });
});
