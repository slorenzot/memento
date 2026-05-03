import React from 'react';
import { Box, Text } from 'ink';
import type { Observation } from '@slorenzot/memento-core';
import { Badge } from '../components/Badge';
import { colors, truncate, relativeTime, layout } from '../theme';

interface ObservationsListProps {
  observations: Observation[];
  total: number;
  selectedIndex: number;
  page: number;
  totalPages: number;
  onSelect: (obs: Observation) => void;
  filters?: {
    type?: string;
    projectId?: string;
  };
}

export function ObservationsList({
  observations,
  total,
  selectedIndex,
  page,
  totalPages,
  onSelect,
}: ObservationsListProps) {
  if (observations.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text dimColor>No observations found</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* List items */}
      {observations.map((obs, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={obs.id}>
            <Text>
              {isSelected ? colors.bold('▶ ') : '  '}
              <Text dimColor>#{obs.id}</Text>
              {' '}
              <Badge type={obs.type} />
              {' '}
              <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                {truncate(obs.title, layout.maxTitleLength)}
              </Text>
              {' '}
              <Text dimColor>{truncate(obs.projectId, 15)}</Text>
              {' '}
              <Text dimColor>{relativeTime(obs.createdAt)}</Text>
            </Text>
          </Box>
        );
      })}

      {/* Pagination */}
      <Box marginTop={1}>
        <Text dimColor>
          {'  '}Page {page}/{totalPages} — {total} total
        </Text>
      </Box>
    </Box>
  );
}
