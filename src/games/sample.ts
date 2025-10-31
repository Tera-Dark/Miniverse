import type { GameInitOptions, GameMeta, GameModule } from './index';

const meta: GameMeta = {
  id: 'sample',
  title: 'Sample Nebula',
  description: 'A soft, looping animation to verify the Miniverse game lifecycle.',
  author: 'Miniverse Core',
  tags: ['demo'],
};

const createPalette = (theme: GameInitOptions['theme']) =>
  theme === 'dark'
    ? ['#9cb6ff', '#f6d5ff', '#ffdede']
    : ['#715cff', '#ffbad7', '#ffd98f'];

let teardown: (() => void) | null = null;

const sampleGame: GameModule = {
  init(container: HTMLElement, options?: GameInitOptions) {
    if (teardown) {
      teardown();
      teardown = null;
    }

    container.classList.add('game-stage');

    const theme = options?.theme ?? 'light';
    const palette = createPalette(theme);

    const wrapper = document.createElement('div');
    wrapper.className = 'sample-game';

    const title = document.createElement('h3');
    title.textContent = meta.title;

    const body = document.createElement('p');
    body.textContent =
      'Swap routes to confirm that this game mounts and unmounts without leaks. Future games will follow the same contract.';

    const bubble = document.createElement('div');
    bubble.className = 'sample-game__bubble';
    bubble.textContent = '🪐';

    wrapper.append(title, body, bubble);
    container.append(wrapper);

    let frame = 0;
    let rafId = 0;

    const animate = () => {
      frame += 1;
      const hue = (frame / 300) % 1;
      const color = palette[Math.floor((frame / 240) % palette.length)];
      bubble.style.setProperty('--pulse-color', color);
      bubble.style.transform = `scale(${1 + Math.sin(frame / 32) * 0.06}) rotate(${hue * 12}deg)`;
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    teardown = () => {
      window.cancelAnimationFrame(rafId);
      container.textContent = '';
      container.classList.remove('game-stage');
    };
  },
  destroy() {
    if (teardown) {
      teardown();
      teardown = null;
    }
  },
  getMeta() {
    return meta;
  },
};

export default sampleGame;
