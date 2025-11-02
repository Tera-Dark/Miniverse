import { describe, expect, it } from 'vitest';

import { generateGrid } from './generator';
import { createSeededRng } from './rng';
import type { Color, Shape, TargetRuleDefinition } from './types';

describe('generateGrid', () => {
  const rule: TargetRuleDefinition = {
    id: 'test-rule',
    label: '测试规则',
    description: '匹配赤红三角形。',
    predicate: (cell) => cell.color === 'rose' && cell.shape === 'triangle',
    sampleTargets: [{ color: 'rose', shape: 'triangle' }]
  };

  const palette: Color[] = ['rose', 'sky', 'emerald', 'amber'];
  const shapes: Shape[] = ['triangle', 'circle', 'square'];

  it('Produces the expected number of cells and targets', () => {
    const rng = createSeededRng('unit-test');

    for (let iteration = 0; iteration < 6; iteration += 1) {
      const grid = generateGrid(
        {
          size: 5,
          minTargets: 5,
          maxTargets: 7,
          palette,
          shapes,
          rule,
          similarity: 'mixed'
        },
        rng
      );

      expect(grid.cells).toHaveLength(25);
      const targets = grid.cells.filter((cell) => cell.isTarget);
      expect(targets.length).toBeGreaterThanOrEqual(5);
      expect(targets.length).toBeLessThanOrEqual(7);
      targets.forEach((cell) => {
        expect(rule.predicate(cell)).toBe(true);
      });

      const distractors = grid.cells.filter((cell) => !cell.isTarget);
      distractors.forEach((cell) => {
        expect(rule.predicate(cell)).toBe(false);
      });
    }
  });

  it('is reproducible with the same seed', () => {
    const options = {
      size: 6,
      minTargets: 8,
      maxTargets: 10,
      palette,
      shapes,
      rule,
      similarity: 'mimic'
    };

    const gridA = generateGrid(options, createSeededRng(42));
    const gridB = generateGrid(options, createSeededRng(42));

    expect(gridA.targetCount).toBe(gridB.targetCount);
    expect(gridA.cells.map((cell) => `${cell.color}-${cell.shape}-${cell.isTarget}`)).toEqual(
      gridB.cells.map((cell) => `${cell.color}-${cell.shape}-${cell.isTarget}`)
    );
  });
});
