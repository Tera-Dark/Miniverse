import type { GameMeta, GameModule } from '../types';
import { generatePattern } from './generator';
import { getNextPhase } from './state';
import type { MemoryMatrixConfig, MemoryMatrixPhase, MemoryPattern, SessionStats } from './types';

const meta: GameMeta = {
  id: 'memory-matrix',
  title: '记忆矩阵挑战',
  description: '观察矩阵中点亮的格子，短暂隐藏后尝试完全复现，训练工作记忆与空间还原能力。',
  accentColor: '#a855f7'
};

interface DifficultyOption {
  id: string;
  label: string;
  description: string;
  mode: 'preset' | 'progressive';
  config?: MemoryMatrixConfig;
}

interface RoundSummary {
  correct: number;
  missed: number;
  extras: number;
  score: number;
}

const progressiveLevels: MemoryMatrixConfig[] = [
  { gridSize: 3, patternLength: 3, exposureMs: 1500 },
  { gridSize: 3, patternLength: 4, exposureMs: 1400 },
  { gridSize: 4, patternLength: 4, exposureMs: 1300, avoidAdjacency: true },
  { gridSize: 4, patternLength: 5, exposureMs: 1200, avoidAdjacency: true },
  { gridSize: 5, patternLength: 6, exposureMs: 1100, avoidAdjacency: true },
  { gridSize: 5, patternLength: 7, exposureMs: 1000, avoidAdjacency: true },
  { gridSize: 6, patternLength: 8, exposureMs: 900, avoidAdjacency: true }
];

const difficulties: DifficultyOption[] = [
  {
    id: 'easy',
    label: '轻松 3×3',
    description: '短暂展示 3 个目标格，适合快速热身。',
    mode: 'preset',
    config: { gridSize: 3, patternLength: 3, exposureMs: 1500 }
  },
  {
    id: 'normal',
    label: '标准 4×4',
    description: '4×4 网格中记忆 5 个位置，挑战稳定的工作记忆。',
    mode: 'preset',
    config: { gridSize: 4, patternLength: 5, exposureMs: 1200, avoidAdjacency: true }
  },
  {
    id: 'hard',
    label: '进阶 5×5',
    description: '更大范围与更短暴露时间，考验快速编码能力。',
    mode: 'preset',
    config: { gridSize: 5, patternLength: 7, exposureMs: 1000, avoidAdjacency: true }
  },
  {
    id: 'progressive',
    label: '渐进挑战',
    description: '完美记忆将自动升级更大矩阵，构建持续挑战。',
    mode: 'progressive'
  }
];

const defaultDifficulty = difficulties[0];

const PHASE_LABELS: Record<MemoryMatrixPhase, string> = {
  next: '准备',
  show: '展示',
  hide: '隐藏',
  recall: '回忆',
  feedback: '反馈'
};

const formatSeconds = (milliseconds: number): string => (milliseconds / 1000).toFixed(2);

