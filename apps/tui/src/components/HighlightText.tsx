import React from 'react';
import { Text } from 'ink';
import { truncate } from '../theme';

interface HighlightTextProps {
  text: string;
  query: string;
  maxLength?: number;
}

/**
 * Renders text with query matches visually highlighted.
 * Uses chalk bold + inverse for the matching portions.
 */
export function HighlightText({ text, query, maxLength = 80 }: HighlightTextProps) {
  const displayText = maxLength ? truncate(text, maxLength) : text;

  if (!query || query.length === 0) {
    return <Text>{displayText}</Text>;
  }

  // Case-insensitive split to find matches
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = displayText.split(regex);

  return (
    <Text>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <Text key={i} bold inverse>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        );
      })}
    </Text>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
