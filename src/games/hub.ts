import { createButton } from '@/components/Button';
import { getGamePath, type GameId, type RegisteredGameMeta } from '@/games';
import type { GameCategory, GameDifficultyPreset } from '@/games/types';

import cancellationIconUrl from './icons/cancellation-task.svg?url';
import memoryMatrixIconUrl from './icons/memory-matrix.svg?url';
import rhythmTappingIconUrl from './icons/rhythm-tapping.svg?url';
import schulteTableIconUrl from './icons/schulte-table.svg?url';
import stopSignalIconUrl from './icons/stop-signal.svg?url';

type QuickFilter = {
  id: GameCategory;
  label: string;
  description: string;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'attention',
    label: 'Attention',
    description: '需要维持专注、视觉搜索或抑制干扰的体验'
  },
  {
    id: 'memory',
    label: 'Memory',
    description: '训练工作记忆或空间定位的体验'
  },
  {
    id: 'speed',
    label: 'Speed',
    description: '强调节奏、反应时间或流畅性的体验'
  }
];

type GameIconMeta = {
  url: string;
  label: string;
};

const GAME_ICON_MAP: Record<GameId, GameIconMeta> = {
  'cancellation-task': {
    url: cancellationIconUrl,
    label: '图形搜索'
  },
  'memory-matrix': {
    url: memoryMatrixIconUrl,
    label: '记忆矩阵'
  },
  'rhythm-tapping': {
    url: rhythmTappingIconUrl,
    label: '节奏敲击'
  },
  'schulte-table': {
    url: schulteTableIconUrl,
    label: '舒尔特方格'
  },
  'stop-signal': {
    url: stopSignalIconUrl,
    label: '停止信号'
  }
};

const CATEGORY_LABELS: Record<GameCategory, string> = {
  attention: '注意力专注',
  memory: '工作记忆',
  speed: '节奏与反应'
};

const navigateToGame = (id: GameId) => {
  window.location.hash = `#${getGamePath(id)}`;
};

type MountedCard = {
  element: HTMLElement;
  categories: GameCategory[];
  teardown: () => void;
};

type SheetController = {
  open: (game: RegisteredGameMeta) => void;
  close: () => void;
  destroy: () => void;
};

const isCategory = (value: string): value is GameCategory =>
  value === 'attention' || value === 'memory' || value === 'speed';

const createLazyImageLoader = (() => {
  let observer: IntersectionObserver | null = null;

  const ensureObserver = (): IntersectionObserver | null => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return null;
    }

    if (!observer) {
      observer = new IntersectionObserver(
        (entries, instance) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const target = entry.target as HTMLImageElement & { dataset: { src?: string } };
            const src = target.dataset.src;

            if (src) {
              target.src = src;
              delete target.dataset.src;
            }

            instance.unobserve(target);
          });
        },
        { rootMargin: '120px 0px' }
      );
    }

    return observer;
  };

  return (img: HTMLImageElement, src: string) => {
    const wrapper = img.closest('.game-card__media');
    const handleLoad = () => {
      if (wrapper) {
        wrapper.classList.remove('is-loading');
      }
      img.removeEventListener('load', handleLoad);
    };

    const handleError = () => {
      if (wrapper) {
        wrapper.classList.remove('is-loading');
        wrapper.classList.add('is-fallback');
      }
      img.removeEventListener('error', handleError);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.setAttribute('loading', 'lazy');
    img.decoding = 'async';

    const io = ensureObserver();

    if (io) {
      img.dataset.src = src;
      io.observe(img);
    } else {
      img.src = src;
      if (img.complete) {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(handleLoad);
        } else {
          window.setTimeout(handleLoad, 0);
        }
      }
    }
  };
})();

