import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('should render prompt with cursor', () => {
    const { lastFrame } = render(
      <SearchInput value="" onChange={() => {}} onSubmit={() => {}} />
    );

    const output = lastFrame();
    expect(output).toContain('/');
  });

  it('should render current value', () => {
    const { lastFrame } = render(
      <SearchInput value="test query" onChange={() => {}} onSubmit={() => {}} />
    );

    const output = lastFrame();
    expect(output).toContain('test query');
  });

  it('should render placeholder when empty', () => {
    const { lastFrame } = render(
      <SearchInput value="" onChange={() => {}} onSubmit={() => {}} />
    );

    const output = lastFrame();
    expect(output).toContain('type to search');
  });

  it('should render result count when provided', () => {
    const { lastFrame } = render(
      <SearchInput
        value="query"
        onChange={() => {}}
        onSubmit={() => {}}
        resultCount={5}
      />
    );

    const output = lastFrame();
    expect(output).toContain('5');
  });
});
