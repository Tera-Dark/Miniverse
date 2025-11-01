import { describe, expect, it } from 'vitest';

import { getNextPhase } from './state';

describe('Memory Matrix phase transitions', () => {
  it('cycles through the expected phase sequence', () => {
    expect(getNextPhase('next')).toBe('show');
    expect(getNextPhase('show')).toBe('hide');
    expect(getNextPhase('hide')).toBe('recall');
    expect(getNextPhase('recall')).toBe('feedback');
    expect(getNextPhase('feedback')).toBe('next');
  });
});
