import type { GameMeta, GameModule } from '../types';

const meta: GameMeta = {
  id: 'sample',
  title: 'Aurora Drift (Sample)',
  description: 'A tiny looping vignette that proves a game can mount, tick, and clean up.',
  accentColor: '#c084fc'
};

const buildMessage = (): HTMLParagraphElement => {
  const paragraph = document.createElement('p');
  paragraph.className = 'sample-game__body';
  paragraph.textContent =
    'Imagine this space filled with cosmic particles, interactive challenges, and tiny stories. For now, enjoy a calm timer loop to ensure the framework works as expected.';
  return paragraph;
};

const sampleGame: GameModule = (() => {
  let host: HTMLElement | null = null;
  let timerNode: HTMLDivElement | null = null;
  let rafId: number | null = null;
  let startTime = 0;
  let resetButton: HTMLButtonElement | null = null;

  const formatElapsed = (millis: number): string => {
    const seconds = millis / 1000;
    const whole = Math.floor(seconds);
    const tenths = Math.floor((seconds - whole) * 10);
    return `${whole.toString().padStart(2, '0')}.${tenths}`;
  };

  const tick = (): void => {
    if (!timerNode) {
      return;
    }

    const elapsed = performance.now() - startTime;
    timerNode.textContent = formatElapsed(elapsed);
    rafId = window.requestAnimationFrame(tick);
  };

  const startLoop = (): void => {
    startTime = performance.now();
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    rafId = window.requestAnimationFrame(tick);
  };

  const handleReset = (): void => {
    startLoop();
  };

  const mount = (container: HTMLElement): void => {
    host = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'sample-game';

    const pill = document.createElement('span');
    pill.className = 'sample-game__pill';

    const pillIcon = document.createElement('span');
    pillIcon.setAttribute('aria-hidden', 'true');
    pillIcon.textContent = '🪐';
    pill.append(pillIcon, document.createTextNode(' Demo orbit'));

    timerNode = document.createElement('div');
    timerNode.className = 'sample-game__timer';
    timerNode.textContent = '00.0';

    resetButton = document.createElement('button');
    resetButton.classList.add('button', 'button--secondary');
    resetButton.type = 'button';
    resetButton.textContent = 'Restart loop';
    resetButton.addEventListener('click', handleReset);

    wrapper.append(pill, buildMessage(), timerNode, resetButton);
    container.appendChild(wrapper);

    startLoop();
  };

  const destroy = (): void => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (resetButton) {
      resetButton.removeEventListener('click', handleReset);
      resetButton = null;
    }

    if (host) {
      host.innerHTML = '';
      host = null;
    }

    timerNode = null;
  };

  return {
    init(container: HTMLElement, _opts?: Record<string, unknown>): void {
      mount(container);
    },
    destroy,
    getMeta(): GameMeta {
      return meta;
    }
  };
})();

export default sampleGame;
