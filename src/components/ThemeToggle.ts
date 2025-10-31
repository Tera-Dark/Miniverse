export type ThemeMode = 'light' | 'dark';

interface ThemeToggleOptions {
  initial: ThemeMode;
  onToggle: () => void;
}

export interface ThemeToggleInstance {
  element: HTMLButtonElement;
  setTheme: (mode: ThemeMode) => void;
}

const buildTitle = (mode: ThemeMode): string =>
  mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

export const createThemeToggle = (options: ThemeToggleOptions): ThemeToggleInstance => {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.type = 'button';
  button.setAttribute('aria-live', 'polite');

  const icon = document.createElement('span');
  icon.className = 'theme-toggle__icon';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'theme-toggle__label';

  button.append(icon, label);

  let currentMode: ThemeMode = options.initial;

  const setTheme = (mode: ThemeMode): void => {
    currentMode = mode;
    button.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    button.title = buildTitle(mode);
    icon.textContent = mode === 'dark' ? '🌙' : '☀️';
    label.textContent = mode === 'dark' ? 'Dark' : 'Light';
  };

  button.addEventListener('click', () => {
    options.onToggle();
  });

  setTheme(currentMode);

  return {
    element: button,
    setTheme
  };
};
