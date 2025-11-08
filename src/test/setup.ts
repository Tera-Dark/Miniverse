import '@testing-library/jest-dom/vitest';

import { afterEach, vi } from 'vitest';

// Mock window.scrollTo for jsdom to prevent warnings
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
