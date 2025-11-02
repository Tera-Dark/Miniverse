import type { MemoryMatrixPhase } from './types';

const phaseSequence: Record<MemoryMatrixPhase, MemoryMatrixPhase> = {
  next: 'show',
  show: 'hide',
  hide: 'recall',
  recall: 'feedback',
  feedback: 'next'
};

export const getNextPhase = (current: MemoryMatrixPhase): MemoryMatrixPhase => phaseSequence[current];
