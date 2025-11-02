export type TrialType = 'go' | 'stop';

export interface TrialMetricsInput {
  type: TrialType;
  reactionTime: number | null;
  correct: boolean;
  stopSuccess: boolean | null;
  stopSignalDelay: number | null;
  aborted?: boolean;
}

export interface SessionMetrics {
  totalTrials: number;
  completedTrials: number;
  goTrials: number;
  stopTrials: number;
  goCorrect: number;
  goCorrectRate: number | null;
  stopSuccessCount: number;
  stopSuccessRate: number | null;
  goReactionTimes: number[];
  goReactionTimeMean: number | null;
  goReactionTimeMedian: number | null;
  meanSSD: number | null;
  medianSSD: number | null;
  ssrt: number | null;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const applyStaircase = (
  current: number,
  success: boolean,
  step: number,
  min: number,
  max: number
): number => {
  const direction = success ? 1 : -1;
  const next = current + step * direction;
  return clamp(next, min, max);
};

const meanOf = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

const medianOf = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

export const computeSsrtIntegration = (
  sortedGoReactionTimes: number[],
  stopSuccessRate: number,
  meanSsd: number | null
): number | null => {
  if (sortedGoReactionTimes.length === 0 || meanSsd === null) {
    return null;
  }

  const clampedSuccess = clamp(stopSuccessRate, 0, 1);
  const failureRate = 1 - clampedSuccess;
  const rank = Math.ceil(failureRate * sortedGoReactionTimes.length);
  const index = Math.min(sortedGoReactionTimes.length - 1, Math.max(0, rank - 1));
  const percentileRt = sortedGoReactionTimes[index];

  return percentileRt - meanSsd;
};

export const computeSessionMetrics = (trials: TrialMetricsInput[]): SessionMetrics => {
  const totalTrials = trials.length;
  const validTrials = trials.filter((trial) => !trial.aborted);
  const completedTrials = validTrials.length;

  const goTrials = validTrials.filter((trial) => trial.type === 'go');
  const stopTrials = validTrials.filter((trial) => trial.type === 'stop');

  const goCorrect = goTrials.filter((trial) => trial.correct).length;
  const goCorrectRate = goTrials.length > 0 ? goCorrect / goTrials.length : null;

  const goReactionTimes = goTrials
    .filter((trial) => trial.correct && typeof trial.reactionTime === 'number')
    .map((trial) => trial.reactionTime as number)
    .sort((a, b) => a - b);

  const goReactionTimeMean = meanOf(goReactionTimes);
  const goReactionTimeMedian = medianOf(goReactionTimes);

  const stopSuccessCount = stopTrials.filter((trial) => trial.stopSuccess === true).length;
  const stopSuccessRate = stopTrials.length > 0 ? stopSuccessCount / stopTrials.length : null;

  const ssdValues = stopTrials
    .map((trial) => trial.stopSignalDelay)
    .filter((value): value is number => typeof value === 'number');

  const meanSSD = meanOf(ssdValues);
  const medianSSD = medianOf(ssdValues);

  const ssrt = stopSuccessRate === null ? null : computeSsrtIntegration(goReactionTimes, stopSuccessRate, meanSSD);

  return {
    totalTrials,
    completedTrials,
    goTrials: goTrials.length,
    stopTrials: stopTrials.length,
    goCorrect,
    goCorrectRate,
    stopSuccessCount,
    stopSuccessRate,
    goReactionTimes,
    goReactionTimeMean,
    goReactionTimeMedian,
    meanSSD,
    medianSSD,
    ssrt
  };
};
