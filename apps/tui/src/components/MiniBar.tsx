import React from 'react';
import { Box, Text } from 'ink';
import { TYPE_COLORS } from '../theme';

interface MiniBarProps {
  label: string;
  values: Record<string, number>;
  total: number;
  width?: number;
}

/**
 * Renders a horizontal mini bar chart showing type distribution.
 * Uses block characters: █ for filled, ░ for empty.
 */
export function MiniBar({ label, values, total, width = 20 }: MiniBarProps) {
  if (total === 0) {
    return (
      <Box>
        <Text dimColor>{label}: </Text>
        <Text dimColor>{'░'.repeat(width)} 0</Text>
      </Box>
    );
  }

  const types = ['decision', 'bug', 'discovery', 'note', 'summary', 'learning'] as const;
  let bar = '';
  for (const type of types) {
    const count = values[type] ?? 0;
    const barWidth = Math.round((count / total) * width);
    if (barWidth > 0) {
      bar += '█'.repeat(barWidth);
    }
  }
  // Pad to width
  bar = bar.padEnd(width, '░').slice(0, width);

  return (
    <Box>
      <Text dimColor>{label}: </Text>
      <Text>{bar}</Text>
      <Text> {total}</Text>
    </Box>
  );
}
