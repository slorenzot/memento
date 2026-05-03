import React from 'react';
import { Box, Text } from 'ink';

interface BreadcrumbProps {
  segments: string[];
}

/**
 * Renders a navigation breadcrumb trail.
 * Last segment is highlighted as the current view.
 */
export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <Box>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <Text key={index}>
            {index > 0 && <Text dimColor> › </Text>}
            {isLast ? (
              <Text bold color="cyan">
                {segment}
              </Text>
            ) : (
              <Text dimColor>{segment}</Text>
            )}
          </Text>
        );
      })}
    </Box>
  );
}
