import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme';

interface StatusBarProps {
  currentView: string;
  keyBindings: string[];
  filters?: {
    type?: string;
    projectId?: string;
    topicKey?: string;
  };
  totalCount?: number;
}

export function StatusBar({ currentView, keyBindings, filters, totalCount }: StatusBarProps) {
  const hasFilters = filters && (filters.type || filters.projectId || filters.topicKey);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray">
      {/* View name + total count */}
      <Box>
        <Text bold color="cyan">
          {currentView.toUpperCase()}
        </Text>
        {totalCount !== undefined && (
          <Text dimColor>
            {' '}
            ({totalCount} items)
          </Text>
        )}
        {hasFilters && (
          <Text dimColor>
            {' | '}Filters: {filters.type ?? ''}{' '}
            {filters.projectId ?? ''}{' '}
            {filters.topicKey ?? ''}
          </Text>
        )}
      </Box>
      {/* Key bindings */}
      <Box>
        <Text dimColor>
          {keyBindings.join(' │ ')}
        </Text>
      </Box>
    </Box>
  );
}
