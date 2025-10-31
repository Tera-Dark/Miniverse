import type { ThemeToggleControl } from './ThemeToggle';

interface NavLink {
  label: string;
  href: string;
  match?: (path: string) => boolean;
}

interface HeaderOptions {
  links: NavLink[];
  themeToggle: ThemeToggleControl;
}

export interface HeaderControl {
  element: HTMLElement;
  setActive(path: string): void;
}

export function createHeader(options: HeaderOptions): HeaderControl {
  const { links, themeToggle } = options;

  const header = document.createElement('header');
  header.className = 'site-header surface';

  const inner = document.createElement('div');
  inner.className = 'container site-header__inner';

  const brand = document.createElement('a');
  brand.href = '#/';
  brand.className = 'brand';

  const badge = document.createElement('span');
  badge.className = 'brand__badge';
  badge.textContent = 'MV';

  const brandLabel = document.createElement('span');
  brandLabel.textContent = 'Miniverse';

  brand.append(badge, brandLabel);

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Primary navigation');

  const navLinks = links.map((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.className = 'site-nav__link';
    anchor.textContent = link.label;
    anchor.dataset.path = link.href;
    return { anchor, link };
  });

  navLinks.forEach(({ anchor }) => nav.append(anchor));
  nav.append(themeToggle.element);

  inner.append(brand, nav);
  header.append(inner);

  const setActive = (path: string) => {
    navLinks.forEach(({ anchor, link }) => {
      const matcher = link.match ?? ((linkPath: string) => linkPath === path);
      const isActive = matcher(path.replace(/\/$/, '')) || matcher(path);
      anchor.classList.toggle('is-active', isActive);
      anchor.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  };

  return {
    element: header,
    setActive,
  };
}
