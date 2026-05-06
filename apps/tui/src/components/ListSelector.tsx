import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme';

interface ListItem {
  id: number | string;
  label: string;
}

interface ListSelectorProps {
  items: ListItem[];
  selectedIndex: number;
  onSelect: (item: ListItem, index: number) => void;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
}

export function ListSelector({
  items,
  selectedIndex,
  onSelect,
  emptyMessage = 'No items',
  page,
  totalPages,
}: ListSelectorProps) {
  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={item.id}>
            <Text>
              {isSelected ? colors.bold('▶ ') : '  '}
              <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                {item.label}
              </Text>
            </Text>
          </Box>
        );
      })}
      {page !== undefined && totalPages !== undefined && (
        <Box marginTop={1}>
          <Text dimColor>
            {'  '}Page {page}/{totalPages}
          </Text>
        </Box>
      )}
    </Box>
  );
}
