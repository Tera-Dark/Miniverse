import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/games.css';
import './theme.css';

import { createButton } from './components/Button';
import { createCard } from './components/Card';
import { createFooter } from './components/Footer';
import { createHeader } from './components/Header';
import { createThemeToggle, type ThemeMode } from './components/ThemeToggle';
import {
  getGameDefinition,
  getGamePath,
  gamesIndexPath,
  isGameId,
  listGames
} from './games';
import type { GameDefinition, RegisteredGameMeta } from './games';
import { mountGamesHub } from './games/hub';
import type { GameMeta, GameModule } from './games/types';
import { HashRouter } from './router';

const THEME_STORAGE_KEY = 'miniverse:theme';

interface ThemeController {
  getTheme: () => ThemeMode;
  setTheme: (mode: ThemeMode, persist?: boolean) => void;
  toggle: () => void;
  subscribe: (listener: (mode: ThemeMode) => void) => () => void;
}

const createThemeController = (): ThemeController => {
  let current: ThemeMode = 'light';
  let manualOverride = false;
  const listeners: Array<(mode: ThemeMode) => void> = [];
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const dispatch = () => {
    listeners.forEach((listener) => listener(current));
  };

  const applyTheme = (mode: ThemeMode): void => {
    current = mode;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    dispatch();
  };

  const setTheme = (mode: ThemeMode, persist = true): void => {
    applyTheme(mode);

    if (persist) {
      manualOverride = true;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (error) {
        console.warn('Unable to persist theme preference', error);
      }
    }
  };

  const toggle = (): void => {
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  const subscribe = (listener: (mode: ThemeMode) => void): (() => void) => {
    listeners.push(listener);
    listener(current);

    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  };

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;

    if (stored === 'light' || stored === 'dark') {
      manualOverride = true;
      applyTheme(stored);
    } else {
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
    }
  } catch (error) {
    console.warn('Unable to read stored theme preference', error);
    applyTheme(mediaQuery.matches ? 'dark' : 'light');
  }

  mediaQuery.addEventListener('change', (event) => {
    if (manualOverride) {
      return;
    }

    applyTheme(event.matches ? 'dark' : 'light');
  });

  return {
    getTheme: () => current,
    setTheme,
    toggle,
    subscribe
  };
};

const initializeShell = () => {
  const root = document.querySelector<HTMLDivElement>('#app');

  if (!root) {
    throw new Error('App container not found');
  }

  const themeController = createThemeController();
  const themeToggle = createThemeToggle({
    initial: themeController.getTheme(),
    onToggle: () => themeController.toggle()
  });
  themeController.subscribe((mode) => themeToggle.setTheme(mode));

  const header = createHeader({
    themeToggle: themeToggle.element
  });

  const main = document.createElement('main');
  main.className = 'app-main';
  main.setAttribute('tabindex', '-1');

  const footer = createFooter();

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.append(header.element, main, footer);
  root.appendChild(shell);

  return {
    main,
    header
  };
};

