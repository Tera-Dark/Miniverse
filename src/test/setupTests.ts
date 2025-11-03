import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/dom';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
