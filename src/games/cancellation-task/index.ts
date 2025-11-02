import type { GameMeta, GameModule } from '../types';
import { generateGrid, type GenerateGridOptions, type GeneratedGrid } from './generator';
import { createSeededRng } from './rng';
import type { Cell, Color, Shape, SimilarityLevel, TargetRuleDefinition } from './types';

interface ColorInfo {
  label: string;
  hex: string;
}

const colorTokens: Record<Color, ColorInfo> = {
  rose: { label: '赤红', hex: '#f87171' },
  amber: { label: '琥珀', hex: '#fbbf24' },
  emerald: { label: '翡翠', hex: '#34d399' },
  sky: { label: '天蓝', hex: '#38bdf8' },
  violet: { label: '紫罗兰', hex: '#a855f7' },
  indigo: { label: '靛蓝', hex: '#6366f1' }
};

const shapeLabels: Record<Shape, string> = {
  triangle: '三角形',
  circle: '圆形',
  square: '方形'
};

interface DifficultyDefinition {
  id: string;
  label: string;
  description: string;
  size: number;
  minTargets: number;
  maxTargets: number;
  timeLimit: number;
  palette: Color[];
  shapes: Shape[];
  similarity: SimilarityLevel;
}

const rulePresets: TargetRuleDefinition[] = [
  {
    id: 'rose-triangle',
    label: '赤红三角形',
    description: '找出所有赤红色的三角形并进行标记。',
    predicate: (cell) => cell.color === 'rose' && cell.shape === 'triangle',
    sampleTargets: [{ color: 'rose', shape: 'triangle' }]
  },
  {
    id: 'sky-circle',
    label: '天蓝圆形',
    description: '注意蓝色圆形的干扰，确保全部选中。',
    predicate: (cell) => cell.color === 'sky' && cell.shape === 'circle',
    sampleTargets: [{ color: 'sky', shape: 'circle' }]
  },
  {
    id: 'amber-square',
    label: '琥珀方形',
    description: '锁定所有琥珀色的方块，其余图形一律忽略。',
    predicate: (cell) => cell.color === 'amber' && cell.shape === 'square',
    sampleTargets: [{ color: 'amber', shape: 'square' }]
  }
];

const difficulties: DifficultyDefinition[] = [
  {
    id: 'easy',
    label: '轻松 5×5',
    description: '较少干扰，适合热身。',
    size: 5,
    minTargets: 6,
    maxTargets: 8,
    timeLimit: 90000,
    palette: ['rose', 'sky', 'emerald', 'amber'],
    shapes: ['triangle', 'circle', 'square'],
    similarity: 'contrast'
  },
  {
    id: 'normal',
    label: '标准 6×6',
    description: '干扰更多，需要更快的检索速度。',
    size: 6,
    minTargets: 8,
    maxTargets: 11,
    timeLimit: 70000,
    palette: ['rose', 'sky', 'amber', 'emerald', 'violet'],
    shapes: ['triangle', 'circle', 'square'],
    similarity: 'mixed'
  },
  {
    id: 'hard',
    label: '挑战 7×7',
    description: '颜色和形状高度相似，考验极限专注。',
    size: 7,
    minTargets: 11,
    maxTargets: 14,
    timeLimit: 60000,
    palette: ['rose', 'sky', 'amber', 'emerald', 'violet', 'indigo'],
    shapes: ['triangle', 'circle', 'square'],
    similarity: 'mimic'
  }
];

const defaultRule = rulePresets[0];
const defaultDifficulty = difficulties[1];

const meta: GameMeta = {
  id: 'cancellation-task',
  title: '取消任务：图形搜索',
  description: '根据目标规则快速标记所有目标图形，统计命中率与反应时间。',
  accentColor: '#f97316'
};

type CellState = {
  cell: Cell;
  element: HTMLButtonElement;
  marked: boolean;
  handler: () => void;
};

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const requestFrame = (callback: FrameRequestCallback): number =>
  (window.requestAnimationFrame ?? ((cb: FrameRequestCallback) => window.setTimeout(() => cb(now()), 16) as unknown as number))(callback);