const createActionSheet = (): SheetController => {
  const dialog = document.createElement('dialog');
  dialog.className = 'game-sheet';
  dialog.setAttribute('aria-modal', 'true');
  dialog.dataset.sheet = 'game-actions';

  const close = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  };

  const populateDifficultyList = (presets: GameDifficultyPreset[]): HTMLElement => {
    const list = document.createElement('ul');
    list.className = 'game-sheet__preset-list';

    presets.forEach((preset) => {
      const item = document.createElement('li');
      item.className = 'game-sheet__preset-item';

      const label = document.createElement('span');
      label.className = 'game-sheet__preset-label';
      label.textContent = preset.label;

      item.appendChild(label);

      if (preset.description) {
        const body = document.createElement('p');
        body.className = 'game-sheet__preset-description';
        body.textContent = preset.description;
        item.appendChild(body);
      }

      list.appendChild(item);
    });

    return list;
  };

  const populateTags = (tags: string[]): HTMLElement => {
    const list = document.createElement('ul');
    list.className = 'game-sheet__tag-list';

    tags.forEach((tag) => {
      const item = document.createElement('li');
      item.className = 'game-sheet__tag';
      item.textContent = tag;
      list.appendChild(item);
    });

    return list;
  };

  const open = (game: RegisteredGameMeta) => {
    dialog.innerHTML = '';

    if (!dialog.isConnected) {
      document.body.appendChild(dialog);
    }

    const sheet = document.createElement('article');
    sheet.className = 'game-sheet__panel';
    sheet.style.setProperty('--game-accent', game.accentColor);
    dialog.appendChild(sheet);

    const header = document.createElement('header');
    header.className = 'game-sheet__header';

    const title = document.createElement('h2');
    title.id = 'game-sheet-title';
    title.className = 'game-sheet__title';
    title.textContent = game.title;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'game-sheet__close';
    closeButton.setAttribute('aria-label', '关闭更多操作');
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', close, { once: true });

    header.append(title, closeButton);

    const description = document.createElement('p');
    description.id = 'game-sheet-description';
    description.className = 'game-sheet__description';
    description.textContent = game.description;

    sheet.append(header, description);

    if (game.tags && game.tags.length > 0) {
      const tagsSection = document.createElement('section');
      tagsSection.className = 'game-sheet__section';

      const tagsHeading = document.createElement('h3');
      tagsHeading.className = 'game-sheet__section-title';
      tagsHeading.textContent = '玩法标签';
      tagsSection.append(tagsHeading, populateTags(game.tags));
      sheet.appendChild(tagsSection);
    }

    if (game.difficultyPresets && game.difficultyPresets.length > 0) {
      const presetsSection = document.createElement('section');
      presetsSection.className = 'game-sheet__section';

      const presetsHeading = document.createElement('h3');
      presetsHeading.className = 'game-sheet__section-title';
      presetsHeading.textContent = '难度预设';
      presetsSection.append(presetsHeading, populateDifficultyList(game.difficultyPresets));
      sheet.appendChild(presetsSection);
    }

    const actions = document.createElement('div');
    actions.className = 'game-sheet__actions';

    const playButton = createButton({
      label: '立即开始',
      variant: 'primary',
      type: 'button',
      onClick: () => {
        close();
        navigateToGame(game.id);
      }
    });
    playButton.classList.add('game-sheet__action');

    const detailsButton = createButton({
      label: '查看详情',
      variant: 'secondary',
      href: `#${getGamePath(game.id)}`
    });
    detailsButton.classList.add('game-sheet__action');

    actions.append(playButton, detailsButton);
    sheet.appendChild(actions);

    dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('aria-describedby', description.id);

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch (error) {
        console.warn('Unable to open action sheet as modal dialog', error);
        dialog.setAttribute('open', 'true');
      }
    } else {
      dialog.setAttribute('open', 'true');
    }
  };

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  const destroy = () => {
    close();
    dialog.remove();
  };

  return {
    open,
    close,
    destroy
  };
};

