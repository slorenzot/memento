/**
 * renderer.ts — Render observations as compact XML for system prompt injection.
 *
 * Format: XML with clear delimiters, compact to minimize token usage.
 * Stable deterministic order for prompt caching.
 */

import type { Observation } from '@slorenzot/memento-core';

export interface RenderedContext {
  xml: string;
  observationCount: number;
  tokenCount: number;
  budgetExceeded: boolean;
}

/**
 * Approximate token count: chars / 4.
 * Good enough for budget management — not exact but deterministic.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Render a single observation as a compact XML node.
 */
export function renderObservationXml(obs: Observation): string {
  const attrs: string[] = [`id="${obs.id}"`, `type="${obs.type}"`];
  if (obs.projectId) attrs.push(`project="${obs.projectId}"`);
  if (obs.pinned) attrs.push('pinned="true"');

  // Truncate content to 500 chars for budget control
  const truncatedContent = obs.content.length > 500
    ? obs.content.slice(0, 500) + '...'
    : obs.content;

  return `<observation ${attrs.join(' ')}>\n${obs.title}\n${truncatedContent}\n</observation>`;
}

/**
 * Render a list of observations as a <memento_context> XML block.
 * Applies token budget — stops adding observations if budget exceeded.
 */
export function renderContext(
  observations: Observation[],
  maxTokens: number
): RenderedContext {
  if (observations.length === 0) {
    return { xml: '', observationCount: 0, tokenCount: 0, budgetExceeded: false };
  }

  const parts: string[] = ['<memento_context>'];
  let totalTokens = 0;
  let budgetExceeded = false;

  // Calculate overhead for wrapper tags (~8 tokens)
  const wrapperOverhead = estimateTokens('<memento_context>\n</memento_context>');
  maxTokens -= wrapperOverhead;

  for (const obs of observations) {
    const xmlNode = renderObservationXml(obs);
    const nodeTokens = estimateTokens(xmlNode);

    if (totalTokens + nodeTokens > maxTokens && parts.length > 1) {
      budgetExceeded = true;
      break;
    }

    parts.push(xmlNode);
    totalTokens += nodeTokens;
  }

  parts.push('</memento_context>');

  const xml = parts.join('\n');
  return {
    xml,
    observationCount: parts.length - 2, // subtract opening and closing tags
    tokenCount: estimateTokens(xml),
    budgetExceeded,
  };
}
