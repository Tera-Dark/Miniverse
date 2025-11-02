import { describe, expect, it } from 'vitest';

import {
  assignNearestTaps,
  calculateBeatSchedule,
  collectAsynchronies,
  computeAsynchronyMetrics,
  DEFAULT_BEAT_TOLERANCE_MS,
  type Beat,
  type BeatTapMatch,
  type Tap
} from './logic';

describe('rhythm tapping logic helpers', () => {
  it('calculates beat schedule with latency offset applied', () => {
    const start = 1000;
    const beats = calculateBeatSchedule(start, 4, 500, 25);

    const expected: Beat[] = [
      { index: 0, actualTimeMs: 1000, expectedTimeMs: 1025 },
      { index: 1, actualTimeMs: 1500, expectedTimeMs: 1525 },
      { index: 2, actualTimeMs: 2000, expectedTimeMs: 2025 },
      { index: 3, actualTimeMs: 2500, expectedTimeMs: 2525 }
    ];

    expect(beats).toEqual(expected);
  });

  it('assigns taps to nearest beats within tolerance', () => {
    const beats: Beat[] = [
      { index: 0, actualTimeMs: 1000, expectedTimeMs: 1000 },
      { index: 1, actualTimeMs: 1600, expectedTimeMs: 1600 },
      { index: 2, actualTimeMs: 2200, expectedTimeMs: 2200 },
      { index: 3, actualTimeMs: 2800, expectedTimeMs: 2800 }
    ];

    const taps: Tap[] = [
      { timeMs: 995, source: 'keyboard' },
      { timeMs: 1585, source: 'keyboard' },
      { timeMs: 2225, source: 'mouse' },
      { timeMs: 3600, source: 'mouse' }
    ];

    const matches = assignNearestTaps(beats, taps, DEFAULT_BEAT_TOLERANCE_MS);

    expect(matches[0]?.tap).toEqual({ timeMs: 995, source: 'keyboard' });
    expect(matches[0]?.asynchrony).toBeCloseTo(-5);

    expect(matches[1]?.tap).toEqual({ timeMs: 1585, source: 'keyboard' });
    expect(matches[1]?.asynchrony).toBeCloseTo(-15);

    expect(matches[2]?.tap).toEqual({ timeMs: 2225, source: 'mouse' });
    expect(matches[2]?.asynchrony).toBeCloseTo(25);

    expect(matches[3]?.tap).toBeNull();
    expect(matches[3]?.asynchrony).toBeNull();
  });

  it('computes mean, RMS, std dev, and outlier rate for matched asynchronies', () => {
    const matches: BeatTapMatch[] = [
      {
        beat: { index: 0, actualTimeMs: 0, expectedTimeMs: 0 },
        tap: { timeMs: 10, source: 'keyboard' },
        asynchrony: 10
      },
      {
        beat: { index: 1, actualTimeMs: 500, expectedTimeMs: 500 },
        tap: { timeMs: 505, source: 'keyboard' },
        asynchrony: 5
      },
      {
        beat: { index: 2, actualTimeMs: 1000, expectedTimeMs: 1000 },
        tap: { timeMs: 1175, source: 'keyboard' },
        asynchrony: 175
      },
      { beat: { index: 3, actualTimeMs: 1500, expectedTimeMs: 1500 }, tap: null, asynchrony: null }
    ];

    const metrics = computeAsynchronyMetrics(matches, 150);

    const asynchronies = [10, 5, 175];
    const mean = asynchronies.reduce((sum, value) => sum + value, 0) / asynchronies.length;
    const rms = Math.sqrt(asynchronies.reduce((sum, value) => sum + value * value, 0) / asynchronies.length);
    const variance =
      asynchronies.reduce((sum, value) => sum + (value - mean) ** 2, 0) / asynchronies.length;
    const stdDev = Math.sqrt(variance);

    expect(metrics.sampleSize).toBe(3);
    expect(metrics.meanAsynchrony).toBeCloseTo(mean);
    expect(metrics.rmsError).toBeCloseTo(rms);
    expect(metrics.stdDev).toBeCloseTo(stdDev);
    expect(metrics.outlierRate).toBeCloseTo(1 / 3);

    expect(collectAsynchronies(matches).length).toBe(3);
  });
});