const createGameCard = (
  game: RegisteredGameMeta,
  handlers: {
    onOpenSheet: () => void;
    onNavigate: () => void;
  }
): MountedCard => {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;
  card.dataset.gameId = game.id;
  card.dataset.categories = (game.categories ?? []).join(',');
  card.style.setProperty('--game-accent', game.accentColor);
  card.setAttribute('aria-label', `${game.title}，点击前往开始体验`);

  const media = document.createElement('div');
  media.className = 'game-card__media is-loading';

  const iconMeta = GAME_ICON_MAP[game.id];

  if (iconMeta) {
    const icon = document.createElement('img');
    icon.className = 'game-card__icon';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    createLazyImageLoader(icon, iconMeta.url);
    media.appendChild(icon);
  } else {
    media.classList.add('is-fallback');
    media.classList.remove('is-loading');
    const fallback = document.createElement('span');
    fallback.className = 'game-card__fallback';
    fallback.textContent = game.title.slice(0, 1);
    media.appendChild(fallback);
  }

  const content = document.createElement('div');
  content.className = 'game-card__content';

  const categoryList = document.createElement('p');
  categoryList.className = 'game-card__category';
  const categoryText = (game.categories ?? [])
    .map((category) => CATEGORY_LABELS[category])
    .filter((label): label is string => Boolean(label))
    .join(' · ');
  categoryList.textContent = categoryText;
  if (!categoryText) {
    categoryList.hidden = true;
  }

  const title = document.createElement('h2');
  title.className = 'game-card__title';
  title.textContent = game.title;

  const subtitle = document.createElement('p');
  subtitle.className = 'game-card__subtitle';
  subtitle.textContent = game.description;

  const actions = document.createElement('div');
  actions.className = 'game-card__actions';

  const playButton = createButton({
    label: '立即开始',
    variant: 'primary',
    href: `#${getGamePath(game.id)}`,
    trailingIcon: '→'
  });
  playButton.classList.add('game-card__play');

  const overflowButton = document.createElement('button');
  overflowButton.type = 'button';
  overflowButton.className = 'game-card__more';
  overflowButton.setAttribute('aria-label', `查看 ${game.title} 的更多操作`);
  overflowButton.textContent = '⋯';

  actions.append(playButton, overflowButton);

  content.append(categoryList, title, subtitle, actions);

  card.append(media, content);

  const handleCardClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.game-card__actions')) {
      return;
    }

    handlers.onNavigate();
  };

  const handleCardKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if ((event.target as HTMLElement).closest('.game-card__actions')) {
      return;
    }

    event.preventDefault();
    handlers.onNavigate();
  };

  const handleOverflowClick = (event: MouseEvent) => {
    event.stopPropagation();
    handlers.onOpenSheet();
  };

  card.addEventListener('click', handleCardClick);
  card.addEventListener('keydown', handleCardKeyDown);
  overflowButton.addEventListener('click', handleOverflowClick);

  const teardown = () => {
    card.removeEventListener('click', handleCardClick);
    card.removeEventListener('keydown', handleCardKeyDown);
    overflowButton.removeEventListener('click', handleOverflowClick);
  };

  return {
    element: card,
    categories: game.categories ?? [],
    teardown
  };
};

const applyFilters = (
  cards: Map<GameId, MountedCard>,
  activeFilters: Set<GameCategory>,
  emptyState: HTMLElement
) => {
  let visibleCount = 0;

  cards.forEach((cardInfo) => {
    const { element, categories } = cardInfo;
    const matches =
      activeFilters.size === 0 ||
      categories.some((category) => activeFilters.has(category));

    element.toggleAttribute('hidden', !matches);
    element.setAttribute('aria-hidden', matches ? 'false' : 'true');
    element.tabIndex = matches ? 0 : -1;

    if (matches) {
      visibleCount += 1;
    }
  });

  const isEmpty = visibleCount === 0;
  emptyState.hidden = !isEmpty;
  emptyState.setAttribute('aria-hidden', isEmpty ? 'false' : 'true');
};

