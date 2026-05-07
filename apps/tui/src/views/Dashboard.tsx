import React from 'react';
import { Box, Text } from 'ink';
import type { DashboardStats, Observation } from '@slorenzot/memento-core';
import { Badge } from '../components/Badge';
import { colors, truncate, relativeTime, TYPE_ICONS } from '../theme';

interface DashboardProps {
  stats: DashboardStats;
}

export function Dashboard({ stats }: DashboardProps) {
  const {
    totalObservations,
    activeObservations,
    deletedObservations,
    byType,
    byProject,
    activeSessions,
    recentObservations,
  } = stats;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ◆ MEMENTO DASHBOARD
        </Text>
      </Box>

      {/* Overview Stats */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Overview</Text>
        <Box marginLeft={2}>
          <Text>Total: <Text bold>{totalObservations}</Text></Text>
          <Text> │ Active: <Text color="green" bold>{activeObservations}</Text></Text>
          <Text> │ Deleted: <Text color="red" bold>{deletedObservations}</Text></Text>
          <Text> │ Sessions: <Text color="yellow" bold>{activeSessions}</Text></Text>
        </Box>
      </Box>

      {/* Type Distribution */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>By Type</Text>
        <Box marginLeft={2} flexDirection="column">
          {(Object.entries(byType) as [string, number][])
            .filter(([, count]) => count > 0)
            .map(([type, count]) => (
              <Box key={type}>
                <Badge type={type as Observation['type']} />
                <Text>: {count}</Text>
                <Text dimColor>
                  {' '}
                  ({totalObservations > 0
                    ? Math.round((count / activeObservations) * 100)
                    : 0}%)
                </Text>
              </Box>
            ))}
        </Box>
      </Box>

      {/* Project Distribution */}
      {Object.keys(byProject).length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>By Project</Text>
          <Box marginLeft={2} flexDirection="column">
            {Object.entries(byProject)
              .sort(([, a], [, b]) => b - a)
              .map(([project, count]) => (
                <Box key={project}>
                  <Text>{project}: </Text>
                  <Text bold>{count}</Text>
                  <Text dimColor>
                    {' '}
                    ({Math.round((count / activeObservations) * 100)}%)
                  </Text>
                </Box>
              ))}
          </Box>
        </Box>
      )}

      {/* Recent Observations */}
      {recentObservations.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Recent</Text>
          <Box marginLeft={2} flexDirection="column">
            {recentObservations.map((obs) => (
              <Box key={obs.id}>
                <Text dimColor>#{obs.id}</Text>
                <Text> </Text>
                <Badge type={obs.type} />
                <Text> {truncate(obs.title, 35)}</Text>
                <Text dimColor> {relativeTime(obs.createdAt)}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