const renderHome = (target: HTMLElement, games: RegisteredGameMeta[]): (() => void) => {
  target.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'page-intro';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'page-intro__eyebrow';
  eyebrow.textContent = '欢迎来到迷你宇宙';

  const heading = document.createElement('h1');
  heading.className = 'page-intro__title';
  heading.textContent = '轻盈梦幻的圆角小游戏世界';

  const description = document.createElement('p');
  description.className = 'page-intro__text';
  description.textContent =
    '这里收纳实验性的灵感原型与趣味小游戏，每个世界都轻盈、即刻加载，陪你享受片刻的专注。';

  const actions = document.createElement('div');
  actions.appendChild(
    createButton({
      label: '浏览小游戏',
      href: `#${gamesIndexPath}`,
      trailingIcon: '→'
    })
  );

  section.append(eyebrow, heading, description, actions);

  const highlightsSection = document.createElement('section');
  highlightsSection.setAttribute('aria-labelledby', 'highlights-heading');

  const highlightsHeading = document.createElement('h2');
  highlightsHeading.id = 'highlights-heading';
  highlightsHeading.className = 'section-title';
  highlightsHeading.textContent = '为什么选择迷你宇宙？';

  const highlightsCopy = document.createElement('p');
  highlightsCopy.className = 'lead';
  highlightsCopy.textContent =
    '柔和的配色、圆润的界面与模块化组件让每一页都保持统一质感，小游戏加载迅速，离开时也能干净收尾。';

  const highlights = [
    {
      title: '圆润的极简设计',
      description: '柔和的边角、舒缓的渐变与淡雅的光晕，让注意力回归玩法本身。'
    },
    {
      title: '模块化小游戏',
      description: '每个体验都遵循统一的 init / destroy / metadata 接口，随取随用。'
    },
    {
      title: '即刻部署的构建',
      description: '基于 Vite 的构建可无缝发布到 GitHub Pages，零配置上手。'
    }
  ];

  const palette = ['#c4b5fd', '#f9a8d4', '#fde68a'];

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  highlights.forEach((entry, index) => {
    const card = createCard({
      title: entry.title,
      description: entry.description,
      accentColor: palette[index % palette.length]
    });
    grid.appendChild(card);
  });

  highlightsSection.append(highlightsHeading, highlightsCopy, grid);

  const gamesPreview = document.createElement('section');
  gamesPreview.setAttribute('aria-labelledby', 'preview-heading');

  const previewHeading = document.createElement('h2');
  previewHeading.id = 'preview-heading';
  previewHeading.className = 'section-title';
  previewHeading.textContent = '精选体验';

  const previewGrid = document.createElement('div');
  previewGrid.className = 'cards-grid';

  if (games.length > 0) {
    const first = games[0];
    const previewCard = createCard({
      title: first.title,
      description: first.description,
      accentColor: first.accentColor,
      footerActions: [
        createButton({
          label: '开始体验',
          href: `#${getGamePath(first.id)}`,
          variant: 'primary',
          trailingIcon: '↗'
        })
      ]
    });

    previewGrid.appendChild(previewCard);
    gamesPreview.append(previewHeading, previewGrid);
  }

  target.append(section, highlightsSection);
  if (previewGrid.childElementCount > 0) {
    target.appendChild(gamesPreview);
  }

  return () => {
    target.innerHTML = '';
  };
};


