import { describe, expect, it } from 'vitest';

import { generatePattern } from './generator';

describe('Memory Matrix pattern generator', () => {
  it('produces a pattern with distinct cells matching the requested length', () => {
    const patternLength = 5;
    const result = generatePattern({
      gridSize: 4,
      patternLength,
      exposureMs: 1200,
      avoidAdjacency: true,
      seed: 'unit-test'
    });

    expect(result.order).toHaveLength(patternLength);
    expect(result.cells).toHaveLength(patternLength);

    const uniqueIndices = new Set(result.order);
    expect(uniqueIndices.size).toBe(patternLength);

    result.cells.forEach((cell) => {
      expect(cell.index).toBeGreaterThanOrEqual(0);
      expect(cell.index).toBeLessThan(16);
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(4);
      expect(cell.column).toBeGreaterThanOrEqual(0);
      expect(cell.column).toBeLessThan(4);
    });
  });
});
