import type { GameMeta, GameModule } from '../types';
import {
  applyStaircase,
  computeSessionMetrics,
  type TrialMetricsInput,
  type TrialType
} from './logic';

const meta: GameMeta = {
  id: 'stop-signal',
  title: '停止信号任务（SST）',
  description: '通过自适应停止信号延迟测量抑制控制能力，计算 SSRT 与停止成功率。',
  accentColor: '#f472b6'
};

type Direction = 'left' | 'right';
type TrialBlock = 'practice' | 'main';
type Phase = 'idle' | 'practice' | 'awaiting-main' | 'paused' | 'main' | 'summary';

interface GameSettings {
  totalTrials: number;
  stopProportion: number;
  initialSsd: number;
  ssdStep: number;
  minSsd: number;
  maxSsd: number;
  practiceTrials: number;
  stimulusTimeout: number;
  isiMin: number;
  isiMax: number;
  leftKey: string;
  rightKey: string;
  audioEnabled: boolean;
  highContrast: boolean;
  largeButtons: boolean;
}

const defaultSettings: GameSettings = {
  totalTrials: 120,
  stopProportion: 0.25,
  initialSsd: 250,
  ssdStep: 50,
  minSsd: 50,
  maxSsd: 900,
  practiceTrials: 12,
  stimulusTimeout: 1500,
  isiMin: 700,
  isiMax: 1200,
  leftKey: 'ArrowLeft',
  rightKey: 'ArrowRight',
  audioEnabled: true,
  highContrast: false,
  largeButtons: false
};

interface TrialDefinition {
  id: string;
  block: TrialBlock;
  order: number;
  type: TrialType;
  direction: Direction;
}

interface TrialRecord extends TrialMetricsInput {
  index: number;
  block: TrialBlock;
  direction: Direction;
  responseKey: string | null;
  aborted: boolean;
}

interface ActiveTrialState {
  definition: TrialDefinition;
  startedAt: number;
  result: TrialRecord;
}

type PauseSnapshot = {
  definition: TrialDefinition;
  index: number;
};

const randomBetween = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const pickDirection = (): Direction => (Math.random() < 0.5 ? 'left' : 'right');

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const formatRate = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value * 100)}%`;
};

const formatMs = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)} ms`;
};

const createTrialSequence = (count: number, stopProportion: number, block: TrialBlock): TrialDefinition[] => {
  const sanitizedCount = Math.max(1, Math.floor(count));
  const proportion = clampNumber(stopProportion, 0, 1);
  let stopTrials = Math.round(sanitizedCount * proportion);

  if (sanitizedCount > 1) {
    stopTrials = clampNumber(stopTrials, 1, sanitizedCount - 1);
  }

  const goTrials = sanitizedCount - stopTrials;
  const sequence: Array<Omit<TrialDefinition, 'id' | 'order'>> = [];

  for (let index = 0; index < goTrials; index += 1) {
    sequence.push({ block, type: 'go', direction: pickDirection() });
  }

  for (let index = 0; index < stopTrials; index += 1) {
    sequence.push({ block, type: 'stop', direction: pickDirection() });
  }

  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [sequence[index], sequence[swapIndex]] = [sequence[swapIndex], sequence[index]];
  }

  return sequence.map((trial, index) => ({
    id: `${block}-${index + 1}`,
    block,
    order: index + 1,
    type: trial.type,
    direction: trial.direction
  }));
};

type TonePlayer = {
  play: () => void;
  dispose: () => void;
};

const createTonePlayer = (): TonePlayer => {
  let context: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!context) {
      if (typeof window.AudioContext === 'undefined') {
        return null;
      }
      context = new window.AudioContext();
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => {
        /* ignore */
      });
    }

    return context;
  };

  return {
    play: () => {
      const ctx = ensureContext();
      if (!ctx) {
        return;
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    },
    dispose: () => {
      if (context) {
        void context.close().catch(() => {
          /* ignore */
        });
      }
      context = null;
    }
  };
};

