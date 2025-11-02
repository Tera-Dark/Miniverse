import type { GameFactory, GameMeta, GameModule } from '../types';

interface Difficulty {
  id: string;
  label: string;
  size: number;
  description: string;
}

interface CellStyle {
  color: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  letterSpacing: string;
  textShadow: string;
}

const difficulties: Difficulty[] = [
  {
    id: 'focus',
    label: '入门 4×4',
    size: 4,
    description: '熟悉节奏，范围更小，适合热身。'
  },
  {
    id: 'classic',
    label: '标准 5×5',
    size: 5,
    description: '经典舒尔特方格，训练视线搜索与专注。'
  },
  {
    id: 'advanced',
    label: '挑战 6×6',
    size: 6,
    description: '数字更多，更考验持续的注意力。'
  }
];

const defaultDifficulty = difficulties[1] ?? difficulties[0];


const shuffleNumbers = (size: number): number[] => {
  const values = Array.from({ length: size * size }, (_, index) => index + 1);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
};

const formatTime = (milliseconds: number): string => (milliseconds / 1000).toFixed(2);

const randomCellStyle = (): CellStyle => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 45 + Math.random() * 35;
  const isDark = document.documentElement.dataset.theme === 'dark';
  const baseLightness = isDark ? 68 : 38;
  const lightness = Math.min(90, baseLightness + Math.random() * 14);
  const fontWeights = ['500', '600', '700', '800'];
  const letterSpacings = ['0em', '0.02em', '-0.01em'];
  const textShadow =
    Math.random() > 0.7
      ? `0 0 18px hsla(${hue} ${Math.min(saturation + 18, 95)}% ${Math.min(lightness + 18, 92)}% / 0.45)`
      : '';

  return {
    color: `hsl(${hue} ${saturation}% ${lightness}%)`,
    fontWeight: fontWeights[Math.floor(Math.random() * fontWeights.length)],
    fontStyle: Math.random() > 0.78 ? 'italic' : 'normal',
    letterSpacing: letterSpacings[Math.floor(Math.random() * letterSpacings.length)],
    textShadow
  };
};

