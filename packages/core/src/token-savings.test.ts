import { describe, it, expect } from 'bun:test';

describe('token-savings', () => {
  describe('estimateTokens()', () => {
    const { estimateTokens } = require('../src/token-savings');

    it('should estimate tokens from string length', () => {
      // ~4 chars per token
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('abcdefgh')).toBe(2);
      expect(estimateTokens('a'.repeat(400))).toBe(100);
    });

    it('should round up partial tokens', () => {
      expect(estimateTokens('abc')).toBe(1); // 3/4 = 0.75 → ceil = 1
      expect(estimateTokens('abcde')).toBe(2); // 5/4 = 1.25 → ceil = 2
    });
  });

  describe('getTypeMultiplier()', () => {
    const { getTypeMultiplier } = require('../src/token-savings');

    it('should return correct multipliers for each type', () => {
      expect(getTypeMultiplier('architecture')).toBe(5);
      expect(getTypeMultiplier('bug')).toBe(4);
      expect(getTypeMultiplier('discovery')).toBe(3);
      expect(getTypeMultiplier('pattern')).toBe(3);
      expect(getTypeMultiplier('decision')).toBe(2);
      expect(getTypeMultiplier('learning')).toBe(2);
      expect(getTypeMultiplier('summary')).toBe(1.5);
      expect(getTypeMultiplier('config')).toBe(1.5);
      expect(getTypeMultiplier('note')).toBe(1);
      expect(getTypeMultiplier('preference')).toBe(1);
    });
  });

  describe('estimateSavingsForObservation()', () => {
    const { estimateSavingsForObservation } = require('../src/token-savings');

    it('should multiply content tokens by type multiplier', () => {
      // 40 chars = 10 tokens × multiplier
      const content = 'a'.repeat(40);

      const bugSavings = estimateSavingsForObservation({ content, type: 'bug' });
      expect(bugSavings).toBe(10 * 4); // 40

      const noteSavings = estimateSavingsForObservation({ content, type: 'note' });
      expect(noteSavings).toBe(10 * 1); // 10

      const archSavings = estimateSavingsForObservation({ content, type: 'architecture' });
      expect(archSavings).toBe(10 * 5); // 50
    });
  });

  describe('estimateTotalSavings()', () => {
    const { estimateTotalSavings } = require('../src/token-savings');

    it('should aggregate savings across multiple observations', () => {
      const observations = [
        { content: 'a'.repeat(40), type: 'bug' as const },        // 10 tokens × 4 = 40
        { content: 'b'.repeat(80), type: 'discovery' as const },   // 20 tokens × 3 = 60
        { content: 'c'.repeat(20), type: 'note' as const },        // 5 tokens × 1 = 5
      ];

      const result = estimateTotalSavings(observations);

      expect(result.observationCount).toBe(3);
      expect(result.contentTokens).toBe(10 + 20 + 5); // 35
      expect(result.estimatedTokensSaved).toBe(40 + 60 + 5); // 105
    });

    it('should return zeros for empty array', () => {
      const result = estimateTotalSavings([]);

      expect(result.observationCount).toBe(0);
      expect(result.contentTokens).toBe(0);
      expect(result.estimatedTokensSaved).toBe(0);
    });
  });

  describe('formatTokenSavings()', () => {
    const { formatTokenSavings } = require('../src/token-savings');

    it('should return empty string for zero savings', () => {
      const result = formatTokenSavings({ estimatedTokensSaved: 0, observationCount: 0, contentTokens: 0 });
      expect(result).toBe('');
    });

    it('should format savings with observation count', () => {
      const result = formatTokenSavings({ estimatedTokensSaved: 3200, observationCount: 3, contentTokens: 1000 });
      expect(result).toContain('3,200 tokens');
      expect(result).toContain('3 observations');
      expect(result).toContain('~1,067 tokens each');
      expect(result).toContain('Without Memento');
    });

    it('should format hours for large savings', () => {
      const result = formatTokenSavings({ estimatedTokensSaved: 30000, observationCount: 10, contentTokens: 10000 });
      expect(result).toContain('30,000 tokens');
      expect(result).toContain('h'); // hours format
    });

    it('should use singular for 1 observation', () => {
      const result = formatTokenSavings({ estimatedTokensSaved: 500, observationCount: 1, contentTokens: 200 });
      expect(result).toContain('1 observation');
      expect(result).not.toContain('1 observations');
    });
  });
});

describe('isTokenSavingsEnabled()', () => {
  const { isTokenSavingsEnabled } = require('../src/ConfigManager');

  it('should default to true', () => {
    const originalEnv = { ...process.env };
    delete process.env.MEMENTO_TOKEN_SAVINGS;

    try {
      expect(isTokenSavingsEnabled()).toBe(true);
    } finally {
      process.env = originalEnv;
    }
  });

  it('should respect MEMENTO_TOKEN_SAVINGS=true', () => {
    const originalEnv = { ...process.env };
    process.env.MEMENTO_TOKEN_SAVINGS = 'true';

    try {
      expect(isTokenSavingsEnabled()).toBe(true);
    } finally {
      process.env = originalEnv;
    }
  });

  it('should respect MEMENTO_TOKEN_SAVINGS=false', () => {
    const originalEnv = { ...process.env };
    process.env.MEMENTO_TOKEN_SAVINGS = 'false';

    try {
      expect(isTokenSavingsEnabled()).toBe(false);
    } finally {
      process.env = originalEnv;
    }
  });

  it('should treat MEMENTO_TOKEN_SAVINGS=1 as true', () => {
    const originalEnv = { ...process.env };
    process.env.MEMENTO_TOKEN_SAVINGS = '1';

    try {
      expect(isTokenSavingsEnabled()).toBe(true);
    } finally {
      process.env = originalEnv;
    }
  });

  it('should treat any other value as false', () => {
    const originalEnv = { ...process.env };
    process.env.MEMENTO_TOKEN_SAVINGS = 'no';

    try {
      expect(isTokenSavingsEnabled()).toBe(false);
    } finally {
      process.env = originalEnv;
    }
  });
});