const renderGameDetail = (target: HTMLElement, definition: GameDefinition): (() => void) => {
  target.innerHTML = '';

  const container = document.createElement('section');
  container.className = 'game-meta';

  const heading = document.createElement('h1');
  heading.className = 'game-meta__title';

  const description = document.createElement('p');
  description.className = 'game-meta__description';

  const backLink = createButton({
    label: '返回小游戏列表',
    href: `#${gamesIndexPath}`,
    leadingIcon: '←',
    variant: 'ghost'
  });

  const metadata = document.createElement('div');
  metadata.className = 'game-meta__metadata';

  const tagsSection = document.createElement('div');
  tagsSection.className = 'game-meta__section';
  const tagsTitle = document.createElement('p');
  tagsTitle.className = 'game-meta__section-title';
  tagsTitle.textContent = '玩法标签';
  const tagsList = document.createElement('ul');
  tagsList.className = 'game-meta__tags';
  tagsSection.append(tagsTitle, tagsList);

  const presetsSection = document.createElement('div');
  presetsSection.className = 'game-meta__section';
  const presetsTitle = document.createElement('p');
  presetsTitle.className = 'game-meta__section-title';
  presetsTitle.textContent = '难度预设';
  const presetsList = document.createElement('ul');
  presetsList.className = 'game-meta__presets';
  presetsSection.append(presetsTitle, presetsList);

  metadata.append(tagsSection, presetsSection);

  container.append(backLink, heading, description, metadata);

  const host = document.createElement('div');
  host.className = 'game-host';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-live', 'polite');
  host.textContent = '正在装载这个小游戏…';

  target.append(container, host);

  let isActive = true;
  let activeModule: GameModule | null = null;

  const updateMetadataVisibility = () => {
    const hasTags = tagsList.childElementCount > 0;
    const hasPresets = presetsList.childElementCount > 0;
    metadata.hidden = !hasTags && !hasPresets;
    tagsSection.hidden = !hasTags;
    presetsSection.hidden = !hasPresets;
  };

  const syncTags = (tags: GameDefinition['tags']) => {
    tagsList.innerHTML = '';

    if (!tags || tags.length === 0) {
      updateMetadataVisibility();
      return;
    }

    tags.forEach((tag) => {
      const item = document.createElement('li');
      item.className = 'game-meta__tag';
      item.textContent = tag;
      tagsList.appendChild(item);
    });

    updateMetadataVisibility();
  };

  const syncPresets = (presets: GameDefinition['difficultyPresets']) => {
    presetsList.innerHTML = '';

    if (!presets || presets.length === 0) {
      updateMetadataVisibility();
      return;
    }

    presets.forEach((preset) => {
      const item = document.createElement('li');
      item.className = 'game-meta__preset';
      item.dataset.presetId = preset.id;

      const label = document.createElement('span');
      label.className = 'game-meta__preset-label';
      label.textContent = preset.label;

      item.appendChild(label);

      if (preset.description) {
        const body = document.createElement('p');
        body.className = 'game-meta__preset-description';
        body.textContent = preset.description;
        item.appendChild(body);
      }

      presetsList.appendChild(item);
    });

    updateMetadataVisibility();
  };

  const applyMeta = (meta: GameMeta) => {
    heading.textContent = meta.title;
    description.textContent = meta.description;
    container.style.setProperty('--game-accent', meta.accentColor);
    syncTags(meta.tags ?? definition.tags);
    syncPresets(meta.difficultyPresets ?? definition.difficultyPresets);
  };

  applyMeta(definition);

  definition
    .loader()
    .then((module) => {
      if (!isActive) {
        module.destroy();
        return;
      }

      activeModule = module;
      const meta = module.getMeta();
      applyMeta(meta);
      host.textContent = '';

      module.init(host, {});
    })
    .catch((error) => {
      if (!isActive) {
        return;
      }

      console.error('Failed to load game module', error);
      host.textContent = '当前无法加载该小游戏，请稍后再试。';
    });

  updateMetadataVisibility();

  return () => {
    isActive = false;

    if (activeModule) {
      try {
        activeModule.destroy();
      } catch (error) {
        console.error('Error while tearing down game module', error);
      }
    }

    activeModule = null;
    target.innerHTML = '';
  };
};

const renderNotFound = (target: HTMLElement): (() => void) => {
  target.innerHTML = '';

  const message = document.createElement('section');
  message.className = 'page-intro';

  const heading = document.createElement('h1');
  heading.className = 'page-intro__title';
  heading.textContent = '没有找到这个页面';

  const description = document.createElement('p');
  description.className = 'page-intro__text';
  description.textContent = '你访问的地址不存在，请返回首页继续探索。';

  const action = document.createElement('div');
  action.appendChild(createButton({ label: '返回首页', href: '#/' }));

  message.append(heading, description, action);
  target.appendChild(message);

  return () => {
    target.innerHTML = '';
  };
};

const bootstrap = () => {
  const gamesCatalog = listGames();
  const { main, header } = initializeShell();

  const router = new HashRouter();

  router.register('/', () => renderHome(main, gamesCatalog));
  router.register(gamesIndexPath, () => mountGamesHub(main, gamesCatalog));
  router.register('/games/:id', ({ params }) => {
    const candidate = params.id;

    if (!candidate || !isGameId(candidate)) {
      return renderNotFound(main);
    }

    const definition = getGameDefinition(candidate);

    if (!definition) {
      return renderNotFound(main);
    }

    return renderGameDetail(main, definition);
  });
  router.setNotFound(() => renderNotFound(main));

  router.onChange((path) => {
    header.setActive(path);
    window.scrollTo({ top: 0, left: 0 });
    try {
      main.focus({ preventScroll: true });
    } catch (_error) {
      main.focus();
    }
  });

  router.start();
};

bootstrap();
