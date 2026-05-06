import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { ListSelector } from './ListSelector';

describe('ListSelector', () => {
  const items = [
    { id: 1, label: 'First item' },
    { id: 2, label: 'Second item' },
    { id: 3, label: 'Third item' },
  ];

  it('should render all items', () => {
    const { lastFrame } = render(
      <ListSelector
        items={items}
        selectedIndex={0}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('First item');
    expect(output).toContain('Second item');
    expect(output).toContain('Third item');
  });

  it('should highlight selected item with arrow marker', () => {
    const { lastFrame } = render(
      <ListSelector
        items={items}
        selectedIndex={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    // Second item should have a marker indicating selection
    const lines = output.split('\n');
    const selectedLine = lines.find((l) => l.includes('Second item'));
    expect(selectedLine).toBeDefined();
    // The selected line should have a visual marker (▶ or >)
    expect(selectedLine!).toMatch(/[▶>‣]/);
  });

  it('should render empty list message', () => {
    const { lastFrame } = render(
      <ListSelector
        items={[]}
        selectedIndex={0}
        onSelect={() => {}}
        emptyMessage="No items found"
      />
    );

    const output = lastFrame();
    expect(output).toContain('No items found');
  });

  it('should render pagination info when provided', () => {
    const { lastFrame } = render(
      <ListSelector
        items={items}
        selectedIndex={0}
        onSelect={() => {}}
        page={2}
        totalPages={5}
      />
    );

    const output = lastFrame();
    expect(output).toContain('2/5');
  });
});
