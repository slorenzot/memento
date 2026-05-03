import React from 'react';
import { Box, Text } from 'ink';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  focus?: 'left' | 'right';
}

/**
 * Split-pane layout: left panel (60%) + right panel (40%).
 * Shows a visual border between panels and highlights the focused one.
 */
export function SplitPane({ left, right, focus = 'left' }: SplitPaneProps) {
  return (
    <Box flexDirection="row" width="100%">
      {/* Left panel */}
      <Box flexDirection="column" width="60%">
        <Box borderStyle="single" borderColor={focus === 'left' ? 'cyan' : 'gray'}>
          <Box flexDirection="column">
            <Text color={focus === 'left' ? 'cyan' : 'gray'} dimColor={focus !== 'left'}>
              LEFT
            </Text>
            {left}
          </Box>
        </Box>
      </Box>

      {/* Separator */}
      <Box>
        <Text color="gray">│</Text>
      </Box>

      {/* Right panel */}
      <Box flexDirection="column" width="40%">
        <Box borderStyle="single" borderColor={focus === 'right' ? 'cyan' : 'gray'}>
          <Box flexDirection="column">
            <Text color={focus === 'right' ? 'cyan' : 'gray'} dimColor={focus !== 'right'}>
              RIGHT
            </Text>
            {right}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