const cancelFrame = (handle: number): void => {
  const cancel = window.cancelAnimationFrame ?? ((id: number) => window.clearTimeout(id));
  cancel(handle);
};

const formatTime = (value: number): string => (value / 1000).toFixed(2);

const createSeed = (): string => Math.random().toString(36).slice(2, 8);

const createShapeIcon = (shape: Shape, color: Color): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('role', 'presentation');
  svg.classList.add('cancellation-cell__icon');
  const fill = colorTokens[color].hex;

  if (shape === 'circle') {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '40');
    circle.setAttribute('fill', fill);
    svg.appendChild(circle);
    return svg;
  }

  if (shape === 'square') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '18');
    rect.setAttribute('y', '18');
    rect.setAttribute('width', '64');
    rect.setAttribute('height', '64');
    rect.setAttribute('rx', '12');
    rect.setAttribute('fill', fill);
    svg.appendChild(rect);
    return svg;
  }

  const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  triangle.setAttribute('points', '50 15 88 85 12 85');
  triangle.setAttribute('fill', fill);
  svg.appendChild(triangle);
  return svg;
};

const buildGame = (): GameModule => {
  let host: HTMLElement | null = null;
  let board: HTMLDivElement | null = null;
  let statusNode: HTMLParagraphElement | null = null;
  let ruleBadge: HTMLSpanElement | null = null;
  let timerNode: HTMLSpanElement | null = null;
  let hitsNode: HTMLSpanElement | null = null;
  let falsePositiveNode: HTMLSpanElement | null = null;
  let remainingNode: HTMLSpanElement | null = null;
  let accuracyNode: HTMLSpanElement | null = null;
  let timeLimitNode: HTMLSpanElement | null = null;
  let seedInput: HTMLInputElement | null = null;
  let seedChangeHandler: ((event: Event) => void) | null = null;
  let startButton: HTMLButtonElement | null = null;

  const difficultyButtons = new Map<string, HTMLButtonElement>();
  const ruleButtons = new Map<string, HTMLButtonElement>();

  let currentDifficulty: DifficultyDefinition = defaultDifficulty;
  let currentRule: TargetRuleDefinition = defaultRule;
  let currentSeed: string = createSeed();
  let isSeedManual = false;

  let currentGrid: GeneratedGrid | null = null;
  let cellStates = new Map<string, CellState>();
  let hits = 0;
  let falsePositives = 0;
  let remainingTargets = 0;
  let totalTargets = 0;

  let isRunning = false;
  let hasTimerStarted = false;
  let startTime = 0;
  let rafId: number | null = null;

  const stopTimer = (): void => {
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
  };

  const updateTimerDisplay = (value: number): void => {
    if (timerNode) {
      timerNode.textContent = formatTime(value);
    }
  };

  const updateMetrics = (): void => {
    if (remainingNode) {
      remainingNode.textContent = `${Math.max(remainingTargets, 0)} / ${totalTargets}`;
    }

    if (hitsNode) {
      hitsNode.textContent = hits.toString();
    }

    if (falsePositiveNode) {
      falsePositiveNode.textContent = falsePositives.toString();
    }

    if (accuracyNode) {
      const attempts = hits + falsePositives;
      accuracyNode.textContent = attempts === 0 ? '—' : `${Math.round((hits / attempts) * 100)}%`;
    }
  };

  const updateStatus = (message: string): void => {
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const updateRuleBadge = (): void => {
    if (ruleBadge) {
      ruleBadge.textContent = currentRule.label;
      ruleBadge.title = currentRule.description;
    }
  };

  const updateTimeLimitIndicator = (): void => {
    if (timeLimitNode) {
      timeLimitNode.textContent = `${Math.round(currentDifficulty.timeLimit / 1000)} 秒`;
    }
  };

  const finishRound = (completed: boolean): void => {
    if (!isRunning) {
      return;
    }

    isRunning = false;
    stopTimer();

    const elapsed = hasTimerStarted ? now() - startTime : 0;
    const omissions = Math.max(remainingTargets, 0);

    cellStates.forEach((state) => {
      state.element.disabled = true;
      if (!state.marked && state.cell.isTarget) {
        state.element.classList.add('is-missed');
      }
    });

    updateMetrics();

    if (startButton) {
      startButton.textContent = '再来一局';
    }

    if (completed) {
      updateStatus(`全部目标已标记！用时 ${formatTime(elapsed)} 秒，命中 ${hits} 次。`);
    } else {
      updateStatus(`时间到，仍有 ${omissions} 个目标未标记。`);
    }
  };

  const tick = (): void => {
    if (!isRunning || !hasTimerStarted) {
      return;
    }

    const elapsed = now() - startTime;
    updateTimerDisplay(elapsed);

    if (elapsed >= currentDifficulty.timeLimit) {
      finishRound(false);
      return;
    }

    rafId = requestFrame(tick);
  };

  const startTimer = (): void => {
    stopTimer();
    hasTimerStarted = true;
    startTime = now();
    rafId = requestFrame(tick);
  };

  const handleCellClick = (state: CellState): void => {
    if (!isRunning) {
      updateStatus('点击“开始任务”即可开始标记。');
      return;
    }

    if (state.marked) {
      return;
    }

    if (!hasTimerStarted) {
      startTimer();
    }

    state.marked = true;
    state.element.disabled = true;

    if (state.cell.isTarget) {
      hits += 1;
      remainingTargets -= 1;
      state.element.classList.add('is-hit');
      updateStatus(`命中目标，还剩 ${Math.max(remainingTargets, 0)} 个。`);

      if (remainingTargets <= 0) {
        finishRound(true);
        return;
      }
    } else {
      falsePositives += 1;
      state.element.classList.add('is-false-positive');
      updateStatus('这是干扰项，继续寻找目标。');
    }

    updateMetrics();
  };

  const renderBoard = (grid: GeneratedGrid): void => {
    const boardElement = board;
    if (!boardElement) {
      return;
    }

    boardElement.innerHTML = '';
    boardElement.style.setProperty('--grid-size', grid.size.toString());
    boardElement.setAttribute('data-size', grid.size.toString());

    cellStates = new Map<string, CellState>();

    grid.cells.forEach((cell) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schulte-table__cell cancellation-cell';
      button.dataset.shape = cell.shape;
      button.dataset.color = cell.color;
      button.disabled = true;

      const icon = createShapeIcon(cell.shape, cell.color);
      const label = document.createElement('span');
      label.className = 'cancellation-cell__label';
      label.textContent = `${colorTokens[cell.color].label}${shapeLabels[cell.shape]}`;

      button.append(icon, label);

      const state: CellState = {
        cell,
        element: button,
        marked: false,
        handler: () => handleCellClick(state)
      };

      button.addEventListener('click', state.handler);
      boardElement.appendChild(button);
      cellStates.set(cell.id, state);
    });
  };

  const buildOptions = (): GenerateGridOptions => ({
    size: currentDifficulty.size,
    minTargets: currentDifficulty.minTargets,
    maxTargets: currentDifficulty.maxTargets,
    palette: currentDifficulty.palette,
    shapes: currentDifficulty.shapes,
    rule: currentRule,
    similarity: currentDifficulty.similarity
  });

  const prepareBoard = (seed: string): void => {
    const rng = createSeededRng(seed);
    currentGrid = generateGrid(buildOptions(), rng);
    totalTargets = currentGrid.targetCount;
    remainingTargets = totalTargets;
    hits = 0;
    falsePositives = 0;
    isRunning = false;
    hasTimerStarted = false;

    stopTimer();
    updateTimerDisplay(0);
    renderBoard(currentGrid);
    updateMetrics();

    cellStates.forEach((state) => {
      state.element.classList.remove('is-hit', 'is-false-positive', 'is-missed');
    });

    if (startButton) {
      startButton.textContent = '开始任务';
    }

    updateStatus('准备完毕，点击“开始任务”即可开始计时。');
  };

  const setSeed = (value: string, manual: boolean, rebuild = true): void => {
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || createSeed();
    currentSeed = sanitized;
    isSeedManual = manual;

    if (seedInput) {
      seedInput.value = sanitized;
    }

    if (rebuild && board) {
      prepareBoard(currentSeed);
    }
  };

  const startRound = (): void => {
    const seedForRound = currentSeed;
    prepareBoard(seedForRound);

    isRunning = true;
    hasTimerStarted = false;

    cellStates.forEach((state) => {
      state.marked = false;
      state.element.disabled = false;
      state.element.classList.remove('is-hit', 'is-false-positive', 'is-missed');
    });

    updateStatus(`请快速标记所有 ${currentRule.label}。`);

    if (startButton) {
      startButton.textContent = '重新开始';
    }

    if (!isSeedManual) {
      setSeed(createSeed(), false, false);
    }
  };

  const resetSeedRandomly = (): void => {
    setSeed(createSeed(), false);
  };

  const setDifficulty = (difficulty: DifficultyDefinition): void => {
    currentDifficulty = difficulty;
    difficultyButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === difficulty.id);
    });

    updateTimeLimitIndicator();
    prepareBoard(currentSeed);
  };

  const setRule = (rule: TargetRuleDefinition): void => {
    currentRule = rule;
    ruleButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === rule.id);
    });
    updateRuleBadge();
    prepareBoard(currentSeed);
  };

  const buildToolbar = (): HTMLDivElement => {
    const toolbar = document.createElement('div');
    toolbar.className = 'cancellation-game__toolbar';

    const difficultyGroup = document.createElement('div');
    difficultyGroup.className = 'cancellation-game__group';

    const difficultyLabel = document.createElement('span');
    difficultyLabel.className = 'cancellation-game__label';
    difficultyLabel.textContent = '难度';

    const difficultyButtonsWrapper = document.createElement('div');
    difficultyButtonsWrapper.className = 'cancellation-game__options';

    difficulties.forEach((difficulty) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schulte-game__difficulty';
      button.textContent = difficulty.label;
      button.addEventListener('click', () => setDifficulty(difficulty));
      difficultyButtons.set(difficulty.id, button);
      difficultyButtonsWrapper.appendChild(button);
    });

    difficultyGroup.append(difficultyLabel, difficultyButtonsWrapper);

    const ruleGroup = document.createElement('div');
    ruleGroup.className = 'cancellation-game__group';

    const ruleLabel = document.createElement('span');
    ruleLabel.className = 'cancellation-game__label';
    ruleLabel.textContent = '目标规则';

    const ruleButtonsWrapper = document.createElement('div');
    ruleButtonsWrapper.className = 'cancellation-game__options';

    rulePresets.forEach((rule) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schulte-game__difficulty';
      button.textContent = rule.label;
      button.addEventListener('click', () => setRule(rule));
      ruleButtons.set(rule.id, button);
      ruleButtonsWrapper.appendChild(button);
    });

    ruleGroup.append(ruleLabel, ruleButtonsWrapper);

    toolbar.append(difficultyGroup, ruleGroup);
    return toolbar;
  };

  const buildSeedControls = (): HTMLDivElement => {
    const wrapper = document.createElement('div');
    wrapper.className = 'cancellation-game__seed';

    const label = document.createElement('label');
    label.className = 'cancellation-game__seed-label';
    label.textContent = '种子';

    seedInput = document.createElement('input');
    seedInput.type = 'text';
    seedInput.className = 'cancellation-game__seed-input';
    seedInput.placeholder = '可输入自定义种子';
    seedChangeHandler = () => setSeed(seedInput?.value ?? '', true);
    seedInput.addEventListener('change', seedChangeHandler);

    const randomButton = document.createElement('button');
    randomButton.type = 'button';
    randomButton.className = 'button button--secondary cancellation-game__seed-random';
    randomButton.textContent = '随机';
    randomButton.addEventListener('click', resetSeedRandomly);

    wrapper.append(label, seedInput, randomButton);
    return wrapper;
  };

  const buildMetrics = (): HTMLDivElement => {
    const metrics = document.createElement('div');
    metrics.className = 'cancellation-game__metrics';

    const metric = (label: string, valueRef: (node: HTMLSpanElement) => void, suffix?: string): HTMLDivElement => {
      const container = document.createElement('div');
      container.className = 'cancellation-game__metric';

      const metricLabel = document.createElement('span');
      metricLabel.className = 'cancellation-game__metric-label';
      metricLabel.textContent = label;

      const metricValue = document.createElement('span');
      metricValue.className = 'cancellation-game__metric-value';
      metricValue.textContent = '--';
      valueRef(metricValue);

      container.append(metricLabel, metricValue);

      if (suffix) {
        const suffixNode = document.createElement('span');
        suffixNode.className = 'cancellation-game__metric-suffix';
        suffixNode.textContent = suffix;
        container.appendChild(suffixNode);
      }

      return container;
    };

    metrics.append(
      metric('剩余目标', (node) => {
        remainingNode = node;
      }),
      metric('命中', (node) => {
        hitsNode = node;
      }),
      metric('误击', (node) => {
        falsePositiveNode = node;
      }),
      metric('准确率', (node) => {
        accuracyNode = node;
      }),
      metric('计时', (node) => {
        timerNode = node;
      }, '秒'),
      metric('时间限制', (node) => {
        timeLimitNode = node;
      })
    );

    return metrics;
  };

  const mount = (container: HTMLElement): void => {
    host = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'cancellation-game';

    const intro = document.createElement('div');
    intro.className = 'cancellation-game__intro';

    const badge = document.createElement('span');
    badge.className = 'schulte-game__badge';
    badge.textContent = '视觉搜索';

    const introText = document.createElement('p');
    introText.className = 'schulte-game__text';
    introText.textContent = '根据目标规则取消所有目标图形，训练视觉扫描与干扰抑制能力。';

    ruleBadge = document.createElement('span');
    ruleBadge.className = 'cancellation-game__rule';
    intro.append(badge, introText, ruleBadge);

    const toolbar = buildToolbar();
    const seedControls = buildSeedControls();
    const metrics = buildMetrics();

    const actions = document.createElement('div');
    actions.className = 'cancellation-game__actions';

    startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'button button--primary cancellation-game__action';
    startButton.textContent = '开始任务';
    startButton.addEventListener('click', startRound);
    actions.appendChild(startButton);

    board = document.createElement('div');
    board.className = 'schulte-table cancellation-grid';

    statusNode = document.createElement('p');
    statusNode.className = 'cancellation-game__status';

    wrapper.append(intro, toolbar, seedControls, metrics, actions, board, statusNode);
    container.appendChild(wrapper);

    updateRuleBadge();
    updateTimeLimitIndicator();

    setSeed(createSeed(), false, false);
    if (seedInput) {
      seedInput.value = currentSeed;
    }

    prepareBoard(currentSeed);

    difficultyButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === currentDifficulty.id);
    });

    ruleButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === currentRule.id);
    });
  };

  const destroy = (): void => {
    stopTimer();

    cellStates.forEach((state) => {
      state.element.removeEventListener('click', state.handler);
    });
    cellStates.clear();

    if (startButton) {
      startButton.removeEventListener('click', startRound);
    }

    if (seedInput && seedChangeHandler) {
      seedInput.removeEventListener('change', seedChangeHandler);
    }

    if (host) {
      host.innerHTML = '';
    }

    host = null;
    board = null;
    statusNode = null;
    timerNode = null;
    hitsNode = null;
    falsePositiveNode = null;
    remainingNode = null;
    accuracyNode = null;
    timeLimitNode = null;
    seedInput = null;
    seedChangeHandler = null;
    startButton = null;
    ruleBadge = null;
    difficultyButtons.clear();
    ruleButtons.clear();
    isRunning = false;
    hasTimerStarted = false;
    rafId = null;
  };

  return {
    init(container: HTMLElement) {
      mount(container);
    },
    destroy,
    getMeta() {
      return meta;
    }
  };
};

const cancellationTaskGame: GameModule = buildGame();

export default cancellationTaskGame;
