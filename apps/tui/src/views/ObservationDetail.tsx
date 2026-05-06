import React from 'react';
import { Box, Text } from 'ink';
import type { Observation } from '@slorenzot/memento-core';
import { Badge } from '../components/Badge';
import { ScrollableContent } from '../components/ScrollableContent';
import { relativeTime } from '../theme';

interface ObservationDetailProps {
  observation: Observation;
  scrollOffset?: number;
  visibleLines?: number;
}

/**
 * Full detail view of a single observation.
 * Shows all fields: header, metadata, content with scroll.
 */
export function ObservationDetail({
  observation,
  scrollOffset = 0,
  visibleLines = 40,
}: ObservationDetailProps) {
  const {
    id,
    uuid,
    sessionId,
    title,
    content,
    type,
    topicKey,
    projectId,
    createdAt,
    deletedAt,
    metadata,
  } = observation;

  // Build content lines
  const contentLines = content.split('\n');

  // Build metadata entries
  const metaEntries = Object.entries(metadata);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="cyan">
            #{id}
          </Text>
          <Text> </Text>
          <Badge type={type} deleted={deletedAt !== null} />
        </Box>
        <Text bold>{title}</Text>
      </Box>

      {/* Metadata fields */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>Project: </Text>
          <Text>{projectId}</Text>
        </Box>
        {topicKey && (
          <Box>
            <Text dimColor>Topic: </Text>
            <Text>{topicKey}</Text>
          </Box>
        )}
        <Box>
          <Text dimColor>Session: </Text>
          <Text>{sessionId}</Text>
        </Box>
        <Box>
          <Text dimColor>Created: </Text>
          <Text>{relativeTime(createdAt)}</Text>
          <Text dimColor> ({createdAt.toISOString()})</Text>
        </Box>
        <Box>
          <Text dimColor>UUID: </Text>
          <Text dimColor>{uuid}</Text>
        </Box>
      </Box>

      {/* Custom metadata */}
      {metaEntries.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Metadata</Text>
          {metaEntries.map(([key, value]) => (
            <Box key={key} marginLeft={2}>
              <Text dimColor>{key}: </Text>
              <Text>{String(value)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column">
        <Text bold>Content</Text>
        <ScrollableContent
          lines={contentLines}
          scrollOffset={scrollOffset}
          visibleLines={visibleLines}
        />
      </Box>
    </Box>
  );
}
