export interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(values: readonly T[]) => T;
  shuffle: <T>(values: readonly T[]) => T[];
}

const normalizeSeed = (seed: number | string | undefined): number => {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  if (typeof seed === 'string' && seed.length > 0) {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(index);
      hash |= 0;
    }
    return hash >>> 0;
  }

  const randomValue = Math.floor(Math.random() * 2 ** 32);
  return randomValue >>> 0;
};

export const createSeededRng = (seed: number | string | undefined): Rng => {
  let state = normalizeSeed(seed) || 1;

  const next = (): number => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error('Invalid range for integer generation');
    }

    const lower = Math.ceil(Math.min(min, max));
    const upper = Math.floor(Math.max(min, max));

    if (lower === upper) {
      return lower;
    }

    return Math.floor(next() * (upper - lower + 1)) + lower;
  };

  const pick = <T>(values: readonly T[]): T => {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty collection');
    }
    const index = Math.floor(next() * values.length);
    return values[index] as T;
  };

  const shuffle = <T>(values: readonly T[]): T[] => {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(next() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  };

  return {
    next,
    int,
    pick,
    shuffle
  };
};
