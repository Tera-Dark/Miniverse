export type Shape = 'triangle' | 'circle' | 'square';

export type Color = 'rose' | 'amber' | 'emerald' | 'sky' | 'violet' | 'indigo';

export interface Cell {
  id: string;
  shape: Shape;
  color: Color;
  isTarget: boolean;
}

export type TargetRule = (cell: Pick<Cell, 'shape' | 'color'>) => boolean;

export interface TargetRuleDefinition {
  id: string;
  label: string;
  description: string;
  predicate: TargetRule;
  sampleTargets: Array<Pick<Cell, 'shape' | 'color'>>;
}

export type SimilarityLevel = 'contrast' | 'mixed' | 'mimic';
