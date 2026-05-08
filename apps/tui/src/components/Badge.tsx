import React from 'react';
import { Text } from 'ink';
import type { Observation } from '@slorenzot/memento-core';
import { TYPE_COLORS, TYPE_ICONS, colors } from '../theme';

interface BadgeProps {
  type: Observation['type'];
  deleted?: boolean;
}

export function Badge({ type, deleted = false }: BadgeProps) {
  const colorFn = TYPE_COLORS[type] ?? colors.muted;
  const icon = TYPE_ICONS[type] ?? '?';

  return (
    <Text>
      {deleted ? (
        <Text color="red" bold>
          {' DELETED '}
        </Text>
      ) : null}
      <Text color={colorFn('#fff') as unknown as string}>
        [{type}]
      </Text>
    </Text>
  );
}
