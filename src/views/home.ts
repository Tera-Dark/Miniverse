import { createButton } from '../components/Button';
import { createCard } from '../components/Card';

export function renderHome(root: HTMLElement): void {
  const hero = document.createElement('section');
  hero.className = 'page-section hero';

  const kicker = document.createElement('p');
  kicker.className = 'hero__kicker';
  kicker.textContent = 'Welcome to Miniverse';

  const title = document.createElement('h1');
  title.className = 'hero__title';
  title.textContent = 'Tiny, rounded worlds crafted for joyful play.';

  const description = document.createElement('p');
  description.className = 'hero__description';
  description.textContent =
    'Miniverse is where playful experiments go live. Explore a growing collection of games built with care for delightful visuals, responsive interactions, and instant deployment to the web.';

  const actions = document.createElement('div');
  actions.className = 'stack';
  const browseButton = createButton({
    label: 'Browse games',
    href: '#/games',
    icon: '🎮',
  });
  actions.append(browseButton);

  hero.append(kicker, title, description, actions);
  root.append(hero);

  const cards = document.createElement('div');
  cards.className = 'card-grid';

  const frameworkCard = createCard({
    title: 'Pluggable game framework',
    description:
      'Games follow a simple contract — init, destroy, and share metadata — so every world can mount cleanly and feel at home within the Miniverse shell.',
    meta: 'Built with TypeScript + Vite',
  });

  const themeCard = createCard({
    title: 'Rounded pastel theme',
    description:
      'Soft shadows, generous radii, and responsive layouts keep each surface polished across light and dark modes.',
    meta: 'Guided by accessible design tokens',
  });

  cards.append(frameworkCard, themeCard);
  root.append(cards);
}
