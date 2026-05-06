import React from 'react';
import { Box, Text } from 'ink';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  resultCount?: number;
}

export function SearchInput({ value, onChange, onSubmit, resultCount }: SearchInputProps) {
  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text color="cyan" bold>/ </Text>
        <Text>
          {value || ''}
          <Text dimColor>{!value ? 'type to search...' : ''}</Text>
        </Text>
        <Text dimColor>▏</Text>
      </Box>
      {resultCount !== undefined && (
        <Box>
          <Text dimColor>
            {resultCount} result{resultCount !== 1 ? 's' : ''} — Esc to close
          </Text>
        </Box>
      )}
    </Box>
  );
}
