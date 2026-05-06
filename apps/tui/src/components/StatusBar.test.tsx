import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('should render view name', () => {
    const { lastFrame } = render(
      <StatusBar currentView="dashboard" keyBindings={['q: quit']} />
    );

    const output = lastFrame();
    expect(output).toContain('DASHBOARD');
  });

  it('should render key bindings', () => {
    const { lastFrame } = render(
      <StatusBar
        currentView="observations"
        keyBindings={['j/k: navigate', 'q: quit', '/: search']}
      />
    );

    const output = lastFrame();
    expect(output).toContain('j/k: navigate');
    expect(output).toContain('q: quit');
    expect(output).toContain('/: search');
  });

  it('should render active filters when provided', () => {
    const { lastFrame } = render(
      <StatusBar
        currentView="observations"
        keyBindings={['q: quit']}
        filters={{ type: 'bug', projectId: 'my-project' }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('bug');
    expect(output).toContain('my-project');
  });

  it('should not show filter section when no filters', () => {
    const { lastFrame } = render(
      <StatusBar currentView="dashboard" keyBindings={['q: quit']} />
    );

    const output = lastFrame();
    expect(output).not.toContain('Filters:');
  });

  it('should render total count when provided', () => {
    const { lastFrame } = render(
      <StatusBar
        currentView="observations"
        keyBindings={['q: quit']}
        totalCount={42}
      />
    );

    const output = lastFrame();
    expect(output).toContain('42');
  });
});
