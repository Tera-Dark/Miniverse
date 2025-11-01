import type { Cell, Color, Shape, SimilarityLevel, TargetRuleDefinition } from './types';
import type { Rng } from './rng';

export interface GenerateGridOptions {
  size: number;
  minTargets: number;
  maxTargets: number;
  palette: Color[];
  shapes: Shape[];
  rule: TargetRuleDefinition;
  similarity: SimilarityLevel;
}

export interface GeneratedGrid {
  size: number;
  cells: Cell[];
  targetCount: number;
}

const extractUnique = <T>(values: readonly T[]): T[] => [...new Set(values)];

export const generateGrid = (options: GenerateGridOptions, rng: Rng): GeneratedGrid => {
  const { size, minTargets, maxTargets, palette, shapes, rule, similarity } = options;

  if (size <= 0) {
    throw new Error('Grid size must be greater than zero');
  }

  if (palette.length === 0 || shapes.length === 0) {
    throw new Error('Palette and shapes must not be empty');
  }

  const totalCells = size * size;
  const clampedMax = Math.max(1, Math.min(maxTargets, totalCells));
  const clampedMin = Math.min(Math.max(minTargets, 1), clampedMax);

  const targetCount = clampedMin === clampedMax ? clampedMin : rng.int(clampedMin, clampedMax);

  const availableTargetCombos = rule.sampleTargets.length
    ? rule.sampleTargets
    : palette
        .flatMap((color) =>
          shapes.map((shape) => ({ color, shape })).filter((combo) => rule.predicate(combo))
        );

  if (availableTargetCombos.length === 0) {
    throw new Error('Target rule cannot be satisfied with provided palette or shapes');
  }

  const targetCombos = availableTargetCombos;
  const targetColorList = extractUnique(targetCombos.map((combo) => combo.color));
  const targetShapeList = extractUnique(targetCombos.map((combo) => combo.shape));
  const nonTargetColors = palette.filter((color) => !targetColorList.includes(color));
  const nonTargetShapes = shapes.filter((shape) => !targetShapeList.includes(shape));

  const buildDistractor = (): Pick<Cell, 'color' | 'shape'> => {
    const attemptDistractor = (): Pick<Cell, 'color' | 'shape'> => {
      const useContrast = similarity === 'contrast' ? true : similarity === 'mimic' ? false : rng.next() < 0.5;
      if (useContrast) {
        const colorPool = nonTargetColors.length > 0 ? nonTargetColors : palette;
        const shapePool = nonTargetShapes.length > 0 ? nonTargetShapes : shapes;
        return { color: rng.pick(colorPool), shape: rng.pick(shapePool) };
      }

      const mimicColorPreferred = targetColorList.length > 0 && rng.next() < 0.65;
      const mimicShapePreferred = targetShapeList.length > 0 && rng.next() < 0.65;

      if (mimicColorPreferred && nonTargetShapes.length > 0) {
        return { color: rng.pick(targetColorList), shape: rng.pick(nonTargetShapes) };
      }

      if (mimicShapePreferred && nonTargetColors.length > 0) {
        return { color: rng.pick(nonTargetColors), shape: rng.pick(targetShapeList) };
      }

      if (targetColorList.length > 0 && targetShapeList.length > 0) {
        // Force one trait to match while flipping the other later in validation
        const candidateColor = rng.pick(targetColorList);
        const candidateShape = rng.pick(targetShapeList);
        return { color: candidateColor, shape: candidateShape };
      }

      return { color: rng.pick(palette), shape: rng.pick(shapes) };
    };

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = attemptDistractor();
      if (!rule.predicate(candidate)) {
        return candidate;
      }
    }

    const fallbackColor = palette.find((entry) => !rule.predicate({ color: entry, shape: shapes[0] })) ?? palette[0];
    const fallbackShape = shapes.find((entry) => !rule.predicate({ color: fallbackColor, shape: entry })) ?? shapes[0];

    if (rule.predicate({ color: fallbackColor, shape: fallbackShape })) {
      throw new Error('Unable to produce distractor that does not satisfy target rule');
    }

    return { color: fallbackColor, shape: fallbackShape };
  };

  const provisionalCells: Array<Omit<Cell, 'id'>> = [];

  for (let index = 0; index < targetCount; index += 1) {
    const preset = targetCombos[index % targetCombos.length];
    provisionalCells.push({ color: preset.color, shape: preset.shape, isTarget: true });
  }

  while (provisionalCells.length < totalCells) {
    const distractor = buildDistractor();
    provisionalCells.push({ ...distractor, isTarget: false });
  }

  const shuffled = rng.shuffle(provisionalCells);
  const cells: Cell[] = shuffled.map((cell, index) => ({
    id: `cell-${index}`,
    ...cell
  }));

  return {
    size,
    cells,
    targetCount
  };
};
