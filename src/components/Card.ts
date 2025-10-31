interface CardOptions {
  title: string;
  description: string;
  accentColor?: string;
  footerActions?: HTMLElement[];
}

export const createCard = (options: CardOptions): HTMLElement => {
  const { title, description, accentColor, footerActions = [] } = options;

  const wrapper = document.createElement('article');
  wrapper.className = 'card';

  if (accentColor) {
    wrapper.style.setProperty('--card-accent', accentColor);
  }

  const heading = document.createElement('h3');
  heading.className = 'card__title';
  heading.textContent = title;

  const body = document.createElement('p');
  body.className = 'card__description';
  body.textContent = description;

  wrapper.append(heading, body);

  if (footerActions.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'card__footer';
    footerActions.forEach((action) => footer.appendChild(action));
    wrapper.appendChild(footer);
  }

  return wrapper;
};
