import { createButton } from '../components/Button';
import { getGameDefinition, loadGame } from '../games';

export async function renderGameDetail(
  root: HTMLElement,
  id: string,
  theme: 'light' | 'dark',
): Promise<() => void> {
  const section = document.createElement('section');
  section.className = 'page-section';

  const heading = document.createElement('div');
  heading.className = 'stack';

  const title = document.createElement('h1');
  title.textContent = 'Loading game…';

  const backButton = createButton({
    label: 'Back to games',
    href: '#/games',
    variant: 'link',
    icon: '←',
  });

  heading.append(backButton, title);
  section.append(heading);

  const stage = document.createElement('div');
  stage.className = 'game-stage';
  section.append(stage);

  root.append(section);

  const definition = getGameDefinition(id);
  if (!definition) {
    title.textContent = 'Game not found';
    stage.textContent = 'We could not find that entry in the Miniverse registry.';
    return () => {
      stage.textContent = '';
    };
  }

  title.textContent = definition.title;

  const module = await loadGame(id);
  if (!module) {
    stage.textContent = 'The game failed to load. Please try again later.';
    return () => {
      stage.textContent = '';
    };
  }

  const meta = module.getMeta();

  const description = document.createElement('p');
  description.className = 'hero__description';
  description.textContent = meta.description;
  heading.append(description);

  if (meta.author) {
    const author = document.createElement('p');
    author.className = 'card__meta';
    author.textContent = `Created by ${meta.author}`;
    heading.append(author);
  }

  await module.init(stage, { theme });

  return async () => {
    await module.destroy();
    stage.textContent = '';
  };
}