const stopSignalGame: GameModule = (() => {
  let host: HTMLElement | null = null;
  let wrapper: HTMLDivElement | null = null;

  let progressBar: HTMLDivElement | null = null;
  let phaseLabelNode: HTMLSpanElement | null = null;
  let trialCounterNode: HTMLSpanElement | null = null;
  let stopRateNode: HTMLSpanElement | null = null;
  let goAccuracyNode: HTMLSpanElement | null = null;
  let ssdValueNode: HTMLSpanElement | null = null;

  let stimulusNode: HTMLDivElement | null = null;
  let stopCueNode: HTMLDivElement | null = null;
  let statusNode: HTMLParagraphElement | null = null;
  let summaryNode: HTMLDivElement | null = null;

  let leftResponseButton: HTMLButtonElement | null = null;
  let rightResponseButton: HTMLButtonElement | null = null;

  let startButton: HTMLButtonElement | null = null;
  let pauseButton: HTMLButtonElement | null = null;
  let retryButton: HTMLButtonElement | null = null;
  let skipPracticeButton: HTMLButtonElement | null = null;

  let totalTrialsInput: HTMLInputElement | null = null;
  let stopProportionInput: HTMLInputElement | null = null;
  let initialSsdInput: HTMLInputElement | null = null;
  let stepSizeInput: HTMLInputElement | null = null;
  let leftKeyInput: HTMLInputElement | null = null;
  let rightKeyInput: HTMLInputElement | null = null;
  let audioToggleInput: HTMLInputElement | null = null;
  let highContrastInput: HTMLInputElement | null = null;
  let largeButtonsInput: HTMLInputElement | null = null;

  let tonePlayer: TonePlayer | null = null;

  const settings: GameSettings = { ...defaultSettings };

  let practiceSequence: TrialDefinition[] = [];
  let mainSequence: TrialDefinition[] = [];
  let practiceCursor = 0;
  let mainCursor = 0;

  let currentPhase: Phase = 'idle';
  let resumeTarget: TrialBlock | null = null;
  let pausedTrial: PauseSnapshot | null = null;

  let currentSsd = settings.initialSsd;
  let activeState: ActiveTrialState | null = null;

  let stimulusTimer: number | null = null;
  let stopCueTimer: number | null = null;
  let isiTimer: number | null = null;

  const practiceResults: TrialRecord[] = [];
  const mainResults: TrialRecord[] = [];

  const clearTimer = (handle: number | null): void => {
    if (handle !== null) {
      window.clearTimeout(handle);
    }
  };

  const clearStimulusTimers = (): void => {
    clearTimer(stimulusTimer);
    clearTimer(stopCueTimer);
    stimulusTimer = null;
    stopCueTimer = null;
  };

  const clearIsiTimer = (): void => {
    clearTimer(isiTimer);
    isiTimer = null;
  };

  const updateStartButtonState = (): void => {
    if (!startButton) {
      return;
    }

    switch (currentPhase) {
      case 'idle':
        startButton.textContent = '开始练习';
        startButton.disabled = false;
        break;
      case 'practice':
        startButton.textContent = '练习进行中…';
        startButton.disabled = true;
        break;
      case 'awaiting-main':
        startButton.textContent = '开始正式测试';
        startButton.disabled = false;
        break;
      case 'paused':
        startButton.textContent = '已暂停';
        startButton.disabled = true;
        break;
      case 'main':
        startButton.textContent = '测试进行中…';
        startButton.disabled = true;
        break;
      case 'summary':
        startButton.textContent = '重新开始练习';
        startButton.disabled = false;
        break;
      default:
        startButton.textContent = '开始练习';
        startButton.disabled = false;
        break;
    }
  };

  const updateSkipButtonState = (): void => {
    if (!skipPracticeButton) {
      return;
    }

    if (currentPhase === 'idle' || currentPhase === 'practice') {
      skipPracticeButton.hidden = false;
      skipPracticeButton.disabled = false;
    } else {
      skipPracticeButton.hidden = true;
      skipPracticeButton.disabled = true;
    }
  };

  const setPhase = (next: Phase): void => {
    currentPhase = next;

    if (phaseLabelNode) {
      const mapping: Record<Phase, string> = {
        idle: '准备',
        practice: '练习阶段',
        'awaiting-main': '练习完成',
        paused: '已暂停',
        main: '正式测试',
        summary: '结果'
      };
      phaseLabelNode.textContent = mapping[next] ?? next;
    }

    if (wrapper) {
      wrapper.dataset.phase = next;
    }

    updateStartButtonState();
    updateSkipButtonState();
    updatePauseButton();
  };

  const updateProgressBar = (): void => {
    if (!progressBar) {
      return;
    }

    let completed = 0;
    let total = 1;

    if (currentPhase === 'practice') {
      completed = practiceResults.length;
      total = Math.max(1, practiceSequence.length);
    } else if (currentPhase === 'main' || currentPhase === 'paused' || currentPhase === 'summary' || currentPhase === 'awaiting-main') {
      completed = mainResults.length;
      total = Math.max(1, settings.totalTrials);
    }

    const percent = clampNumber((completed / total) * 100, 0, 100);
    progressBar.style.width = `${percent}%`;
  };

  const updateHudMetrics = (): void => {
    if (trialCounterNode) {
      const total = currentPhase === 'practice' ? practiceSequence.length : settings.totalTrials;
      const completed = currentPhase === 'practice' ? practiceResults.length : mainResults.length;
      trialCounterNode.textContent = `${Math.min(completed, total)} / ${total}`;
    }

    if (stopRateNode || goAccuracyNode) {
      const results = currentPhase === 'practice' ? practiceResults : mainResults;
      const metrics = computeSessionMetrics(results);

      if (stopRateNode) {
        stopRateNode.textContent = formatRate(metrics.stopSuccessRate);
      }

      if (goAccuracyNode) {
        goAccuracyNode.textContent = formatRate(metrics.goCorrectRate);
      }
    }

    if (ssdValueNode) {
      ssdValueNode.textContent = `${Math.round(currentSsd)} ms`;
    }
  };

  const showStatus = (message: string): void => {
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const hideSummary = (): void => {
    if (summaryNode) {
      summaryNode.hidden = true;
      summaryNode.innerHTML = '';
    }
  };

  const renderPracticeSummary = (): void => {
    if (!summaryNode) {
      return;
    }

    const metrics = computeSessionMetrics(practiceResults);
    summaryNode.hidden = false;
    summaryNode.innerHTML = '';

    const heading = document.createElement('h3');
    heading.className = 'stop-signal__summary-title';
    heading.textContent = '练习阶段完成';

    const list = document.createElement('dl');
    list.className = 'stop-signal__summary-grid';

    const entries: Array<{ label: string; value: string }> = [
      { label: '停止成功率', value: formatRate(metrics.stopSuccessRate) },
      { label: 'Go 正确率', value: formatRate(metrics.goCorrectRate) },
      { label: '平均 SSD', value: formatMs(metrics.meanSSD) }
    ];

    entries.forEach((entry) => {
      const dt = document.createElement('dt');
      dt.textContent = entry.label;
      const dd = document.createElement('dd');
      dd.textContent = entry.value;
      list.append(dt, dd);
    });

    const hint = document.createElement('p');
    hint.className = 'stop-signal__summary-hint';
    hint.textContent = '准备进入正式测试，目标是让停止成功率保持在 50% 左右。';

    summaryNode.append(heading, list, hint);
  };

  const renderSessionSummary = (): void => {
    if (!summaryNode) {
      return;
    }

    const metrics = computeSessionMetrics(mainResults);
    summaryNode.hidden = false;
    summaryNode.innerHTML = '';

    const heading = document.createElement('h3');
    heading.className = 'stop-signal__summary-title';
    heading.textContent = '测试结果';

    const list = document.createElement('dl');
    list.className = 'stop-signal__summary-grid';

    const entries: Array<{ label: string; value: string }> = [
      { label: '停止成功率', value: formatRate(metrics.stopSuccessRate) },
      { label: 'SSRT（整合法）', value: formatMs(metrics.ssrt) },
      { label: 'Go 反应时间（平均）', value: formatMs(metrics.goReactionTimeMean) },
      { label: 'Go 反应时间（中位数）', value: formatMs(metrics.goReactionTimeMedian) },
      { label: '平均 SSD', value: formatMs(metrics.meanSSD) },
      { label: '中位数 SSD', value: formatMs(metrics.medianSSD) }
    ];

    entries.forEach((entry) => {
      const dt = document.createElement('dt');
      dt.textContent = entry.label;
      const dd = document.createElement('dd');
      dd.textContent = entry.value;
      list.append(dt, dd);
    });

    const detail = document.createElement('p');
    detail.className = 'stop-signal__summary-hint';
    detail.textContent = '若停止成功率偏离 50%，可以调整初始 SSD 或阶梯步长后重新尝试。';

    summaryNode.append(heading, list, detail);
  };

  const updateResponseButtonsState = (): void => {
    const active = Boolean(activeState && (currentPhase === 'practice' || currentPhase === 'main'));
    const disabled = !active;

    if (leftResponseButton) {
      leftResponseButton.disabled = disabled;
      leftResponseButton.textContent = `← ${settings.leftKey}`;
    }

    if (rightResponseButton) {
      rightResponseButton.disabled = disabled;
      rightResponseButton.textContent = `${settings.rightKey} →`;
    }
  };

  const showStimulus = (trial: TrialDefinition): void => {
    if (!stimulusNode) {
      return;
    }

    stimulusNode.dataset.type = trial.type;
    stimulusNode.dataset.direction = trial.direction;
    stimulusNode.textContent = trial.direction === 'left' ? '←' : '→';

    if (stopCueNode) {
      stopCueNode.classList.remove('is-visible');
    }
  };

  const hideStimulus = (): void => {
    if (stimulusNode) {
      stimulusNode.textContent = '';
      delete stimulusNode.dataset.type;
      delete stimulusNode.dataset.direction;
    }

    if (stopCueNode) {
      stopCueNode.classList.remove('is-visible');
    }
  };

  const playStopCue = (): void => {
    if (stopCueNode) {
      stopCueNode.classList.add('is-visible');
    }

    if (settings.audioEnabled) {
      if (!tonePlayer) {
        tonePlayer = createTonePlayer();
      }
      tonePlayer.play();
    }
  };

  const registerResult = (result: TrialRecord): void => {
    if (result.block === 'practice') {
      practiceResults.push(result);
    } else {
      mainResults.push(result);
    }
  };

  const scheduleNextTrial = (): void => {
    clearIsiTimer();

    const delay = randomBetween(settings.isiMin, settings.isiMax);
    isiTimer = window.setTimeout(() => {
      isiTimer = null;
      if (currentPhase === 'practice') {
        runPracticeTrial();
      } else if (currentPhase === 'main') {
        runMainTrial();
      }
    }, delay);
  };

  const finalizeTrial = (result: TrialRecord): void => {
    clearStimulusTimers();
    hideStimulus();
    activeState = null;

    registerResult(result);

    if (result.type === 'stop' && !result.aborted && result.stopSignalDelay !== null) {
      currentSsd = applyStaircase(
        result.stopSignalDelay,
        result.stopSuccess === true,
        settings.ssdStep,
        settings.minSsd,
        settings.maxSsd
      );
    }

    updateProgressBar();
    updateHudMetrics();
    updateResponseButtonsState();

    if (currentPhase === 'practice' && practiceCursor >= practiceSequence.length) {
      setPhase('awaiting-main');
      renderPracticeSummary();
      showStatus('练习完成，可以复习结果后进入正式测试。');
      updateResponseButtonsState();
      return;
    }

    if (currentPhase === 'main' && mainCursor >= mainSequence.length) {
      setPhase('summary');
      renderSessionSummary();
      showStatus('正式测试结束，查看结果并可点击“重新开始”重新体验。');
      updateResponseButtonsState();
      return;
    }

    if (currentPhase === 'practice' || currentPhase === 'main') {
      scheduleNextTrial();
    }
  };

  const concludeGoResponse = (direction: Direction, key: string): void => {
    if (!activeState) {
      return;
    }

    const { definition, result } = activeState;
    if (result.reactionTime !== null || result.aborted) {
      return;
    }

    const rt = performance.now() - activeState.startedAt;
    result.reactionTime = Math.round(rt);
    result.responseKey = key;

    const correct = direction === definition.direction;
    result.correct = correct;
    result.stopSuccess = null;

    showStatus(correct ? '命中 Go 目标！继续保持节奏。' : '方向不符，试着集中在箭头方向。');
    finalizeTrial(result);
  };

  const concludeStopFailure = (key: string): void => {
    if (!activeState) {
      return;
    }

    const { result } = activeState;
    if (result.reactionTime !== null || result.aborted) {
      return;
    }

    const rt = performance.now() - activeState.startedAt;
    result.reactionTime = Math.round(rt);
    result.responseKey = key;
    result.correct = false;
    result.stopSuccess = false;

    showStatus('未能抑制反应，SSD 将适度缩短。');
    finalizeTrial(result);
  };

  const concludeStopSuccess = (): void => {
    if (!activeState) {
      return;
    }

    const { result } = activeState;
    if (result.reactionTime !== null || result.aborted) {
      return;
    }

    result.reactionTime = null;
    result.responseKey = null;
    result.correct = true;
    result.stopSuccess = true;

    showStatus('成功抑制反应，SSD 将稍作延长。');
    finalizeTrial(result);
  };

  const handleTimeout = (): void => {
    if (!activeState) {
      return;
    }

    const { definition, result } = activeState;

    if (definition.type === 'go') {
      result.reactionTime = null;
      result.correct = false;
      result.stopSuccess = null;
      result.responseKey = null;
      showStatus('超过 1.5 秒未响应，记为遗漏。');
      finalizeTrial(result);
      return;
    }

    concludeStopSuccess();
  };

  const presentTrial = (trial: TrialDefinition): void => {
    clearStimulusTimers();
    hideSummary();

    const stopSignalDelay = trial.type === 'stop' ? currentSsd : null;
    const record: TrialRecord = {
      index: trial.order,
      block: trial.block,
      type: trial.type,
      direction: trial.direction,
      reactionTime: null,
      correct: false,
      stopSuccess: trial.type === 'stop' ? false : null,
      stopSignalDelay,
      responseKey: null,
      aborted: false
    };

    activeState = {
      definition: trial,
      startedAt: performance.now(),
      result: record
    };

    showStimulus(trial);
    updateResponseButtonsState();

    if (trial.type === 'stop' && stopSignalDelay !== null) {
      stopCueTimer = window.setTimeout(() => {
        stopCueTimer = null;
        playStopCue();
      }, Math.max(0, Math.round(stopSignalDelay)));
    }

    stimulusTimer = window.setTimeout(() => {
      stimulusTimer = null;
      handleTimeout();
    }, settings.stimulusTimeout);
  };

  const runPracticeTrial = (): void => {
    if (practiceCursor >= practiceSequence.length) {
      return;
    }

    const trial = practiceSequence[practiceCursor];
    practiceCursor += 1;
    presentTrial(trial);
  };

  const runMainTrial = (): void => {
    if (mainCursor >= mainSequence.length) {
      return;
    }

    const trial = mainSequence[mainCursor];
    mainCursor += 1;
    presentTrial(trial);
  };

  const resetState = (): void => {
    clearStimulusTimers();
    clearIsiTimer();

    practiceSequence = [];
    mainSequence = [];
    practiceCursor = 0;
    mainCursor = 0;
    activeState = null;
    resumeTarget = null;
    pausedTrial = null;
    currentSsd = settings.initialSsd;
    practiceResults.length = 0;
    mainResults.length = 0;

    hideStimulus();
    hideSummary();
    updateProgressBar();
    updateHudMetrics();
    updateResponseButtonsState();
  };

  const startPractice = (): void => {
    resetState();
    practiceSequence = createTrialSequence(settings.practiceTrials, settings.stopProportion, 'practice');
    practiceCursor = 0;
    currentSsd = settings.initialSsd;
    setPhase('practice');
    showStatus('练习开始，箭头出现后请快速响应或在停止提示出现时抑制反应。');
    updateProgressBar();
    updateHudMetrics();
    updateResponseButtonsState();
    scheduleNextTrial();
  };

  const startMain = (): void => {
    clearStimulusTimers();
    clearIsiTimer();
    hideStimulus();
    hideSummary();
    mainSequence = createTrialSequence(settings.totalTrials, settings.stopProportion, 'main');
    mainCursor = 0;
    activeState = null;
    pausedTrial = null;
    resumeTarget = null;
    setPhase('main');
    showStatus('正式测试开始，尽量保持停止成功率在 50% 左右。');
    updateProgressBar();
    updateHudMetrics();
    updateResponseButtonsState();
    scheduleNextTrial();
  };

  const resumeSession = (): void => {
    if (currentPhase !== 'paused' || !resumeTarget) {
      return;
    }

    const targetPhase = resumeTarget;
    resumeTarget = null;
    setPhase(targetPhase === 'practice' ? 'practice' : 'main');
    showStatus('继续任务，保持节奏。');

    if (pausedTrial) {
      const trial = pausedTrial.definition;
      pausedTrial = null;
      presentTrial(trial);
      return;
    }

    if (targetPhase === 'practice') {
      runPracticeTrial();
    } else {
      runMainTrial();
    }
  };

  const pauseSession = (): void => {
    if (currentPhase !== 'practice' && currentPhase !== 'main') {
      return;
    }

    resumeTarget = currentPhase === 'practice' ? 'practice' : 'main';
    setPhase('paused');
    clearStimulusTimers();
    clearIsiTimer();

    if (activeState) {
      pausedTrial = {
        definition: activeState.definition,
        index: activeState.result.index
      };
      activeState = null;
      hideStimulus();
    }

    updateResponseButtonsState();
    showStatus('已暂停，可点击继续恢复任务。');
  };

  function updatePauseButton(): void {
    if (!pauseButton) {
      return;
    }

    if (currentPhase === 'practice' || currentPhase === 'main') {
      pauseButton.disabled = false;
      pauseButton.textContent = '暂停';
    } else if (currentPhase === 'paused') {
      pauseButton.disabled = false;
      pauseButton.textContent = '继续';
    } else {
      pauseButton.disabled = true;
      pauseButton.textContent = '暂停';
    }
  }

  const handlePauseButtonClick = (): void => {
    if (currentPhase === 'practice' || currentPhase === 'main') {
      pauseSession();
      updatePauseButton();
      return;
    }

    if (currentPhase === 'paused') {
      resumeSession();
      updatePauseButton();
    }
  };

  const handleStartButtonClick = (): void => {
    if (currentPhase === 'idle') {
      startPractice();
      return;
    }

    if (currentPhase === 'awaiting-main') {
      startMain();
      return;
    }

    if (currentPhase === 'summary') {
      startPractice();
    }
  };

  const handleRetryClick = (): void => {
    setPhase('idle');
    showStatus('调整参数后点击“开始练习”。');
    resetState();
  };

  const handleSkipPracticeClick = (): void => {
    resetState();
    setPhase('main');
    showStatus('正式测试开始，请立即进入状态。');
    startMain();
  };

  const handleLeftResponseClick = (): void => {
    handleResponse('left', settings.leftKey);
  };

  const handleRightResponseClick = (): void => {
    handleResponse('right', settings.rightKey);
  };

  const applySettingsUpdate = (): void => {
    if (totalTrialsInput) {
      totalTrialsInput.value = settings.totalTrials.toString();
    }
    if (stopProportionInput) {
      stopProportionInput.value = settings.stopProportion.toString();
    }
    if (initialSsdInput) {
      initialSsdInput.value = settings.initialSsd.toString();
    }
    if (stepSizeInput) {
      stepSizeInput.value = settings.ssdStep.toString();
    }
    if (leftKeyInput) {
      leftKeyInput.value = settings.leftKey;
    }
    if (rightKeyInput) {
      rightKeyInput.value = settings.rightKey;
    }
    if (audioToggleInput) {
      audioToggleInput.checked = settings.audioEnabled;
    }
    if (highContrastInput) {
      highContrastInput.checked = settings.highContrast;
    }
    if (largeButtonsInput) {
      largeButtonsInput.checked = settings.largeButtons;
    }

    if (wrapper) {
      wrapper.classList.toggle('stop-signal--high-contrast', settings.highContrast);
      wrapper.classList.toggle('stop-signal--large-buttons', settings.largeButtons);
    }

    updateResponseButtonsState();
    updateHudMetrics();
  };

  const parseNumberValue = (value: string, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const attachSettingsListeners = (): void => {
    totalTrialsInput?.addEventListener('change', () => {
      const value = clampNumber(Math.round(parseNumberValue(totalTrialsInput.value, settings.totalTrials)), 20, 240);
      settings.totalTrials = value;
      applySettingsUpdate();
      updateProgressBar();
    });

    stopProportionInput?.addEventListener('change', () => {
      const value = clampNumber(parseNumberValue(stopProportionInput.value, settings.stopProportion), 0.1, 0.5);
      settings.stopProportion = parseFloat(value.toFixed(2));
      applySettingsUpdate();
    });

    initialSsdInput?.addEventListener('change', () => {
      const value = clampNumber(Math.round(parseNumberValue(initialSsdInput.value, settings.initialSsd)), settings.minSsd, settings.maxSsd);
      settings.initialSsd = value;
      currentSsd = value;
      applySettingsUpdate();
    });

    stepSizeInput?.addEventListener('change', () => {
      const value = clampNumber(Math.round(parseNumberValue(stepSizeInput.value, settings.ssdStep)), 10, 150);
      settings.ssdStep = value;
      applySettingsUpdate();
    });

    leftKeyInput?.addEventListener('change', () => {
      const value = leftKeyInput.value.trim();
      settings.leftKey = value || defaultSettings.leftKey;
      applySettingsUpdate();
    });

    rightKeyInput?.addEventListener('change', () => {
      const value = rightKeyInput.value.trim();
      settings.rightKey = value || defaultSettings.rightKey;
      applySettingsUpdate();
    });

    audioToggleInput?.addEventListener('change', () => {
      settings.audioEnabled = Boolean(audioToggleInput.checked);
      if (!settings.audioEnabled && tonePlayer) {
        tonePlayer.dispose();
        tonePlayer = null;
      }
    });

    highContrastInput?.addEventListener('change', () => {
      settings.highContrast = Boolean(highContrastInput.checked);
      applySettingsUpdate();
    });

    largeButtonsInput?.addEventListener('change', () => {
      settings.largeButtons = Boolean(largeButtonsInput.checked);
      applySettingsUpdate();
    });
  };

  const applyPreset = (preset: 'short' | 'standard'): void => {
    if (preset === 'short') {
      settings.totalTrials = 60;
      settings.stopProportion = 0.25;
    } else {
      settings.totalTrials = 120;
      settings.stopProportion = 0.25;
    }
    applySettingsUpdate();
    updateProgressBar();
  };

  const handleResponse = (direction: Direction, key: string): void => {
    if (!activeState) {
      return;
    }

    if (currentPhase !== 'practice' && currentPhase !== 'main') {
      return;
    }

    if (activeState.definition.type === 'go') {
      concludeGoResponse(direction, key);
    } else {
      concludeStopFailure(key);
    }
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!host) {
      return;
    }

    if (event.key === settings.leftKey) {
      event.preventDefault();
      handleResponse('left', event.key);
    } else if (event.key === settings.rightKey) {
      event.preventDefault();
      handleResponse('right', event.key);
    }
  };

  const buildField = (labelText: string, input: HTMLInputElement, helper?: string): HTMLDivElement => {
    const wrapperElement = document.createElement('div');
    wrapperElement.className = 'stop-signal__field';

    const label = document.createElement('label');
    label.className = 'stop-signal__label';
    label.textContent = labelText;
    label.appendChild(input);
    wrapperElement.appendChild(label);

    if (helper) {
      const note = document.createElement('span');
      note.className = 'stop-signal__field-note';
      note.textContent = helper;
      wrapperElement.appendChild(note);
    }

    return wrapperElement;
  };

  const buildToggle = (labelText: string, input: HTMLInputElement): HTMLLabelElement => {
    const label = document.createElement('label');
    label.className = 'stop-signal__toggle';
    label.append(input, document.createTextNode(labelText));
    return label;
  };

  const mount = (container: HTMLElement): void => {
    host = container;
    container.innerHTML = '';

    wrapper = document.createElement('div');
    wrapper.className = 'stop-signal';

    const intro = document.createElement('div');
    intro.className = 'stop-signal__intro';

    const badge = document.createElement('span');
    badge.className = 'stop-signal__badge';
    badge.textContent = '抑制控制';

    const introText = document.createElement('p');
    introText.className = 'stop-signal__description';
    introText.textContent = 'Go 试次需要快速指向箭头方向，Stop 试次会在延迟后出现红色提示与提示音，请立即停止反应。';

    intro.append(badge, introText);

    const settingsPanel = document.createElement('section');
    settingsPanel.className = 'stop-signal__settings';

    totalTrialsInput = document.createElement('input');
    totalTrialsInput.type = 'number';
    totalTrialsInput.min = '20';
    totalTrialsInput.max = '240';
    totalTrialsInput.step = '10';

    stopProportionInput = document.createElement('input');
    stopProportionInput.type = 'number';
    stopProportionInput.min = '0.1';
    stopProportionInput.max = '0.5';
    stopProportionInput.step = '0.05';

    initialSsdInput = document.createElement('input');
    initialSsdInput.type = 'number';
    initialSsdInput.min = settings.minSsd.toString();
    initialSsdInput.max = settings.maxSsd.toString();
    initialSsdInput.step = '25';

    stepSizeInput = document.createElement('input');
    stepSizeInput.type = 'number';
    stepSizeInput.min = '10';
    stepSizeInput.max = '150';
    stepSizeInput.step = '10';

    leftKeyInput = document.createElement('input');
    leftKeyInput.type = 'text';
    leftKeyInput.placeholder = '如 ArrowLeft / A';

    rightKeyInput = document.createElement('input');
    rightKeyInput.type = 'text';
    rightKeyInput.placeholder = '如 ArrowRight / L';

    audioToggleInput = document.createElement('input');
    audioToggleInput.type = 'checkbox';

    highContrastInput = document.createElement('input');
    highContrastInput.type = 'checkbox';

    largeButtonsInput = document.createElement('input');
    largeButtonsInput.type = 'checkbox';

    const fieldsGrid = document.createElement('div');
    fieldsGrid.className = 'stop-signal__fields';
    fieldsGrid.append(
      buildField('总试次数', totalTrialsInput, '标准为 120 次（约 90 个 Go / 30 个 Stop）'),
      buildField('Stop 比例', stopProportionInput, '建议 0.25，目标停止成功率约 50%'),
      buildField('初始 SSD (ms)', initialSsdInput, '停止信号延迟起点，范围 50-900'),
      buildField('阶梯步长 (ms)', stepSizeInput, '每次成功/失败后的调整幅度'),
      buildField('左键（Go 左）', leftKeyInput),
      buildField('右键（Go 右）', rightKeyInput)
    );

    const toggles = document.createElement('div');
    toggles.className = 'stop-signal__toggles';
    toggles.append(
      buildToggle('提示音', audioToggleInput),
      buildToggle('高对比度模式', highContrastInput),
      buildToggle('触控大按钮', largeButtonsInput)
    );

    const presets = document.createElement('div');
    presets.className = 'stop-signal__presets';

    const presetsLabel = document.createElement('span');
    presetsLabel.className = 'stop-signal__presets-label';
    presetsLabel.textContent = '快速预设';

    const presetsGroup = document.createElement('div');
    presetsGroup.className = 'stop-signal__presets-group';

    const shortPresetButton = document.createElement('button');
    shortPresetButton.type = 'button';
    shortPresetButton.className = 'stop-signal__preset';
    shortPresetButton.textContent = '短版（60 次）';
    shortPresetButton.addEventListener('click', () => applyPreset('short'));

    const standardPresetButton = document.createElement('button');
    standardPresetButton.type = 'button';
    standardPresetButton.className = 'stop-signal__preset';
    standardPresetButton.textContent = '标准版（120 次）';
    standardPresetButton.addEventListener('click', () => applyPreset('standard'));

    presetsGroup.append(shortPresetButton, standardPresetButton);
    presets.append(presetsLabel, presetsGroup);

    settingsPanel.append(fieldsGrid, toggles, presets);

    const actions = document.createElement('div');
    actions.className = 'stop-signal__actions';

    startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'button button--primary';
    startButton.textContent = '开始练习';
    startButton.addEventListener('click', handleStartButtonClick);

    pauseButton = document.createElement('button');
    pauseButton.type = 'button';
    pauseButton.className = 'button button--secondary';
    pauseButton.textContent = '暂停';
    pauseButton.addEventListener('click', handlePauseButtonClick);

    retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'button button--ghost';
    retryButton.textContent = '重新开始';
    retryButton.addEventListener('click', handleRetryClick);

    skipPracticeButton = document.createElement('button');
    skipPracticeButton.type = 'button';
    skipPracticeButton.className = 'stop-signal__skip';
    skipPracticeButton.textContent = '跳过练习，直接进入正式测试';
    skipPracticeButton.addEventListener('click', handleSkipPracticeClick);

    actions.append(startButton, pauseButton, retryButton);

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'stop-signal__progress-wrapper';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'stop-signal__progress-track';

    progressBar = document.createElement('div');
    progressBar.className = 'stop-signal__progress-bar';
    progressTrack.appendChild(progressBar);
    progressWrapper.appendChild(progressTrack);

    const hud = document.createElement('div');
    hud.className = 'stop-signal__hud';

    const createMetric = (
      label: string
    ): { element: HTMLDivElement; value: HTMLSpanElement } => {
      const element = document.createElement('div');
      element.className = 'stop-signal__metric';
      const title = document.createElement('span');
      title.className = 'stop-signal__metric-label';
      title.textContent = label;
      const value = document.createElement('span');
      value.className = 'stop-signal__metric-value';
      element.append(title, value);
      return { element, value };
    };

    const phaseMetric = createMetric('当前阶段');
    phaseLabelNode = phaseMetric.value;

    const trialMetric = createMetric('已完成试次');
    trialCounterNode = trialMetric.value;

    const stopMetric = createMetric('停止成功率');
    stopRateNode = stopMetric.value;

    const goMetric = createMetric('Go 准确率');
    goAccuracyNode = goMetric.value;

    const ssdMetric = createMetric('当前 SSD');
    ssdValueNode = ssdMetric.value;

    hud.append(
      phaseMetric.element,
      trialMetric.element,
      stopMetric.element,
      goMetric.element,
      ssdMetric.element
    );

    const stage = document.createElement('div');
    stage.className = 'stop-signal__stage';

    stimulusNode = document.createElement('div');
    stimulusNode.className = 'stop-signal__stimulus';
    stimulusNode.setAttribute('aria-live', 'polite');

    stopCueNode = document.createElement('div');
    stopCueNode.className = 'stop-signal__stop-cue';
    stopCueNode.innerHTML = '<span>✖</span><small>停止</small>';

    stage.append(stimulusNode, stopCueNode);

    const responses = document.createElement('div');
    responses.className = 'stop-signal__responses';

    leftResponseButton = document.createElement('button');
    leftResponseButton.type = 'button';
    leftResponseButton.className = 'stop-signal__response';
    leftResponseButton.addEventListener('click', handleLeftResponseClick);

    rightResponseButton = document.createElement('button');
    rightResponseButton.type = 'button';
    rightResponseButton.className = 'stop-signal__response';
    rightResponseButton.addEventListener('click', handleRightResponseClick);

    responses.append(leftResponseButton, rightResponseButton);

    statusNode = document.createElement('p');
    statusNode.className = 'stop-signal__status';
    statusNode.textContent = '调整参数后点击“开始练习”。';

    summaryNode = document.createElement('div');
    summaryNode.className = 'stop-signal__summary';
    summaryNode.hidden = true;

    wrapper.append(
      intro,
      settingsPanel,
      actions,
      skipPracticeButton,
      progressWrapper,
      hud,
      stage,
      responses,
      statusNode,
      summaryNode
    );

    container.appendChild(wrapper);

    attachSettingsListeners();
    applySettingsUpdate();
    setPhase('idle');
    updateProgressBar();
    updateHudMetrics();
    updateResponseButtonsState();

    window.addEventListener('keydown', handleKeyDown);
  };

  const destroy = (): void => {
    clearStimulusTimers();
    clearIsiTimer();

    window.removeEventListener('keydown', handleKeyDown);

    if (startButton) {
      startButton.removeEventListener('click', handleStartButtonClick);
    }

    if (pauseButton) {
      pauseButton.removeEventListener('click', handlePauseButtonClick);
    }

    if (retryButton) {
      retryButton.removeEventListener('click', handleRetryClick);
    }

    if (skipPracticeButton) {
      skipPracticeButton.removeEventListener('click', handleSkipPracticeClick);
    }

    if (leftResponseButton) {
      leftResponseButton.removeEventListener('click', handleLeftResponseClick);
    }

    if (rightResponseButton) {
      rightResponseButton.removeEventListener('click', handleRightResponseClick);
    }

    if (tonePlayer) {
      tonePlayer.dispose();
      tonePlayer = null;
    }

    if (host) {
      host.innerHTML = '';
    }

    host = null;
    wrapper = null;
    progressBar = null;
    phaseLabelNode = null;
    trialCounterNode = null;
    stopRateNode = null;
    goAccuracyNode = null;
    ssdValueNode = null;
    stimulusNode = null;
    stopCueNode = null;
    statusNode = null;
    summaryNode = null;
    leftResponseButton = null;
    rightResponseButton = null;
    startButton = null;
    pauseButton = null;
    retryButton = null;
    skipPracticeButton = null;
    totalTrialsInput = null;
    stopProportionInput = null;
    initialSsdInput = null;
    stepSizeInput = null;
    leftKeyInput = null;
    rightKeyInput = null;
    audioToggleInput = null;
    highContrastInput = null;
    largeButtonsInput = null;

    setPhase('idle');
  };

  return {
    init: (container: HTMLElement) => {
      mount(container);
    },
    destroy,
    getMeta: () => meta
  };
})();

export default stopSignalGame;
