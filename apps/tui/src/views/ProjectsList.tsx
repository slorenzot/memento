import React from 'react';
import { Box, Text } from 'ink';
import type { ProjectStats } from '@slorenzot/memento-core';
import { MiniBar } from '../components/MiniBar';
import { relativeTime, truncate } from '../theme';

interface ProjectsListProps {
  projects: ProjectStats[];
  selectedIndex: number;
  onSelect: (project: ProjectStats) => void;
}

export function ProjectsList({
  projects,
  selectedIndex,
  onSelect,
}: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text dimColor>No projects found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {projects.map((project, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Box key={project.name} flexDirection="column">
            <Box>
              <Text>
                {isSelected ? '▶ ' : '  '}
                <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                  {truncate(project.name, 25)}
                </Text>
                {' '}
                <Text color="green">{project.activeCount}</Text>
                <Text dimColor> active</Text>
                {project.deletedCount > 0 && (
                  <Text>
                    {' '}
                    <Text color="red">{project.deletedCount}</Text>
                    <Text dimColor> deleted</Text>
                  </Text>
                )}
                {' '}
                <Text dimColor>
                  {project.lastActivity ? relativeTime(project.lastActivity) : 'no activity'}
                </Text>
              </Text>
            </Box>
            {/* Mini bar showing type distribution */}
            <Box marginLeft={3}>
              <MiniBar
                label=""
                values={project.byType}
                total={project.activeCount}
                width={15}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
