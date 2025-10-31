import { createButton } from '../components/Button';
import { createCard } from '../components/Card';
import { listGames } from '../games';

export function renderGames(root: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'page-section';

  const title = document.createElement('h1');
  title.textContent = 'Games';

  const intro = document.createElement('p');
  intro.className = 'hero__description';
  intro.textContent =
    'Each game plugs into the same lifecycle. Pick one to see the loader mount it instantly.';

  section.append(title, intro);

  const cards = document.createElement('div');
  cards.className = 'card-grid';

  listGames().forEach((game) => {
    const card = createCard({
      title: game.title,
      description: game.summary,
      meta: game.tags?.join(' · '),
      actions: [
        createButton({
          label: 'Launch',
          href: `#/games/${game.id}`,
          variant: 'ghost',
          icon: '🚀',
        }),
      ],
    });
    cards.append(card);
  });

  section.append(cards);
  root.append(section);
}
