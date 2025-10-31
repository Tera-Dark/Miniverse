import './theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/game.css';

import { createFooter } from './components/Footer';
import { createHeader } from './components/Header';
import { createThemeToggle, type ThemeName, type ThemeToggleControl } from './components/ThemeToggle';
import { initRouter, type RouteDefinition } from './router';
import { renderGameDetail } from './views/game-detail';
import { renderGames } from './views/games';
import { renderHome } from './views/home';

const THEME_STORAGE_KEY = 'miniverse-theme';

const getStoredTheme = (): ThemeName | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to access localStorage for theme preference.', error);
  }
  return null;
};

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

let currentTheme: ThemeName = getStoredTheme() ?? (prefersDark.matches ? 'dark' : 'light');

let themeToggleControl: ThemeToggleControl | null = null;

const applyTheme = (next: ThemeName, persist = true) => {
  currentTheme = next;
  document.documentElement.dataset.theme = next;
  themeToggleControl?.setTheme(next);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      console.warn('Unable to persist theme preference.', error);
    }
  }
};

const themeToggle = createThemeToggle({
  initial: currentTheme,
  onToggle: (next) => applyTheme(next),
});

themeToggleControl = themeToggle;

applyTheme(currentTheme, false);

if (!getStoredTheme()) {
  prefersDark.addEventListener('change', (event) => {
    const nextTheme: ThemeName = event.matches ? 'dark' : 'light';
    applyTheme(nextTheme, false);
  });
}

const header = createHeader({
  themeToggle,
  links: [
    { label: 'Home', href: '#/', match: (path) => path === '/' },
    { label: 'Games', href: '#/games', match: (path) => path.startsWith('/games') },
  ],
});

const footer = createFooter();

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root element not found');
}

const shell = document.createElement('div');
shell.className = 'app-shell';

const mainEl = document.createElement('main');
mainEl.className = 'main-content surface';

const viewRoot = document.createElement('div');
viewRoot.className = 'container';
mainEl.append(viewRoot);

shell.append(header.element, mainEl, footer);
app.append(shell);

const routes: RouteDefinition[] = [
  {
    path: '/',
    handler: ({ root }) => {
      renderHome(root);
    },
  },
  {
    path: '/games',
    handler: ({ root }) => {
      renderGames(root);
    },
  },
  {
    path: '/games/:id',
    handler: ({ root, params }) => {
      const id = params.id ?? '';
      return renderGameDetail(root, id, currentTheme);
    },
  },
];

initRouter({
  root: viewRoot,
  routes,
  notFound: ({ root }) => {
    const message = document.createElement('p');
    message.textContent = 'The page you are looking for could not be found.';
    root.append(message);
  },
  onRouteChange: (path) => {
    header.setActive(path);
  },
});
