import React from 'react';
import { Box, Text } from 'ink';

interface ScrollableContentProps {
  lines: string[];
  scrollOffset: number;
  visibleLines: number;
}

/**
 * Renders a scrollable view of text lines with position indicators.
 */
export function ScrollableContent({ lines, scrollOffset, visibleLines }: ScrollableContentProps) {
  if (lines.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No content</Text>
      </Box>
    );
  }

  const visible = lines.slice(scrollOffset, scrollOffset + visibleLines);
  const isAtTop = scrollOffset === 0;
  const isAtBottom = scrollOffset + visibleLines >= lines.length;
  const hasMore = lines.length > visibleLines;

  return (
    <Box flexDirection="column">
      {visible.map((line, i) => (
        <Text key={scrollOffset + i}>{line}</Text>
      ))}
      {hasMore && (
        <Box marginTop={1}>
          <Text dimColor>
            {isAtTop ? 'TOP' : '↑ more above'}
            {' │ '}
            {isAtBottom ? 'END' : '↓ more below'}
            {' │ '}
            Lines {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, lines.length)} of {lines.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}
