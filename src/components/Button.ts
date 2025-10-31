export type ButtonVariant = 'primary' | 'ghost' | 'link';

interface ButtonOptions {
  label: string;
  href?: string;
  onClick?: (event: MouseEvent) => void;
  variant?: ButtonVariant;
  icon?: string;
}

export function createButton(options: ButtonOptions): HTMLAnchorElement | HTMLButtonElement {
  const { label, href, onClick, variant = 'primary', icon } = options;
  const element = href ? document.createElement('a') : document.createElement('button');

  element.className = `button button--${variant}`;
  element.setAttribute('data-variant', variant);

  if (href) {
    element.setAttribute('href', href);
  } else {
    (element as HTMLButtonElement).type = 'button';
  }

  if (onClick) {
    element.addEventListener('click', (event) => {
      onClick(event as MouseEvent);
    });
  }

  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'button__icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = icon;
    element.append(iconSpan);
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = 'button__label';
  labelSpan.textContent = label;
  element.append(labelSpan);

  return element;
}
