import React from 'react';
import { Box, Text } from 'ink';
import type { Session, Observation } from '@slorenzot/memento-core';
import { Badge } from '../components/Badge';
import { relativeTime, truncate } from '../theme';

interface SessionsListProps {
  sessions: Session[];
  total: number;
  selectedIndex: number;
  sessionObservations: Record<number, Observation[]>;
  expandedSessionId: number | null;
  onSelect: (session: Session) => void;
  onToggleExpand: (sessionId: number) => void;
}

export function SessionsList({
  sessions,
  total,
  selectedIndex,
  sessionObservations,
  expandedSessionId,
  onSelect,
  onToggleExpand,
}: SessionsListProps) {
  if (sessions.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text dimColor>No sessions found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sessions.map((session, index) => {
        const isSelected = index === selectedIndex;
        const isActive = session.endedAt === null;
        const isExpanded = expandedSessionId === session.id;
        const observations = sessionObservations[session.id] ?? [];

        return (
          <Box key={session.id} flexDirection="column">
            <Box>
              <Text>
                {isSelected ? '▶ ' : '  '}
                <Text dimColor>#{session.id}</Text>
                {' '}
                <Text color={isActive ? 'green' : 'gray'}>
                  {isActive ? '●' : '○'}
                </Text>
                {' '}
                <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                  {truncate(session.projectId, 20)}
                </Text>
                {' '}
                <Text dimColor>{relativeTime(session.startedAt)}</Text>
                {isActive && <Text color="green"> active</Text>}
              </Text>
            </Box>

            {/* Expanded: show observations for this session */}
            {isExpanded && observations.length > 0 && (
              <Box marginLeft={4} flexDirection="column">
                {observations.map((obs) => (
                  <Box key={obs.id}>
                    <Text dimColor>  └ </Text>
                    <Badge type={obs.type} />
                    <Text> {truncate(obs.title, 30)}</Text>
                  </Box>
                ))}
              </Box>
            )}
            {isExpanded && observations.length === 0 && (
              <Box marginLeft={4}>
                <Text dimColor>  └ No observations</Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text dimColor>
          {'  '}Total: {total} sessions
        </Text>
      </Box>
    </Box>
  );
}
