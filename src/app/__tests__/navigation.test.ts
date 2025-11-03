import { describe, expect, it, vi } from 'vitest';

import { NAV_ITEMS } from '@/app/nav';

const mockGames = vi.hoisted(() =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `mock-${index}`,
    title: `Mock Game ${index}`,
    description: `Mock description ${index}`,
    accentColor: '#abcdef'
  }))
);

vi.mock('@/games', () => {
  const games = mockGames;

  return {
    listGames: vi.fn(() => games),
    gamesIndexPath: '/games',
    isGameId: vi.fn((candidate: string) => games.some((game) => game.id === candidate)),
    getGameDefinition: vi.fn(() => undefined),
    getGamePath: (id: string) => `/games/${id}`
  };
});

describe('navigation configuration', () => {
  it('renders only configured items regardless of registry size', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const originalMatchMedia = window.matchMedia;
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock
    });

    const originalScrollTo = window.scrollTo;
    window.scrollTo = vi.fn();

    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

    try {
      await import('@/main');

      const navLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.app-nav__link')
      );
      const labels = navLinks.map((link) => link.textContent ?? '');

      expect(navLinks).toHaveLength(NAV_ITEMS.length);
      expect(labels).toEqual(NAV_ITEMS.map((item) => item.label));
      mockGames.forEach((game) => {
        expect(labels).not.toContain(game.title);
      });
    } finally {
      focusSpy.mockRestore();

      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          writable: true,
          value: originalMatchMedia
        });
      } else {
        delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
      }

      if (originalScrollTo) {
        window.scrollTo = originalScrollTo;
      } else {
        delete (window as { scrollTo?: typeof window.scrollTo }).scrollTo;
      }
    }
  });
});
