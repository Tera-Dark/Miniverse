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
      { label: 'Home', path: '/' },
      { label: 'Games', path: '/games' }
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
  eyebrow.textContent = 'Welcome to Miniverse';

  const heading = document.createElement('h1');
  heading.className = 'page-intro__title';
  heading.textContent = 'Tiny, dreamy games with rounded edges';

  const description = document.createElement('p');
  description.className = 'page-intro__text';
  description.textContent =
    'A home for experiments, prototypes, and playful ideas. Each world is lightweight, fast to load, and crafted for calm moments.';

  const actions = document.createElement('div');
  actions.appendChild(
    createButton({
      label: 'Browse games',
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
  highlightsHeading.textContent = 'Why Miniverse?';

  const highlightsCopy = document.createElement('p');
  highlightsCopy.className = 'lead';
  highlightsCopy.textContent =
    'A gentle colour palette, rounded surfaces, and modular building blocks keep every page cohesive. Games mount instantly and clean up when you leave.';

  const highlights = [
    {
      title: 'Rounded minimalism',
      description: 'Soft edges, calm gradients, and pastel glow keep focus on play.'
    },
    {
      title: 'Pluggable games',
      description: 'Each experience implements a tiny API: init, destroy, and metadata.'
    },
    {
      title: 'Pages-ready builds',
      description: 'Vite-powered bundles deploy cleanly to GitHub Pages with zero hassles.'
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
  previewHeading.textContent = 'Featured world';

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
          label: 'Launch sample',
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
  heading.textContent = 'All games';

  const lead = document.createElement('p');
  lead.className = 'lead';
  lead.textContent = 'Pick a world to enter. Games are tiny modules, so they load swiftly and cleanly.';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  const games = listGames();

  if (games.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lead';
    empty.textContent = 'The registry is still warming up. Check back soon for the first adventures!';
    target.append(heading, lead, empty);
  } else {
    games.forEach((game) => {
      const card = createCard({
        title: game.title,
        description: game.description,
        accentColor: game.accentColor,
        footerActions: [
          createButton({
            label: 'Enter world',
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
    label: 'Back to games',
    href: '#/games',
    leadingIcon: '←',
    variant: 'ghost'
  });

  container.append(backLink, heading, description);

  const host = document.createElement('div');
  host.className = 'game-host';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-live', 'polite');
  host.textContent = 'Preparing this universe…';

  target.append(container, host);

  const definition: GameDefinition | undefined = getGameDefinition(gameId);

  let isActive = true;
  let activeModule: GameModule | null = null;

  if (!definition) {
    heading.textContent = 'Game not found';
    description.textContent = "We couldn't find that entry in the registry.";
    host.textContent = 'Try selecting a different world from the games list.';

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
      host.textContent = 'We could not launch this world right now. Please try again later.';
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
  heading.textContent = "We lost this world";

  const description = document.createElement('p');
  description.className = 'page-intro__text';
  description.textContent = 'The address you followed does not exist. Try heading back to the registry.';

  const action = document.createElement('div');
  action.appendChild(createButton({ label: 'Return home', href: '#/' }));

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
