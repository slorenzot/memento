import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { HighlightText } from './HighlightText';

describe('HighlightText', () => {
  it('should render text without query unchanged', () => {
    const { lastFrame } = render(<HighlightText text="Hello world" query="" />);

    const output = lastFrame();
    expect(output).toContain('Hello world');
  });

  it('should render full text with query present', () => {
    const { lastFrame } = render(<HighlightText text="Fixed N+1 query in UserList" query="query" />);

    const output = lastFrame();
    expect(output).toContain('Fixed N+1 query in UserList');
  });

  it('should render even when query is not found in text', () => {
    const { lastFrame } = render(<HighlightText text="Hello world" query="xyz" />);

    const output = lastFrame();
    expect(output).toContain('Hello world');
  });

  it('should handle case-insensitive matching', () => {
    const { lastFrame } = render(<HighlightText text="HELLO world" query="hello" />);

    const output = lastFrame();
    expect(output).toContain('HELLO');
  });

  it('should truncate long text', () => {
    const longText = 'A'.repeat(200);
    const { lastFrame } = render(<HighlightText text={longText} query="" maxLength={50} />);

    const output = lastFrame();
    // Should be truncated, not full 200 chars
    expect(output!.length).toBeLessThan(200);
  });
});
