interface NavLink {
  label: string;
  path: string;
}

interface HeaderOptions {
  links: NavLink[];
  themeToggle: HTMLElement;
}

export interface HeaderInstance {
  element: HTMLElement;
  setActive: (path: string) => void;
}

const normalizePath = (value: string): string => {
  if (!value) {
    return '/';
  }

  let next = value;

  if (next.startsWith('#')) {
    next = next.slice(1);
  }

  if (!next.startsWith('/')) {
    next = `/${next}`;
  }

  if (next.length > 1 && next.endsWith('/')) {
    next = next.replace(/\/+$/, '');
  }

  return next || '/';
};

export const createHeader = (options: HeaderOptions): HeaderInstance => {
  const header = document.createElement('header');
  header.className = 'app-header';

  const bar = document.createElement('div');
  bar.className = 'app-header__bar';

  const branding = document.createElement('a');
  branding.className = 'app-header__title';
  branding.href = '#/';
  branding.textContent = '迷你宇宙';

  const nav = document.createElement('nav');
  nav.className = 'app-nav';

  const anchors: Array<{ node: HTMLAnchorElement; path: string }> = [];

  options.links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.className = 'app-nav__link';
    const normalized = normalizePath(link.path);
    anchor.href = `#${normalized}`;
    anchor.textContent = link.label;
    nav.appendChild(anchor);
    anchors.push({ node: anchor, path: normalized });
  });

  const actions = document.createElement('div');
  actions.className = 'app-header__actions';
  actions.appendChild(options.themeToggle);

  bar.append(branding, nav, actions);
  header.appendChild(bar);

  const setActive = (path: string): void => {
    const normalized = normalizePath(path);
    anchors.forEach(({ node, path: linkPath }) => {
      node.classList.toggle('is-active', linkPath === normalized);
    });
  };

  return {
    element: header,
    setActive
  };
};