const buildGame = (meta: GameMeta): GameModule => {
  let host: HTMLElement | null = null;
  let board: HTMLDivElement | null = null;
  let statusNode: HTMLParagraphElement | null = null;
  let infoNode: HTMLSpanElement | null = null;
  let timerValueNode: HTMLSpanElement | null = null;
  let recordValueNode: HTMLSpanElement | null = null;
  let actionButton: HTMLButtonElement | null = null;

  const difficultyButtons = new Map<string, HTMLButtonElement>();
  const bestTimes: Record<string, number | undefined> = {};

  let currentDifficulty: Difficulty = defaultDifficulty;
  let nextTarget = 1;
  let startTime = 0;
  let rafId: number | null = null;
  let isRunning = false;

  const totalCells = (): number => currentDifficulty.size * currentDifficulty.size;

  const showStatus = (message: string): void => {
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const updateNextIndicator = (): void => {
    if (!infoNode) {
      return;
    }
    infoNode.textContent = nextTarget > totalCells() ? '完成' : String(nextTarget);
  };

  const updateRecordDisplay = (): void => {
    if (!recordValueNode) {
      return;
    }
    const record = bestTimes[currentDifficulty.id];
    recordValueNode.textContent = record ? formatTime(record) : '--';
  };

  const updateTimerDisplay = (milliseconds: number): void => {
    if (timerValueNode) {
      timerValueNode.textContent = formatTime(milliseconds);
    }
  };

  const stopTimer = (): void => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (): void => {
    if (!isRunning || !timerValueNode) {
      return;
    }

    const elapsed = performance.now() - startTime;
    timerValueNode.textContent = formatTime(elapsed);
    rafId = window.requestAnimationFrame(tick);
  };

  const startTimer = (): void => {
    stopTimer();
    startTime = performance.now();
    rafId = window.requestAnimationFrame(tick);
  };

  const finishGame = (): void => {
    isRunning = false;
    const elapsed = performance.now() - startTime;
    stopTimer();

    if (timerValueNode) {
      timerValueNode.textContent = formatTime(elapsed);
    }

    const previous = bestTimes[currentDifficulty.id];
    if (!previous || elapsed < previous) {
      bestTimes[currentDifficulty.id] = elapsed;
      showStatus(`完成！刷新最佳成绩：${formatTime(elapsed)} 秒。`);
    } else {
      showStatus(`完成！用时 ${formatTime(elapsed)} 秒。`);
    }

    updateRecordDisplay();
    updateNextIndicator();

    if (actionButton) {
      actionButton.textContent = '再来一局';
    }
  };

  const handleCellClick = (value: number, element: HTMLButtonElement): void => {
    if (!isRunning) {
      showStatus('点击“开始挑战”即可开始训练。');
      return;
    }

    if (value !== nextTarget) {
      element.classList.add('is-error');
      window.setTimeout(() => {
        element.classList.remove('is-error');
      }, 220);
      showStatus(`那不是 ${nextTarget}，试着快速定位目标。`);
      return;
    }

    element.classList.add('is-cleared');
    element.disabled = true;
    nextTarget += 1;

    if (nextTarget > totalCells()) {
      finishGame();
      return;
    }

    updateNextIndicator();
    showStatus(`很好！继续寻找数字 ${nextTarget}。`);
  };

  const buildBoard = (): void => {
    const boardElement = board;
    if (!boardElement) {
      return;
    }

    boardElement.innerHTML = '';
    boardElement.style.setProperty('--grid-size', currentDifficulty.size.toString());
    boardElement.setAttribute('data-size', currentDifficulty.size.toString());

    const numbers = shuffleNumbers(currentDifficulty.size);

    numbers.forEach((value) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'schulte-table__cell';
      cell.textContent = value.toString();
      cell.dataset.value = value.toString();

      const style = randomCellStyle();
      cell.style.color = style.color;
      cell.style.fontWeight = style.fontWeight;
      cell.style.letterSpacing = style.letterSpacing;
      cell.style.fontStyle = style.fontStyle;
      if (style.textShadow) {
        cell.style.textShadow = style.textShadow;
      }

      cell.addEventListener('click', () => handleCellClick(value, cell));
      boardElement.appendChild(cell);
    });
  };

  const startGame = (): void => {
    isRunning = true;
    nextTarget = 1;
    buildBoard();
    updateNextIndicator();
    updateTimerDisplay(0);
    startTimer();
    showStatus(`请按照顺序点击数字 1 到 ${totalCells()}。`);
    if (actionButton) {
      actionButton.textContent = '重新生成';
    }
  };

  const setDifficulty = (difficulty: Difficulty): void => {
    currentDifficulty = difficulty;
    difficultyButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === difficulty.id);
    });

    isRunning = false;
    stopTimer();
    nextTarget = 1;
    updateNextIndicator();
    updateTimerDisplay(0);
    updateRecordDisplay();

    if (actionButton) {
      actionButton.textContent = '开始挑战';
    }

    buildBoard();
    showStatus(`${difficulty.label}：${difficulty.description}。点击“开始挑战”即可开始训练。`);
  };

  const mount = (container: HTMLElement): void => {
    host = container;
    container.innerHTML = '';
    difficultyButtons.clear();

    const wrapper = document.createElement('div');
    wrapper.className = 'schulte-game';

    const intro = document.createElement('div');
    intro.className = 'schulte-game__intro';

    const badge = document.createElement('span');
    badge.className = 'schulte-game__badge';
    badge.textContent = '专注力训练';

    const introText = document.createElement('p');
    introText.className = 'schulte-game__text';
    introText.textContent = '按照顺序点击数字，训练视野扫描速度与短时专注力。';

    intro.append(badge, introText);

    const toolbar = document.createElement('div');
    toolbar.className = 'schulte-game__toolbar';

    const toolbarLabel = document.createElement('span');
    toolbarLabel.className = 'schulte-game__label';
    toolbarLabel.textContent = '选择难度';

    const diffGroup = document.createElement('div');
    diffGroup.className = 'schulte-game__difficulties';

    difficulties.forEach((difficulty) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schulte-game__difficulty';
      button.textContent = difficulty.label;
      button.addEventListener('click', () => setDifficulty(difficulty));
      difficultyButtons.set(difficulty.id, button);
      diffGroup.appendChild(button);
    });

    toolbar.append(toolbarLabel, diffGroup);

    const metrics = document.createElement('div');
    metrics.className = 'schulte-game__metrics';

    const nextMetric = document.createElement('div');
    nextMetric.className = 'schulte-game__metric';
    const nextLabel = document.createElement('span');
    nextLabel.className = 'schulte-game__metric-label';
    nextLabel.textContent = '下一个数字';
    infoNode = document.createElement('span');
    infoNode.className = 'schulte-game__metric-value';
    infoNode.textContent = '1';
    nextMetric.append(nextLabel, infoNode);

    const timerMetric = document.createElement('div');
    timerMetric.className = 'schulte-game__metric';
    const timerLabel = document.createElement('span');
    timerLabel.className = 'schulte-game__metric-label';
    timerLabel.textContent = '已用时间';
    timerValueNode = document.createElement('span');
    timerValueNode.className = 'schulte-game__metric-value';
    timerValueNode.textContent = '0.00';
    const timerUnit = document.createElement('span');
    timerUnit.className = 'schulte-game__metric-suffix';
    timerUnit.textContent = '秒';
    timerMetric.append(timerLabel, timerValueNode, timerUnit);

    const recordMetric = document.createElement('div');
    recordMetric.className = 'schulte-game__metric';
    const recordLabel = document.createElement('span');
    recordLabel.className = 'schulte-game__metric-label';
    recordLabel.textContent = '最佳成绩';
    recordValueNode = document.createElement('span');
    recordValueNode.className = 'schulte-game__metric-value';
    recordValueNode.textContent = '--';
    const recordUnit = document.createElement('span');
    recordUnit.className = 'schulte-game__metric-suffix';
    recordUnit.textContent = '秒';
    recordMetric.append(recordLabel, recordValueNode, recordUnit);

    metrics.append(nextMetric, timerMetric, recordMetric);

    const actions = document.createElement('div');
    actions.className = 'schulte-game__actions';
    actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'button button--primary schulte-game__action';
    actionButton.textContent = '开始挑战';
    actionButton.addEventListener('click', startGame);
    actions.appendChild(actionButton);

    board = document.createElement('div');
    board.className = 'schulte-table';

    statusNode = document.createElement('p');
    statusNode.className = 'schulte-game__status';

    wrapper.append(intro, toolbar, metrics, actions, board, statusNode);
    container.appendChild(wrapper);

    setDifficulty(defaultDifficulty);
  };

  const destroy = (): void => {
    stopTimer();
    isRunning = false;

    if (actionButton) {
      actionButton.removeEventListener('click', startGame);
    }

    if (host) {
      host.innerHTML = '';
    }

    board = null;
    statusNode = null;
    infoNode = null;
    timerValueNode = null;
    recordValueNode = null;
    actionButton = null;
    host = null;
    difficultyButtons.clear();
    currentDifficulty = defaultDifficulty;
    nextTarget = 1;
    startTime = 0;
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
};

export const createGame: GameFactory = (meta) => buildGame(meta);

export default createGame;
