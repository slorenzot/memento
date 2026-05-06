import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('should render single segment', () => {
    const { lastFrame } = render(<Breadcrumb segments={['Dashboard']} />);

    const output = lastFrame();
    expect(output).toContain('Dashboard');
  });

  it('should render multiple segments with separator', () => {
    const { lastFrame } = render(
      <Breadcrumb segments={['Dashboard', 'Observations', 'Detail']} />
    );

    const output = lastFrame();
    expect(output).toContain('Dashboard');
    expect(output).toContain('Observations');
    expect(output).toContain('Detail');
    expect(output).toContain('›');
  });

  it('should highlight last segment', () => {
    const { lastFrame } = render(
      <Breadcrumb segments={['Dashboard', 'Observations']} />
    );

    const output = lastFrame();
    expect(output).toContain('Observations');
  });
});
