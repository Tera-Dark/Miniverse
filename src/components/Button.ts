type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonElement = HTMLButtonElement | HTMLAnchorElement;

interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  leadingIcon?: string;
  trailingIcon?: string;
  onClick?: (event: MouseEvent) => void;
}

const applyVariant = (element: ButtonElement, variant: ButtonVariant): void => {
  element.classList.add('button', `button--${variant}`);
};

export const createButton = (options: ButtonOptions): ButtonElement => {
  const { label, href, type = 'button', variant = 'primary', leadingIcon, trailingIcon, onClick } = options;

  const element: ButtonElement = href ? document.createElement('a') : document.createElement('button');

  applyVariant(element, variant);

  const parts: HTMLElement[] = [];

  if (leadingIcon) {
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = leadingIcon;
    parts.push(icon);
  }

  const text = document.createElement('span');
  text.textContent = label;
  parts.push(text);

  if (trailingIcon) {
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = trailingIcon;
    parts.push(icon);
  }

  parts.forEach((part) => element.appendChild(part));

  if (element instanceof HTMLButtonElement) {
    element.type = type;
  } else if (element instanceof HTMLAnchorElement && href) {
    element.setAttribute('href', href);
  }

  if (onClick) {
    const handleClick: EventListener = (event) => {
      onClick(event as MouseEvent);
    };

    element.addEventListener('click', handleClick);
  }

  return element;
};
