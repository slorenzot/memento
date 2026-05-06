import React from 'react';
import { Box, Text } from 'ink';
import type { Observation } from '@slorenzot/memento-core';
import { SearchInput } from '../components/SearchInput';
import { HighlightText } from '../components/HighlightText';
import { Badge } from '../components/Badge';
import { truncate, relativeTime } from '../theme';

interface SearchProps {
  query: string;
  results: Observation[];
  total: number;
  selectedIndex: number;
  onQueryChange: (query: string) => void;
  onSelect: (obs: Observation) => void;
}

export function Search({
  query,
  results,
  total,
  selectedIndex,
  onQueryChange,
  onSelect,
}: SearchProps) {
  return (
    <Box flexDirection="column">
      {/* Search input */}
      <SearchInput
        value={query}
        onChange={onQueryChange}
        onSubmit={() => {
          if (results.length > 0) {
            onSelect(results[selectedIndex]);
          }
        }}
        resultCount={total}
      />

      {/* Results */}
      {results.length === 0 && query.length > 0 ? (
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>No results for "{query}"</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {results.map((obs, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={obs.id}>
                <Text>
                  {isSelected ? '▶ ' : '  '}
                  <Text dimColor>#{obs.id}</Text>
                  {' '}
                  <Badge type={obs.type} />
                  {' '}
                  <HighlightText
                    text={obs.title}
                    query={query}
                    maxLength={35}
                  />
                  {' '}
                  <Text dimColor>{truncate(obs.projectId, 12)}</Text>
                  {' '}
                  <Text dimColor>{relativeTime(obs.createdAt)}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
