import { describe, expect, it } from 'vitest';

import { applyStaircase, computeSessionMetrics } from './logic';
import type { TrialMetricsInput } from './logic';

describe('stop-signal logic helpers', () => {
  it('updates stop-signal delay with 1-up/1-down staircase and clamps within bounds', () => {
    expect(applyStaircase(250, true, 50, 50, 900)).toBe(300);
    expect(applyStaircase(250, false, 50, 50, 900)).toBe(200);
    expect(applyStaircase(880, true, 50, 50, 900)).toBe(900);
    expect(applyStaircase(60, false, 50, 50, 900)).toBe(50);
  });

  it('computes SSRT and session metrics using integration method', () => {
    const trials = [
      { type: 'go', reactionTime: 350, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'go', reactionTime: 370, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'go', reactionTime: 390, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'go', reactionTime: 410, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'go', reactionTime: 430, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'go', reactionTime: 450, correct: true, stopSuccess: null, stopSignalDelay: null },
      { type: 'stop', reactionTime: null, correct: false, stopSuccess: true, stopSignalDelay: 250 },
      { type: 'stop', reactionTime: null, correct: false, stopSuccess: true, stopSignalDelay: 300 },
      { type: 'stop', reactionTime: 420, correct: false, stopSuccess: false, stopSignalDelay: 350 },
      { type: 'stop', reactionTime: 410, correct: false, stopSuccess: false, stopSignalDelay: 400 }
    ] satisfies TrialMetricsInput[];

    const metrics = computeSessionMetrics(trials);

    expect(metrics.totalTrials).toBe(10);
    expect(metrics.completedTrials).toBe(10);
    expect(metrics.goTrials).toBe(6);
    expect(metrics.stopTrials).toBe(4);
    expect(metrics.goCorrect).toBe(6);
    expect(metrics.goCorrectRate).toBe(1);
    expect(metrics.stopSuccessCount).toBe(2);
    expect(metrics.stopSuccessRate).toBe(0.5);
    expect(metrics.goReactionTimes).toEqual([350, 370, 390, 410, 430, 450]);
    expect(metrics.goReactionTimeMean).toBe(400);
    expect(metrics.goReactionTimeMedian).toBe(400);
    expect(metrics.meanSSD).toBe(325);
    expect(metrics.medianSSD).toBe(325);
    expect(metrics.ssrt).toBe(65);
  });
});
