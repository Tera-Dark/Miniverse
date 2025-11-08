import { fireEvent, within } from '@testing-library/dom';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { mountGamesHub } from '@/games/hub';
import { listGames, getGamePath } from '@/games';
import type { RegisteredGameMeta } from '@/games';
import { createDomHost } from '@/test/test-utils';

const originalMatchMedia = window.matchMedia;

const createMatchMediaMock = () =>
  vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(() => false)
  })) as unknown as typeof window.matchMedia;

describe('games hub', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: createMatchMediaMock()
    });
    window.location.hash = '#/games';
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;

    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia.bind(window);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as Partial<typeof window> & { matchMedia?: typeof window.matchMedia }).matchMedia;
    }
  });

  const mountWith = (games: RegisteredGameMeta[]) => {
    const host = createDomHost();
    cleanup = mountGamesHub(host, games);
    return within(host);
  };

  it('renders tappable cards with primary play actions', () => {
    const games = listGames();
    const queries = mountWith(games);

    expect(queries.getByRole('heading', { name: '小游戏合集' })).toBeInTheDocument();

    const cards = queries.getAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(0);

    const firstCard = cards[0];
    expect(firstCard).toHaveAttribute('tabindex', '0');

    const playButton = within(firstCard).getByRole('link', { name: /立即开始/ });
    const expectedHref = `#${getGamePath(games[0].id)}`;
    expect((playButton as HTMLAnchorElement).getAttribute('href')).toBe(expectedHref);
  });

  it('filters games when a quick filter chip is toggled', () => {
    const games = listGames();
    const queries = mountWith(games);

    const memoryChip = queries.getByRole('button', { name: 'Memory' });
    fireEvent.click(memoryChip);

    const cards = queries.getAllByRole('listitem');
    const hiddenCards = cards.filter((card) => card.hasAttribute('hidden'));
    expect(hiddenCards.length).toBeGreaterThan(0);

    fireEvent.click(memoryChip);
    const stillHidden = cards.filter((card) => card.hasAttribute('hidden'));
    expect(stillHidden.length).toBe(0);
  });

  it('navigates to the game detail when a card is activated', () => {
    const games = listGames();
    const targetGame = games[0];
    const queries = mountWith(games);

    const cards = queries.getAllByRole('listitem');
    const firstCard = cards[0];

    firstCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(window.location.hash).toBe(`#${getGamePath(targetGame.id)}`);
  });

  it('reveals secondary metadata inside the action sheet', () => {
    const games = listGames();
    const queries = mountWith(games);

    const firstCard = queries.getAllByRole('listitem')[0];
    const moreButton = within(firstCard).getByRole('button', { name: /更多操作/ });

    fireEvent.click(moreButton);

    const sheet = document.querySelector('dialog.game-sheet');
    expect(sheet).toBeTruthy();
    expect(sheet?.hasAttribute('open')).toBe(true);
    expect(sheet?.textContent).toContain('玩法标签');
  });
});