const memoryMatrixGame: GameModule = (() => {
  let host: HTMLElement | null = null;
  let wrapper: HTMLDivElement | null = null;
  let gridElement: HTMLDivElement | null = null;

  let phaseNode: HTMLSpanElement | null = null;
  let timerNode: HTMLSpanElement | null = null;
  let roundNode: HTMLSpanElement | null = null;
  let scoreNode: HTMLSpanElement | null = null;
  let perfectNode: HTMLSpanElement | null = null;
  let levelNode: HTMLSpanElement | null = null;

  let correctNode: HTMLSpanElement | null = null;
  let missedNode: HTMLSpanElement | null = null;
  let extraNode: HTMLSpanElement | null = null;
  let roundScoreNode: HTMLSpanElement | null = null;

  let statusNode: HTMLParagraphElement | null = null;
  let startButton: HTMLButtonElement | null = null;
  let submitButton: HTMLButtonElement | null = null;
  let nextButton: HTMLButtonElement | null = null;
  let contrastToggle: HTMLButtonElement | null = null;

  const difficultyButtons = new Map<string, HTMLButtonElement>();
  const cellButtons = new Map<number, HTMLButtonElement>();

  let currentDifficulty: DifficultyOption = defaultDifficulty;
  let currentPhase: MemoryMatrixPhase = 'next';
  let progressiveLevelIndex = 0;
  let currentPattern: MemoryPattern | null = null;
  const currentSelections = new Set<number>();
  const sessionStats: SessionStats = {
    roundsPlayed: 0,
    totalScore: 0,
    perfectRounds: 0,
    maxPerfectLevel: 0
  };

  let lastRound: RoundSummary = { correct: 0, missed: 0, extras: 0, score: 0 };
  let roundNumber = 0;

  let countdownEnd = 0;
  let countdownRaf: number | null = null;
  let showTimeout: number | null = null;
  let hideTimeout: number | null = null;

  let isHighContrast = false;

  const clearTimeouts = (): void => {
    if (showTimeout !== null) {
      window.clearTimeout(showTimeout);
      showTimeout = null;
    }

    if (hideTimeout !== null) {
      window.clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const stopCountdown = (): void => {
    if (countdownRaf !== null) {
      window.cancelAnimationFrame(countdownRaf);
      countdownRaf = null;
    }
  };

  const updateTimerDisplay = (text: string): void => {
    if (timerNode) {
      timerNode.textContent = text;
    }
  };

  const countdownTick = (): void => {
    if (!timerNode) {
      return;
    }

    const remaining = Math.max(0, countdownEnd - performance.now());
    timerNode.textContent = formatSeconds(remaining);

    if (remaining > 0) {
      countdownRaf = window.requestAnimationFrame(countdownTick);
    } else {
      countdownRaf = null;
    }
  };

  const startCountdown = (duration: number): void => {
    stopCountdown();
    countdownEnd = performance.now() + duration;
    countdownTick();
  };

  const resetRoundSummary = (): void => {
    lastRound = { correct: 0, missed: 0, extras: 0, score: 0 };
    updateRoundSummaryDisplay();
  };

  const updateRoundSummaryDisplay = (): void => {
    if (correctNode) {
      correctNode.textContent = lastRound.correct.toString();
    }

    if (missedNode) {
      missedNode.textContent = lastRound.missed.toString();
    }

    if (extraNode) {
      extraNode.textContent = lastRound.extras.toString();
    }

    if (roundScoreNode) {
      const scoreText = lastRound.score > 0 ? `+${lastRound.score}` : lastRound.score.toString();
      roundScoreNode.textContent = scoreText;
    }
  };

  const updateSessionDisplay = (): void => {
    if (roundNode) {
      roundNode.textContent = roundNumber.toString();
    }

    if (scoreNode) {
      scoreNode.textContent = sessionStats.totalScore.toString();
    }

    if (perfectNode) {
      perfectNode.textContent = sessionStats.perfectRounds.toString();
    }

    if (levelNode) {
      if (currentDifficulty.mode === 'progressive' && sessionStats.maxPerfectLevel > 0) {
        levelNode.textContent = `Lv.${sessionStats.maxPerfectLevel}`;
      } else {
        levelNode.textContent = currentDifficulty.mode === 'progressive' ? 'Lv.0' : '—';
      }
    }
  };

  const clearCellClasses = (): void => {
    cellButtons.forEach((button) => {
      button.classList.remove(
        'memory-matrix__cell--lit',
        'memory-matrix__cell--selected',
        'memory-matrix__cell--correct',
        'memory-matrix__cell--missed',
        'memory-matrix__cell--extra'
      );
      button.setAttribute('aria-pressed', 'false');
    });
  };

  const computeActiveConfig = (): MemoryMatrixConfig => {
    if (currentDifficulty.mode === 'preset' && currentDifficulty.config) {
      return currentDifficulty.config;
    }

    return (
      progressiveLevels[progressiveLevelIndex] ?? progressiveLevels[progressiveLevels.length - 1]
    );
  };

  const ensureGrid = (size: number): void => {
    if (!gridElement) {
      return;
    }

    const expectedCells = size * size;

    gridElement.dataset.size = size.toString();

    if (gridElement.childElementCount === expectedCells && cellButtons.size === expectedCells) {
      gridElement.style.setProperty('--grid-size', size.toString());
      return;
    }

    gridElement.innerHTML = '';
    cellButtons.clear();
    gridElement.style.setProperty('--grid-size', size.toString());
    gridElement.dataset.size = size.toString();

    for (let index = 0; index < expectedCells; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-matrix__cell';
      button.dataset.index = index.toString();
      button.setAttribute('aria-pressed', 'false');
      button.disabled = true;

      const row = Math.floor(index / size) + 1;
      const column = (index % size) + 1;
      button.setAttribute('aria-label', `第 ${row} 行，第 ${column} 列`);

      button.addEventListener('click', () => handleCellInteraction(index));
      button.addEventListener('keydown', (event) => handleCellKeydown(event, index, size));

      button.textContent = '';

      gridElement.appendChild(button);
      cellButtons.set(index, button);
    }
  };

  const setPhase = (phase: MemoryMatrixPhase): void => {
    currentPhase = phase;

    if (phaseNode) {
      phaseNode.textContent = PHASE_LABELS[phase];
    }

    if (wrapper) {
      wrapper.dataset.phase = phase;
    }

    cellButtons.forEach((button) => {
      if (phase === 'recall') {
        button.disabled = false;
        button.tabIndex = 0;
      } else {
        button.disabled = true;
        button.tabIndex = -1;
      }
    });

    if (submitButton) {
      submitButton.style.display = phase === 'recall' ? '' : 'none';
    }

    if (nextButton) {
      nextButton.style.display = phase === 'feedback' ? '' : 'none';
    }

    if (phase === 'recall') {
      updateTimerDisplay('—');
      if (statusNode) {
        statusNode.textContent = '请选择刚才被点亮的格子，然后点击“检查记忆”。';
      }
    } else if (phase === 'feedback') {
      updateTimerDisplay('—');
      if (statusNode) {
        const content = statusNode.textContent ?? '';
        if (content.trim().length === 0) {
          statusNode.textContent = '本轮反馈已展示，点击“下一回合”继续。';
        }
      }
    }
  };

  const highlightPattern = (lit: boolean): void => {
    if (!currentPattern) {
      return;
    }

    currentPattern.order.forEach((index) => {
      const button = cellButtons.get(index);
      if (button) {
        button.classList.toggle('memory-matrix__cell--lit', lit);
      }
    });
  };

  const handleCellInteraction = (index: number): void => {
    if (currentPhase !== 'recall') {
      return;
    }

    if (currentSelections.has(index)) {
      currentSelections.delete(index);
    } else {
      currentSelections.add(index);
    }

    const button = cellButtons.get(index);
    if (button) {
      const isSelected = currentSelections.has(index);
      button.classList.toggle('memory-matrix__cell--selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
  };

  const handleCellKeydown = (event: KeyboardEvent, index: number, size: number): void => {
    const { key } = event;
    let targetIndex: number | null = null;

    switch (key) {
      case 'ArrowUp':
        targetIndex = index - size >= 0 ? index - size : null;
        break;
      case 'ArrowDown':
        targetIndex = index + size < size * size ? index + size : null;
        break;
      case 'ArrowLeft':
        targetIndex = index % size !== 0 ? index - 1 : null;
        break;
      case 'ArrowRight':
        targetIndex = (index + 1) % size !== 0 ? index + 1 : null;
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        handleCellInteraction(index);
        return;
      }
      default:
        break;
    }

    if (targetIndex !== null) {
      event.preventDefault();
      const targetButton = cellButtons.get(targetIndex);
      targetButton?.focus();
    }
  };

  const evaluateSelections = (): void => {
    if (!currentPattern || currentPhase !== 'recall') {
      return;
    }

    const patternSet = new Set<number>(currentPattern.order);
    let correct = 0;
    let extras = 0;

    currentSelections.forEach((index) => {
      const button = cellButtons.get(index);
      if (patternSet.has(index)) {
        correct += 1;
        button?.classList.add('memory-matrix__cell--correct');
      } else {
        extras += 1;
        button?.classList.add('memory-matrix__cell--extra');
      }
    });

    let missed = 0;
    patternSet.forEach((index) => {
      const button = cellButtons.get(index);
      button?.classList.add('memory-matrix__cell--lit');
      if (!currentSelections.has(index)) {
        missed += 1;
        button?.classList.add('memory-matrix__cell--missed');
      }
    });

    const roundScore = correct - extras;
    sessionStats.roundsPlayed += 1;
    sessionStats.totalScore += roundScore;

    const isPerfect = missed === 0 && extras === 0;
    if (isPerfect) {
      sessionStats.perfectRounds += 1;
      if (currentDifficulty.mode === 'progressive') {
        sessionStats.maxPerfectLevel = Math.max(sessionStats.maxPerfectLevel, progressiveLevelIndex + 1);
      }
    }

    lastRound = { correct, missed, extras, score: roundScore };
    updateRoundSummaryDisplay();
    updateSessionDisplay();

    if (currentDifficulty.mode === 'progressive') {
      if (isPerfect) {
        progressiveLevelIndex = Math.min(progressiveLevelIndex + 1, progressiveLevels.length - 1);
      } else if (missed + extras >= 3) {
        progressiveLevelIndex = Math.max(0, progressiveLevelIndex - 1);
      }
    }

    if (statusNode) {
      let message = isPerfect
        ? '完美记忆！全部格子都被正确复现。'
        : `正确 ${correct} 个，遗漏 ${missed} 个，额外选择 ${extras} 个。`;

      if (currentDifficulty.mode === 'progressive') {
        const upcomingLevel = progressiveLevelIndex + 1;
        message = `${message} 下一轮将进入 Lv.${upcomingLevel} 配置。`;
      }

      statusNode.textContent = message;
    }

    setPhase('feedback');
  };

  const transitionToPhase = (phase: MemoryMatrixPhase): void => {
    setPhase(phase);

    if (phase === 'show') {
      const config = computeActiveConfig();
      highlightPattern(true);
      startCountdown(config.exposureMs);
      clearTimeouts();
      showTimeout = window.setTimeout(() => {
        highlightPattern(false);
        transitionToPhase(getNextPhase('show'));
      }, config.exposureMs);
      if (statusNode) {
        statusNode.textContent = '观察点亮的格子位置，倒计时结束后进入回忆阶段。';
      }
    } else if (phase === 'hide') {
      clearTimeouts();
      stopCountdown();
      updateTimerDisplay('—');
      hideTimeout = window.setTimeout(() => {
        transitionToPhase(getNextPhase('hide'));
      }, 350);
    }
  };

  const startRound = (): void => {
    const config = computeActiveConfig();
    ensureGrid(config.gridSize);
    clearCellClasses();
    clearTimeouts();
    stopCountdown();
    resetRoundSummary();
    currentSelections.clear();

    const seed = `${Date.now()}-${Math.random()}`;

    try {
      currentPattern = generatePattern({ ...config, seed });
    } catch (error) {
      console.error('Failed to generate memory matrix pattern', error);
      currentPattern = null;
      setPhase('next');
      if (statusNode) {
        statusNode.textContent = '生成记忆图案时出现问题，请稍后重试。';
      }
      return;
    }

    if (wrapper) {
      wrapper.style.setProperty('--memory-grid-size', config.gridSize.toString());
    }

    roundNumber += 1;
    updateSessionDisplay();

    transitionToPhase('show');
  };

  const resetSession = (): void => {
    clearTimeouts();
    stopCountdown();
    clearCellClasses();
    roundNumber = 0;
    currentSelections.clear();
    currentPattern = null;
    lastRound = { correct: 0, missed: 0, extras: 0, score: 0 };
    sessionStats.roundsPlayed = 0;
    sessionStats.totalScore = 0;
    sessionStats.perfectRounds = 0;
    sessionStats.maxPerfectLevel = 0;
    resetRoundSummary();
    updateSessionDisplay();
    setPhase('next');
    updateTimerDisplay('—');
    if (startButton) {
      startButton.textContent = '开始记忆';
    }
    if (statusNode) {
      statusNode.textContent = '点击“开始记忆”生成新的矩阵模式。';
    }
  };

  const setDifficulty = (difficulty: DifficultyOption): void => {
    currentDifficulty = difficulty;
    progressiveLevelIndex = 0;

    difficultyButtons.forEach((button, id) => {
      const isActive = id === difficulty.id;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    resetSession();
    const config = computeActiveConfig();
    ensureGrid(config.gridSize);

    if (statusNode) {
      const detail = difficulty.description
        ? `${difficulty.description}。`
        : '选择完成。';
      statusNode.textContent = `${detail}点击“开始记忆”生成新的矩阵模式。`;
    }
  };

  const toggleContrast = (): void => {
    isHighContrast = !isHighContrast;
    if (wrapper) {
      wrapper.dataset.contrast = isHighContrast ? 'high' : 'default';
    }

    if (contrastToggle) {
      contrastToggle.textContent = isHighContrast ? '切换柔和模式' : '切换高对比';
      contrastToggle.setAttribute('aria-pressed', isHighContrast ? 'true' : 'false');
    }
  };

  const startSession = (): void => {
    resetSession();
    startRound();

    if (startButton) {
      startButton.textContent = '重新开始';
    }
  };

  const proceedNextRound = (): void => {
    if (currentPhase !== 'feedback') {
      return;
    }

    setPhase('next');
    startRound();
  };

  const buildInterface = (container: HTMLElement): void => {
    container.innerHTML = '';

    wrapper = document.createElement('div');
    wrapper.className = 'memory-matrix';
    wrapper.dataset.phase = 'next';
    wrapper.dataset.contrast = 'default';

    const intro = document.createElement('div');
    intro.className = 'memory-matrix__intro';

    const badge = document.createElement('span');
    badge.className = 'memory-matrix__badge';
    badge.textContent = '工作记忆训练';

    const introText = document.createElement('p');
    introText.className = 'memory-matrix__text';
    introText.textContent = '短暂记忆并复现点亮的矩阵位置，逐步提升矩阵大小与难度。';

    intro.append(badge, introText);

    const toolbar = document.createElement('div');
    toolbar.className = 'memory-matrix__toolbar';

    const diffGroup = document.createElement('div');
    diffGroup.className = 'memory-matrix__difficulties';

    difficulties.forEach((difficulty) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-matrix__difficulty';
      button.textContent = difficulty.label;
      button.addEventListener('click', () => setDifficulty(difficulty));
      difficultyButtons.set(difficulty.id, button);
      diffGroup.appendChild(button);
    });

    const contrastControls = document.createElement('div');
    contrastControls.className = 'memory-matrix__contrast';

    contrastToggle = document.createElement('button');
    contrastToggle.type = 'button';
    contrastToggle.className = 'memory-matrix__contrast-toggle';
    contrastToggle.textContent = '切换高对比';
    contrastToggle.setAttribute('aria-pressed', 'false');
    contrastToggle.addEventListener('click', toggleContrast);

    contrastControls.appendChild(contrastToggle);

    toolbar.append(diffGroup, contrastControls);

    const metrics = document.createElement('div');
    metrics.className = 'memory-matrix__metrics';

    const metricPhase = createMetric('当前阶段');
    phaseNode = metricPhase.value;
    metricPhase.value.textContent = PHASE_LABELS.next;

    const metricTimer = createMetric('倒计时', '秒');
    timerNode = metricTimer.value;
    timerNode.textContent = '—';

    const metricRound = createMetric('回合数');
    roundNode = metricRound.value;
    roundNode.textContent = '0';

    const metricScore = createMetric('累计得分');
    scoreNode = metricScore.value;
    scoreNode.textContent = '0';

    const metricPerfect = createMetric('完美轮数');
    perfectNode = metricPerfect.value;
    perfectNode.textContent = '0';

    const metricLevel = createMetric('完美等级');
    levelNode = metricLevel.value;
    levelNode.textContent = currentDifficulty.mode === 'progressive' ? 'Lv.0' : '—';

    metrics.append(
      metricPhase.container,
      metricTimer.container,
      metricRound.container,
      metricScore.container,
      metricPerfect.container,
      metricLevel.container
    );

    const roundSummary = document.createElement('div');
    roundSummary.className = 'memory-matrix__summary';

    const summaryCorrect = createSummaryMetric('正确');
    correctNode = summaryCorrect.value;

    const summaryMissed = createSummaryMetric('遗漏');
    missedNode = summaryMissed.value;

    const summaryExtra = createSummaryMetric('额外');
    extraNode = summaryExtra.value;

    const summaryScore = createSummaryMetric('本轮得分');
    roundScoreNode = summaryScore.value;

    roundSummary.append(
      summaryCorrect.container,
      summaryMissed.container,
      summaryExtra.container,
      summaryScore.container
    );

    const actions = document.createElement('div');
    actions.className = 'memory-matrix__actions';

    startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'button button--primary memory-matrix__action';
    startButton.textContent = '开始记忆';
    startButton.addEventListener('click', startSession);

    submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.className = 'button button--secondary memory-matrix__action';
    submitButton.textContent = '检查记忆';
    submitButton.style.display = 'none';
    submitButton.addEventListener('click', evaluateSelections);

    nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'button button--primary memory-matrix__action';
    nextButton.textContent = '下一回合';
    nextButton.style.display = 'none';
    nextButton.addEventListener('click', proceedNextRound);

    actions.append(startButton, submitButton, nextButton);

    gridElement = document.createElement('div');
    gridElement.className = 'memory-matrix__grid';
    gridElement.setAttribute('role', 'application');
    gridElement.setAttribute('aria-label', '记忆矩阵棋盘');

    statusNode = document.createElement('p');
    statusNode.className = 'memory-matrix__status';
    statusNode.textContent = '点击“开始记忆”生成新的矩阵模式。';

    wrapper.append(intro, toolbar, metrics, roundSummary, actions, gridElement, statusNode);
    container.appendChild(wrapper);

    setDifficulty(defaultDifficulty);
  };

  const createMetric = (
    label: string,
    suffix?: string
  ): { container: HTMLDivElement; value: HTMLSpanElement } => {
    const container = document.createElement('div');
    container.className = 'memory-matrix__metric';

    const labelNode = document.createElement('span');
    labelNode.className = 'memory-matrix__metric-label';
    labelNode.textContent = label;

    const value = document.createElement('span');
    value.className = 'memory-matrix__metric-value';

    container.append(labelNode, value);

    if (suffix) {
      const suffixNode = document.createElement('span');
      suffixNode.className = 'memory-matrix__metric-suffix';
      suffixNode.textContent = suffix;
      container.appendChild(suffixNode);
    }

    return { container, value };
  };

  const createSummaryMetric = (
    label: string
  ): { container: HTMLDivElement; value: HTMLSpanElement } => {
    const container = document.createElement('div');
    container.className = 'memory-matrix__summary-item';

    const labelNode = document.createElement('span');
    labelNode.className = 'memory-matrix__summary-label';
    labelNode.textContent = label;

    const value = document.createElement('span');
    value.className = 'memory-matrix__summary-value';
    value.textContent = '0';

    container.append(labelNode, value);
    return { container, value };
  };

  const destroy = (): void => {
    clearTimeouts();
    stopCountdown();
    cellButtons.clear();
    difficultyButtons.clear();
    currentSelections.clear();
    currentPattern = null;
    currentDifficulty = defaultDifficulty;
    currentPhase = 'next';
    progressiveLevelIndex = 0;
    roundNumber = 0;
    isHighContrast = false;
    sessionStats.roundsPlayed = 0;
    sessionStats.totalScore = 0;
    sessionStats.perfectRounds = 0;
    sessionStats.maxPerfectLevel = 0;
    lastRound = { correct: 0, missed: 0, extras: 0, score: 0 };

    if (startButton) {
      startButton.removeEventListener('click', startSession);
    }

    if (submitButton) {
      submitButton.removeEventListener('click', evaluateSelections);
    }

    if (nextButton) {
      nextButton.removeEventListener('click', proceedNextRound);
    }

    if (contrastToggle) {
      contrastToggle.removeEventListener('click', toggleContrast);
    }

    if (host) {
      host.innerHTML = '';
    }

    host = null;
    wrapper = null;
    gridElement = null;
    phaseNode = null;
    timerNode = null;
    roundNode = null;
    scoreNode = null;
    perfectNode = null;
    levelNode = null;
    correctNode = null;
    missedNode = null;
    extraNode = null;
    roundScoreNode = null;
    statusNode = null;
    startButton = null;
    submitButton = null;
    nextButton = null;
    contrastToggle = null;
  };

  return {
    init(container: HTMLElement): void {
      host = container;
      buildInterface(container);
    },
    destroy,
    getMeta(): GameMeta {
      return meta;
    }
  };
})();

export default memoryMatrixGame;
