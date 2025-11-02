export type TapSource = 'keyboard' | 'mouse' | 'touch' | 'unknown';

export interface Beat {
  index: number;
  actualTimeMs: number;
  expectedTimeMs: number;
}

export interface Tap {
  timeMs: number;
  source: TapSource;
}

export interface BeatTapMatch {
  beat: Beat;
  tap: Tap | null;
  asynchrony: number | null;
}

export interface AsynchronyMetrics {
  sampleSize: number;
  meanAsynchrony: number | null;
  rmsError: number | null;
  stdDev: number | null;
  outlierRate: number | null;
}

export interface BlockResult {
  beats: Beat[];
  taps: Tap[];
  matches: BeatTapMatch[];
  metrics: AsynchronyMetrics;
  bpm: number;
  latencyOffsetMs: number;
  startedAt: number;
  endedAt: number;
}

export const DEFAULT_BLOCK_BEATS = 45;
export const DEFAULT_BEAT_TOLERANCE_MS = 180;
export const DEFAULT_OUTLIER_THRESHOLD_MS = 150;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

export const bpmToIntervalMs = (bpm: number): number => {
  const clamped = Math.max(1, Math.min(300, Math.round(bpm)));
  return 60000 / clamped;
};

export const calculateBeatSchedule = (
  startTimeMs: number,
  beatCount: number,
  intervalMs: number,
  latencyOffsetMs: number
): Beat[] => {
  const totalBeats = Math.max(1, Math.floor(beatCount));
  const beats: Beat[] = [];

  for (let index = 0; index < totalBeats; index += 1) {
    const actualTimeMs = startTimeMs + index * intervalMs;
    const expectedTimeMs = actualTimeMs + latencyOffsetMs;
    beats.push({ index, actualTimeMs, expectedTimeMs });
  }

  return beats;
};

export const assignNearestTaps = (
  beats: Beat[],
  taps: Tap[],
  toleranceMs: number = DEFAULT_BEAT_TOLERANCE_MS
): BeatTapMatch[] => {
  if (beats.length === 0) {
    return [];
  }

  const sanitizedTolerance = Math.max(0, toleranceMs);
  const available = taps.map((tap) => ({ tap, used: false }));

  return beats.map((beat) => {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < available.length; index += 1) {
      const slot = available[index];
      if (slot.used) {
        continue;
      }

      const distance = Math.abs(slot.tap.timeMs - beat.expectedTimeMs);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    if (bestIndex >= 0 && bestDistance <= sanitizedTolerance) {
      const selected = available[bestIndex];
      selected.used = true;
      const asynchrony = selected.tap.timeMs - beat.expectedTimeMs;

      return {
        beat,
        tap: selected.tap,
        asynchrony
      } satisfies BeatTapMatch;
    }

    return {
      beat,
      tap: null,
      asynchrony: null
    } satisfies BeatTapMatch;
  });
};

export const collectAsynchronies = (matches: BeatTapMatch[]): number[] =>
  matches
    .map((entry) => entry.asynchrony)
    .filter((value): value is number => value !== null && isFiniteNumber(value));

export const computeAsynchronyMetrics = (
  matches: BeatTapMatch[],
  outlierThresholdMs: number = DEFAULT_OUTLIER_THRESHOLD_MS
): AsynchronyMetrics => {
  const asynchronies = collectAsynchronies(matches);
  const sampleSize = asynchronies.length;

  if (sampleSize === 0) {
    return {
      sampleSize,
      meanAsynchrony: null,
      rmsError: null,
      stdDev: null,
      outlierRate: null
    };
  }

  const meanAsynchrony = asynchronies.reduce((sum, value) => sum + value, 0) / sampleSize;

  const rmsError = Math.sqrt(
    asynchronies.reduce((sum, value) => sum + value * value, 0) / sampleSize
  );

  const variance =
    asynchronies.reduce((sum, value) => sum + (value - meanAsynchrony) ** 2, 0) / sampleSize;
  const stdDev = Math.sqrt(variance);

  const outliers = asynchronies.filter((value) => Math.abs(value) > Math.max(0, outlierThresholdMs));
  const outlierRate = outliers.length / sampleSize;

  return {
    sampleSize,
    meanAsynchrony,
    rmsError,
    stdDev,
    outlierRate
  };
};

export interface ComputeBlockResultInput {
  beats: Beat[];
  taps: Tap[];
  bpm: number;
  latencyOffsetMs: number;
  startedAt: number;
  endedAt: number;
  toleranceMs?: number;
  outlierThresholdMs?: number;
}

export const computeBlockResult = ({
  beats,
  taps,
  bpm,
  latencyOffsetMs,
  startedAt,
  endedAt,
  toleranceMs = DEFAULT_BEAT_TOLERANCE_MS,
  outlierThresholdMs = DEFAULT_OUTLIER_THRESHOLD_MS
}: ComputeBlockResultInput): BlockResult => {
  const beatCopies = beats.map((beat) => ({ ...beat }));
  const tapCopies = taps.map((tap) => ({ ...tap }));

  const matches = assignNearestTaps(beatCopies, tapCopies, toleranceMs);
  const metrics = computeAsynchronyMetrics(matches, outlierThresholdMs);

  return {
    beats: beatCopies,
    taps: tapCopies,
    matches,
    metrics,
    bpm,
    latencyOffsetMs,
    startedAt,
    endedAt
  };
};
