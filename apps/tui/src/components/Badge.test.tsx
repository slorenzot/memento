import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Badge } from './Badge';

describe('Badge', () => {
  it('should render the type name', () => {
    const { lastFrame } = render(<Badge type="decision" />);

    const output = lastFrame();
    expect(output).toContain('decision');
  });

  it('should render with icon prefix', () => {
    const { lastFrame } = render(<Badge type="bug" />);

    const output = lastFrame();
    expect(output).toContain('✖');
    expect(output).toContain('bug');
  });

  it('should render all four types', () => {
    const types = ['decision', 'bug', 'discovery', 'note'] as const;

    for (const type of types) {
      const { lastFrame } = render(<Badge type={type} />);
      const output = lastFrame();
      expect(output).toContain(type);
    }
  });

  it('should render soft-deleted indicator when deleted=true', () => {
    const { lastFrame } = render(<Badge type="note" deleted />);

    const output = lastFrame();
    expect(output).toContain('DELETED');
  });

  it('should not show DELETED when deleted is false', () => {
    const { lastFrame } = render(<Badge type="note" deleted={false} />);

    const output = lastFrame();
    expect(output).not.toContain('DELETED');
  });
});
