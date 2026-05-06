import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { MiniBar } from './MiniBar';

describe('MiniBar', () => {
  it('should render label', () => {
    const { lastFrame } = render(
      <MiniBar label="project-a" values={{ decision: 5, bug: 3, discovery: 2, note: 10 }} total={20} />
    );

    const output = lastFrame();
    expect(output).toContain('project-a');
  });

  it('should render total count', () => {
    const { lastFrame } = render(
      <MiniBar label="test" values={{ decision: 5, bug: 3, discovery: 2, note: 10 }} total={20} />
    );

    const output = lastFrame();
    expect(output).toContain('20');
  });

  it('should render bar characters', () => {
    const { lastFrame } = render(
      <MiniBar label="test" values={{ decision: 5, bug: 3, discovery: 2, note: 10 }} total={20} />
    );

    const output = lastFrame();
    // Bar should contain block characters
    expect(output).toMatch(/[█░▓▒]/);
  });

  it('should render empty bar when no values', () => {
    const { lastFrame } = render(
      <MiniBar label="empty" values={{ decision: 0, bug: 0, discovery: 0, note: 0 }} total={0} />
    );

    const output = lastFrame();
    expect(output).toContain('empty');
  });
});