const createFilterControls = (
  container: HTMLElement,
  activeFilters: Set<GameCategory>,
  onChange: () => void
): (() => void) => {
  const wrapper = document.createElement('details');
  wrapper.className = 'games-hub__filters';
  wrapper.dataset.component = 'filter-bar';

  const mediaQuery = window.matchMedia('(min-width: 720px)');
  if (mediaQuery.matches) {
    wrapper.open = true;
  }

  const summary = document.createElement('summary');
  summary.className = 'games-hub__filters-summary';
  summary.textContent = '快速筛选';

  const chipGroup = document.createElement('div');
  chipGroup.className = 'games-hub__chip-group';
  chipGroup.setAttribute('role', 'group');
  chipGroup.setAttribute('aria-label', '小游戏标签筛选');

  const filterButtons = new Map<GameCategory, HTMLButtonElement>();

  const updateChipStates = () => {
    filterButtons.forEach((button, id) => {
      const isActive = activeFilters.has(id);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('is-active', isActive);
    });
  };

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'games-hub__chip games-hub__chip--all is-active';
  resetButton.textContent = '全部';
  resetButton.setAttribute('aria-pressed', 'true');
  resetButton.addEventListener('click', () => {
    if (activeFilters.size === 0) {
      return;
    }

    activeFilters.clear();
    resetButton.setAttribute('aria-pressed', 'true');
    resetButton.classList.add('is-active');
    updateChipStates();
    onChange();
  });

  QUICK_FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'games-hub__chip';
    button.dataset.filterId = filter.id;
    button.textContent = filter.label;
    button.title = filter.description;
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('click', () => {
      if (activeFilters.has(filter.id)) {
        activeFilters.delete(filter.id);
      } else {
        activeFilters.add(filter.id);
      }

      if (activeFilters.size === 0) {
        resetButton.setAttribute('aria-pressed', 'true');
        resetButton.classList.add('is-active');
      } else {
        resetButton.setAttribute('aria-pressed', 'false');
        resetButton.classList.remove('is-active');
      }

      updateChipStates();
      onChange();
    });

    filterButtons.set(filter.id, button);
    chipGroup.appendChild(button);
  });

  chipGroup.prepend(resetButton);

  updateChipStates();

  wrapper.append(summary, chipGroup);
  container.appendChild(wrapper);

  const handleMediaChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      wrapper.open = true;
    }
  };

  mediaQuery.addEventListener('change', handleMediaChange);

  const teardown = () => {
    mediaQuery.removeEventListener('change', handleMediaChange);
  };

  return () => {
    teardown();
    wrapper.remove();
  };
};

export const mountGamesHub = (
  target: HTMLElement,
  games: RegisteredGameMeta[]
): (() => void) => {
  target.innerHTML = '';

  const wrapper = document.createElement('section');
  wrapper.className = 'games-hub';
  wrapper.setAttribute('aria-labelledby', 'games-hub-heading');

  const header = document.createElement('header');
  header.className = 'games-hub__header';

  const heading = document.createElement('h1');
  heading.id = 'games-hub-heading';
  heading.className = 'games-hub__title';
  heading.textContent = '小游戏合集';

  const lead = document.createElement('p');
  lead.className = 'games-hub__lead';
  lead.textContent = '简洁的卡片入口、顺手机操作的布局，与迷你程序体验一致。轻触任意卡片即可进入试玩。';

  header.append(heading, lead);
  wrapper.appendChild(header);

  const activeFilters = new Set<GameCategory>();

  const filterCleanup = createFilterControls(wrapper, activeFilters, () => {
    applyFilters(cards, activeFilters, emptyState);
  });

  const grid = document.createElement('div');
  grid.className = 'games-hub__grid';
  grid.setAttribute('role', 'list');

  const emptyState = document.createElement('p');
  emptyState.className = 'games-hub__empty';
  emptyState.textContent = '暂未找到符合筛选条件的小游戏，试试切换筛选标签。';
  emptyState.hidden = true;
  emptyState.setAttribute('role', 'status');
  emptyState.setAttribute('aria-live', 'polite');
  emptyState.setAttribute('aria-hidden', 'true');

  wrapper.append(grid, emptyState);

  target.appendChild(wrapper);

  const cards = new Map<GameId, MountedCard>();
  const sheet = createActionSheet();

  games.forEach((game) => {
    const mounted = createGameCard(game, {
      onOpenSheet: () => sheet.open(game),
      onNavigate: () => navigateToGame(game.id)
    });

    cards.set(game.id, mounted);
    grid.appendChild(mounted.element);
  });

  applyFilters(cards, activeFilters, emptyState);

  const cleanup = () => {
    sheet.destroy();
    filterCleanup();
    cards.forEach((card) => card.teardown());
    cards.clear();
    wrapper.remove();
  };

  return cleanup;
};
