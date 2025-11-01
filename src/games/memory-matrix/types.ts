export type MemoryMatrixPhase = 'next' | 'show' | 'hide' | 'recall' | 'feedback';

export interface MemoryCellPosition {
  index: number;
  row: number;
  column: number;
}

export interface MemoryPattern {
  cells: MemoryCellPosition[];
  order: number[];
}

export interface MemoryMatrixConfig {
  gridSize: number;
  patternLength: number;
  exposureMs: number;
  avoidAdjacency?: boolean;
}

export interface SessionStats {
  roundsPlayed: number;
  totalScore: number;
  perfectRounds: number;
  maxPerfectLevel: number;
}
