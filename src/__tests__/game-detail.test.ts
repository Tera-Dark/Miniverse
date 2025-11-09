import { within } from '@testing-library/dom';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { GameDefinition } from '@/games';
import { renderGameDetail } from '@/games/detail';
import { createDomHost } from '@/test/test-utils';

describe('game detail', () => {
  let cleanup: (() => void) | null = null;
  let host: HTMLElement;

  beforeEach(() => {
    host = createDomHost();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  const createMockGameDefinition = (overrides: Partial<GameDefinition> = {}): GameDefinition => ({
    id: 'memory-matrix',
    title: 'Test Game',
    description: 'A test game for unit testing',
    accentColor: '#6366f1',
    tags: ['puzzle', 'logic'],
    difficultyPresets: [
      {
        id: 'easy',
        label: '简单',
        description: '适合初学者'
      },
      {
        id: 'hard',
        label: '困难',
        description: '适合有经验的玩家'
      }
    ],
    loader: vi.fn().mockResolvedValue({
      init: vi.fn(),
      destroy: vi.fn(),
      getMeta: vi.fn().mockReturnValue({
        id: 'memory-matrix',
        title: 'Test Game',
        description: 'A test game for unit testing',
        accentColor: '#6366f1',
        tags: ['puzzle', 'logic'],
        difficultyPresets: [
          {
            id: 'easy',
            label: '简单',
            description: '适合初学者'
          },
          {
            id: 'hard',
            label: '困难',
            description: '适合有经验的玩家'
          }
        ]
      })
    }),
    ...overrides
  });

  it('renders game detail with glass design classes', () => {
    const definition = createMockGameDefinition();
    cleanup = renderGameDetail(host, definition);
    const queries = within(host);

    // Check that the main container uses the new glass design class
    const gameDetail = host.querySelector('.game-detail');
    expect(gameDetail).toBeTruthy();
    expect(gameDetail).toHaveClass('game-detail');

    // Check that header section exists
    const header = host.querySelector('.game-detail__header');
    expect(header).toBeTruthy();

    // Check that title and description use new classes
    const title = queries.getByRole('heading', { name: 'Test Game' });
    expect(title).toHaveClass('game-detail__title');

    const description = queries.getByText('A test game for unit testing');
    expect(description).toHaveClass('game-detail__description');

    // Check that back button exists
    const backButton = queries.getByRole('link', { name: '返回小游戏列表' });
    expect(backButton).toBeTruthy();
  });

  it('renders metadata sections with glass styling', () => {
    const definition = createMockGameDefinition();
    cleanup = renderGameDetail(host, definition);

    // Check metadata container
    const metadata = host.querySelector('.game-detail__metadata');
    expect(metadata).toBeTruthy();

    // Check tags section
    const tagsSection = host.querySelector('.game-detail__section');
    expect(tagsSection).toBeTruthy();

    const tagsTitle = host.querySelector('.game-detail__section-title');
    expect(tagsTitle?.textContent).toBe('玩法标签');

    // Check tags list
    const tagsList = host.querySelector('.game-detail__tags');
    expect(tagsList).toBeTruthy();

    const tags = host.querySelectorAll('.game-detail__tag');
    expect(tags.length).toBe(2);
    expect(tags[0].textContent).toBe('puzzle');
    expect(tags[1].textContent).toBe('logic');

    // Check presets section
    const presetsTitle = Array.from(host.querySelectorAll('.game-detail__section-title'))
      .find(el => el.textContent === '难度预设');
    expect(presetsTitle).toBeTruthy();

    const presetsList = host.querySelector('.game-detail__presets');
    expect(presetsList).toBeTruthy();

    const presets = host.querySelectorAll('.game-detail__preset');
    expect(presets.length).toBe(2);

    const presetLabels = host.querySelectorAll('.game-detail__preset-label');
    expect(presetLabels[0].textContent).toBe('简单');
    expect(presetLabels[1].textContent).toBe('困难');

    const presetDescriptions = host.querySelectorAll('.game-detail__preset-description');
    expect(presetDescriptions[0].textContent).toBe('适合初学者');
    expect(presetDescriptions[1].textContent).toBe('适合有经验的玩家');
  });

  it('renders game host with glass styling', () => {
    const definition = createMockGameDefinition();
    cleanup = renderGameDetail(host, definition);

    const gameHost = host.querySelector('.game-host');
    expect(gameHost).toBeTruthy();
    expect(gameHost).toHaveAttribute('role', 'region');
    expect(gameHost).toHaveAttribute('aria-live', 'polite');
    
    // Should show loading message initially
    expect(gameHost?.textContent).toContain('正在装载这个小游戏');
  });

  it('applies accent color CSS custom property', () => {
    const definition = createMockGameDefinition({ accentColor: '#ef4444' });
    cleanup = renderGameDetail(host, definition);

    const gameDetail = host.querySelector('.game-detail');
    expect(gameDetail).toBeTruthy();
    
    const computedStyle = getComputedStyle(gameDetail!);
    expect(computedStyle.getPropertyValue('--game-accent').trim()).toBe('#ef4444');
  });

  it('hides metadata sections when no content', () => {
    const definition = createMockGameDefinition({
      tags: [],
      difficultyPresets: []
    });
    cleanup = renderGameDetail(host, definition);

    // Metadata should be hidden when no tags or presets
    const metadata = host.querySelector('.game-detail__metadata');
    expect(metadata).toBeTruthy();
    expect(metadata).toHaveAttribute('hidden');

    // Individual sections should also be hidden
    const tagsSection = host.querySelector('.game-detail__section');
    expect(tagsSection).toHaveAttribute('hidden');
  });

  it('cleans up properly when destroyed', () => {
    const definition = createMockGameDefinition();
    cleanup = renderGameDetail(host, definition);

    // Verify content exists initially
    expect(host.querySelector('.game-detail')).toBeTruthy();
    expect(host.querySelector('.game-host')).toBeTruthy();

    // Call cleanup
    cleanup?.();

    // Verify content is removed
    expect(host.querySelector('.game-detail')).toBeFalsy();
    expect(host.querySelector('.game-host')).toBeFalsy();
    expect(host.innerHTML).toBe('');
  });
});
