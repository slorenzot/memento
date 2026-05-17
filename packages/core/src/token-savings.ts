import type { Observation } from './types';

// ─── Type Multipliers ──────────────────────────────────────

/**
 * Multipliers for each observation type.
 * Higher values = more expensive to re-discover without memory.
 *
 * Rationale:
 *   - architecture (5x): requires understanding system-wide relationships
 *   - bug (4x): requires reproduce, debug, trace through code
 *   - discovery (3x): requires exploring codebase, reading 3+ files, testing hypotheses
 *   - pattern (3x): requires recognizing pattern across multiple instances
 *   - decision (2x): requires evaluating alternatives, weighing tradeoffs
 *   - learning (2x): requires learning from mistake or gotcha
 *   - summary (1.5x): requires synthesizing information
 *   - config (1.5x): requires reading docs and testing settings
 *   - note (1x): simple annotation
 *   - preference (1x): simple preference recording
 */
const TYPE_MULTIPLIERS: Record<Observation['type'], number> = {
  architecture: 5,
  bug: 4,
  discovery: 3,
  pattern: 3,
  decision: 2,
  learning: 2,
  summary: 1.5,
  config: 1.5,
  note: 1,
  preference: 1,
};

/** Chars-to-tokens ratio (rough estimate: ~4 chars per token) */
const CHARS_PER_TOKEN = 4;

// ─── Estimation Functions ──────────────────────────────────

/**
 * Estimate the number of tokens in a string.
 * Uses simple chars/4 ratio — no tokenizer dependency needed.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Get the multiplier for an observation type.
 */
export function getTypeMultiplier(type: Observation['type']): number {
  return TYPE_MULTIPLIERS[type] ?? 1;
}

/**
 * Estimate token savings for a single observation.
 * Formula: content_tokens × type_multiplier
 */
export function estimateSavingsForObservation(obs: { content: string; type: Observation['type'] }): number {
  const contentTokens = estimateTokens(obs.content);
  const multiplier = getTypeMultiplier(obs.type);
  return Math.ceil(contentTokens * multiplier);
}

/**
 * Estimate total token savings for a list of observations.
 * Returns raw savings without multiplier (contentTokens) and total with multiplier.
 */
export function estimateTotalSavings(observations: Array<{ content: string; type: Observation['type'] }>): {
  /** Sum of raw content tokens across all observations */
  contentTokens: number;
  /** Sum of (content_tokens × type_multiplier) across all observations */
  estimatedTokensSaved: number;
  /** Number of observations used in the calculation */
  observationCount: number;
} {
  let contentTokens = 0;
  let estimatedTokensSaved = 0;

  for (const obs of observations) {
    const tokens = estimateTokens(obs.content);
    const multiplier = getTypeMultiplier(obs.type);
    contentTokens += tokens;
    estimatedTokensSaved += Math.ceil(tokens * multiplier);
  }

  return {
    contentTokens,
    estimatedTokensSaved,
    observationCount: observations.length,
  };
}

/**
 * Format token savings as a human-readable string for MCP responses.
 */
export function formatTokenSavings(savings: {
  estimatedTokensSaved: number;
  observationCount: number;
  contentTokens: number;
}): string {
  if (savings.estimatedTokensSaved === 0 || savings.observationCount === 0) {
    return '';
  }

  const avg = Math.round(savings.estimatedTokensSaved / savings.observationCount);
  const lines: string[] = [];

  lines.push(`📊 Token savings: ~${savings.estimatedTokensSaved.toLocaleString()} tokens (${savings.observationCount} observation${savings.observationCount !== 1 ? 's' : ''}, avg ~${avg.toLocaleString()} tokens each)`);

  // Rough time estimate: ~100 tokens/min exploration rate
  const explorationMinutes = Math.max(1, Math.round(savings.estimatedTokensSaved / 100));
  if (explorationMinutes >= 60) {
    const hours = Math.floor(explorationMinutes / 60);
    const mins = explorationMinutes % 60;
    lines.push(`   Without Memento: ~${hours}-${hours + 1}h${mins > 0 ? ` ${mins}m` : ''} of codebase exploration`);
  } else {
    const upper = Math.min(explorationMinutes * 2, explorationMinutes + 10);
    lines.push(`   Without Memento: ~${explorationMinutes}-${upper} min of codebase exploration`);
  }

  return lines.join('\n');
}
