import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { ProjectsList } from './ProjectsList';
import type { ProjectStats } from '@slorenzot/memento-core';

const mockProjects: ProjectStats[] = [
  {
    name: 'project-alpha',
    activeCount: 25,
    deletedCount: 3,
    lastActivity: new Date(),
    byType: { decision: 10, bug: 5, discovery: 3, note: 7 },
  },
  {
    name: 'project-beta',
    activeCount: 12,
    deletedCount: 0,
    lastActivity: new Date(),
    byType: { decision: 4, bug: 2, discovery: 2, note: 4 },
  },
];

describe('ProjectsList', () => {
  it('should render project names', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={mockProjects}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('project-alpha');
    expect(output).toContain('project-beta');
  });

  it('should render active count', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={mockProjects}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('25');
    expect(output).toContain('12');
  });

  it('should render deleted count', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={mockProjects}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('3');
  });

  it('should highlight selected project', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={mockProjects}
        selectedIndex={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('▶');
  });

  it('should render mini bar for type distribution', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={mockProjects}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    // MiniBar uses block characters
    expect(output).toMatch(/[█░]/);
  });

  it('should render empty list', () => {
    const { lastFrame } = render(
      <ProjectsList
        projects={[]}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No projects');
  });
});
