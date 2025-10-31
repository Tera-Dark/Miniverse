interface CardOptions {
  title: string;
  description: string;
  meta?: string;
  actions?: (HTMLAnchorElement | HTMLButtonElement)[];
}

export function createCard(options: CardOptions): HTMLElement {
  const { title, description, meta, actions = [] } = options;
  const card = document.createElement('article');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'stack';

  const titleEl = document.createElement('h3');
  titleEl.className = 'card__title';
  titleEl.textContent = title;
  header.append(titleEl);

  if (meta) {
    const metaEl = document.createElement('p');
    metaEl.className = 'card__meta';
    metaEl.textContent = meta;
    header.append(metaEl);
  }

  card.append(header);

  const descriptionEl = document.createElement('p');
  descriptionEl.className = 'card__description';
  descriptionEl.textContent = description;
  card.append(descriptionEl);

  if (actions.length) {
    const footer = document.createElement('div');
    footer.className = 'card__footer';
    actions.forEach((action) => footer.append(action));
    card.append(footer);
  }

  return card;
}
