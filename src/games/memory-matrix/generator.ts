import { createSeededRng, type Rng } from '../cancellation-task/rng';
import type { MemoryCellPosition, MemoryMatrixConfig, MemoryPattern } from './types';

export interface GeneratePatternOptions extends MemoryMatrixConfig {
  seed?: string | number;
  rng?: Rng;
}

const indexToPosition = (index: number, size: number): MemoryCellPosition => {
  const row = Math.floor(index / size);
  const column = index % size;
  return { index, row, column };
};

const isAdjacent = (a: MemoryCellPosition, b: MemoryCellPosition): boolean => {
  const rowDistance = Math.abs(a.row - b.row);
  const columnDistance = Math.abs(a.column - b.column);
  return rowDistance + columnDistance === 1;
};

export const generatePattern = (options: GeneratePatternOptions): MemoryPattern => {
  const { gridSize, patternLength, exposureMs, avoidAdjacency = false, seed, rng } = options;

  if (gridSize <= 0 || !Number.isInteger(gridSize)) {
    throw new Error('Grid size must be a positive integer');
  }

  if (patternLength <= 0 || !Number.isInteger(patternLength)) {
    throw new Error('Pattern length must be a positive integer');
  }

  const totalCells = gridSize * gridSize;

  if (patternLength > totalCells) {
    throw new Error('Pattern length cannot exceed grid capacity');
  }

  if (exposureMs <= 0) {
    throw new Error('Exposure duration must be positive');
  }

  const rngInstance = rng ?? createSeededRng(seed);
  const availableIndices: number[] = Array.from({ length: totalCells }, (_, index) => index);
  const chosen: MemoryCellPosition[] = [];

  const chooseFromPool = (pool: number[]): number => {
    const pickIndex = Math.floor(rngInstance.next() * pool.length);
    return pool[pickIndex] ?? pool[0];
  };

  while (chosen.length < patternLength) {
    const remaining = availableIndices.filter((candidate) => !chosen.some((entry) => entry.index === candidate));

    if (remaining.length === 0) {
      break;
    }

    let pool = remaining;

    if (avoidAdjacency && chosen.length > 0) {
      const filtered = remaining.filter((candidate) => {
        const position = indexToPosition(candidate, gridSize);
        return chosen.every((entry) => !isAdjacent(entry, position));
      });

      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    const candidateIndex = chooseFromPool(pool);
    const position = indexToPosition(candidateIndex, gridSize);

    chosen.push(position);
  }

  if (chosen.length !== patternLength) {
    throw new Error('Unable to generate pattern with requested parameters');
  }

  const order = chosen.map((entry) => entry.index);

  return {
    cells: chosen,
    order
  };
};

export const getPositionForIndex = (index: number, size: number): MemoryCellPosition => indexToPosition(index, size);
