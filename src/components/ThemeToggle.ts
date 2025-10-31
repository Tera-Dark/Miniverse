export type ThemeName = 'light' | 'dark';

export interface ThemeToggleControl {
  element: HTMLButtonElement;
  setTheme(theme: ThemeName): void;
}

interface ThemeToggleOptions {
  initial: ThemeName;
  onToggle: (next: ThemeName) => void;
}

const icons: Record<ThemeName, string> = {
  light: '🌞',
  dark: '🌜',
};

export function createThemeToggle(options: ThemeToggleOptions): ThemeToggleControl {
  const { initial, onToggle } = options;
  let currentTheme: ThemeName = initial;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button--ghost theme-toggle';
  button.setAttribute('aria-live', 'polite');

  const icon = document.createElement('span');
  icon.className = 'theme-toggle__icon';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'theme-toggle__label';

  button.append(icon, label);

  const update = (theme: ThemeName) => {
    currentTheme = theme;
    icon.textContent = icons[theme];
    const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    label.textContent = nextLabel;
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    button.setAttribute('data-theme-choice', theme);
  };

  button.addEventListener('click', () => {
    const next: ThemeName = currentTheme === 'light' ? 'dark' : 'light';
    update(next);
    onToggle(next);
  });

  update(initial);

  return {
    element: button,
    setTheme: update,
  };
}
