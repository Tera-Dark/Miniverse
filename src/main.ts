import './theme.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { createButton } from './components/Button';
import { createCard } from './components/Card';
import { createFooter } from './components/Footer';
import { createHeader } from './components/Header';
import { createThemeToggle, type ThemeMode } from './components/ThemeToggle';
import { HashRouter } from './router';
import { getGameDefinition, listGames } from './games';
import type { GameDefinition } from './games';
import type { GameModule } from './games/types';

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
    links: [
      { label: '首页', path: '/' },
      { label: '小游戏', path: '/games' }
    ],
    themeToggle: themeToggle.element
  });

  const main = document.createElement('main');
  main.className = 'app-main';

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

const renderHome = (target: HTMLElement): (() => void) => {
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
      href: '#/games',
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

  const games = listGames();
  if (games.length > 0) {
    const first = games[0];
    const previewCard = createCard({
      title: first.title,
      description: first.description,
      accentColor: first.accentColor,
      footerActions: [
        createButton({
          label: '开始体验',
          href: `#/games/${first.id}`,
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

const renderGamesList = (target: HTMLElement): (() => void) => {
  target.innerHTML = '';

  const heading = document.createElement('h1');
  heading.className = 'section-title';
  heading.textContent = '全部小游戏';

  const lead = document.createElement('p');
  lead.className = 'lead';
  lead.textContent = '挑选一个世界进入，所有小游戏都轻量快速，随开即玩。';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  const games = listGames();

  if (games.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lead';
    empty.textContent = '小游戏列表还在加载中，请稍后再来探索新的灵感！';
    target.append(heading, lead, empty);
  } else {
    games.forEach((game) => {
      const card = createCard({
        title: game.title,
        description: game.description,
        accentColor: game.accentColor,
        footerActions: [
          createButton({
            label: '进入世界',
            href: `#/games/${game.id}`,
            trailingIcon: '→'
          })
        ]
      });

      grid.appendChild(card);
    });

    target.append(heading, lead, grid);
  }

  return () => {
    target.innerHTML = '';
  };
};

const renderGameDetail = (target: HTMLElement, gameId: string): (() => void) => {
  target.innerHTML = '';

  const container = document.createElement('section');
  container.className = 'game-meta';

  const heading = document.createElement('h1');
  heading.className = 'game-meta__title';

  const description = document.createElement('p');
  description.className = 'game-meta__description';

  const backLink = createButton({
    label: '返回小游戏列表',
    href: '#/games',
    leadingIcon: '←',
    variant: 'ghost'
  });

  container.append(backLink, heading, description);

  const host = document.createElement('div');
  host.className = 'game-host';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-live', 'polite');
  host.textContent = '正在装载这个小游戏…';

  target.append(container, host);

  const definition: GameDefinition | undefined = getGameDefinition(gameId);

  let isActive = true;
  let activeModule: GameModule | null = null;

  if (!definition) {
    heading.textContent = '未找到小游戏';
    description.textContent = '没有找到对应的条目。';
    host.textContent = '请返回列表选择其他小游戏。';

    return () => {
      target.innerHTML = '';
    };
  }

  container.style.setProperty('--game-accent', definition.accentColor);
  heading.textContent = definition.title;
  description.textContent = definition.description;

  definition
    .loader()
    .then((module) => {
      if (!isActive) {
        module.destroy();
        return;
      }

      activeModule = module;
      const meta = module.getMeta();
      heading.textContent = meta.title;
      description.textContent = meta.description;
      container.style.setProperty('--game-accent', meta.accentColor);
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
  const { main, header } = initializeShell();

  const router = new HashRouter();

  router.register('/', () => renderHome(main));
  router.register('/games', () => renderGamesList(main));
  router.register('/games/:id', ({ params }) => renderGameDetail(main, params.id));
  router.setNotFound(() => renderNotFound(main));

  router.onChange((path) => {
    header.setActive(path);
    window.scrollTo({ top: 0, left: 0 });
  });

  router.start();
};

bootstrap();
