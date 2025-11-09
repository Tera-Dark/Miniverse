import type { GameMeta, GameModule } from '../types';
import {
  DEFAULT_BLOCK_BEATS,
  DEFAULT_BEAT_TOLERANCE_MS,
  DEFAULT_OUTLIER_THRESHOLD_MS,
  bpmToIntervalMs,
  calculateBeatSchedule,
  computeAsynchronyMetrics,
  computeBlockResult,
  type Beat,
  type BlockResult,
  type Tap,
  type TapSource
} from './logic';

const meta: GameMeta = {
  id: 'rhythm-tapping',
  title: '节奏同步：节拍敲击',
  description: '跟随节拍器稳定敲击，测量节奏偏移、RMS 误差与节奏稳定性。',
  accentColor: '#facc15'
};

type PresetId = 'easy' | 'normal' | 'hard' | 'custom';

interface BpmPreset {
  id: PresetId;
  label: string;
  description: string;
  bpm: number;
}

const bpmPresets: BpmPreset[] = [
  {
    id: 'easy',
    label: '轻松 · 90 BPM',
    description: '舒缓速度，适合热身与初学者。',
    bpm: 90
  },
  {
    id: 'normal',
    label: '标准 · 120 BPM',
    description: '常见的流行节奏，训练稳定同步。',
    bpm: 120
  },
  {
    id: 'hard',
    label: '挑战 · 150 BPM',
    description: '快速节拍，考验反应与稳定性。',
    bpm: 150
  },
  {
    id: 'custom',
    label: '自定义',
    description: '40–200 BPM，满足自由调节需求。',
    bpm: 120
  }
];

const STYLE_TAG_ID = 'rhythm-tapping-styles';
const START_DELAY_MS = 360;
const SCHEDULER_INTERVAL_MS = 24;
const SCHEDULER_LOOKAHEAD_MS = 220;
const MIN_TAP_INTERVAL_MS = 70;
const CALIBRATION_BEATS = 16;
const LATENCY_MIN_MS = -250;
const LATENCY_MAX_MS = 250;

const ensureStyles = () => {
  // Styles moved to games.css - no inline styles needed
};

const formatMs = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)} ms`;
};

const formatPositiveMs = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)} ms`;
};

const formatPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const formatCoverage = (matched: number, total: number): string => {
  if (total === 0) {
    return '—';
  }
  return `${matched}/${total} (${((matched / total) * 100).toFixed(1)}%)`;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type BlockMode = 'play' | 'calibration';

interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const rhythmTappingGame: GameModule = (() => {
  let host: HTMLElement | null = null;
  let container: HTMLDivElement | null = null;
  let pulseNode: HTMLDivElement | null = null;
  let tapPadButton: HTMLButtonElement | null = null;

  let beatCounterNode: HTMLSpanElement | null = null;
  let bpmNode: HTMLSpanElement | null = null;
  let tapCounterNode: HTMLSpanElement | null = null;
  let offsetDisplayNode: HTMLSpanElement | null = null;
  let statusNode: HTMLParagraphElement | null = null;

  let blockSummaryNode: HTMLDivElement | null = null;
  let sessionSummaryNode: HTMLDivElement | null = null;

  let startButton: HTMLButtonElement | null = null;
  let stopButton: HTMLButtonElement | null = null;
  let calibrateButton: HTMLButtonElement | null = null;
  let resetButton: HTMLButtonElement | null = null;

  let latencyInput: HTMLInputElement | null = null;
  let customBpmInput: HTMLInputElement | null = null;
  let hapticsToggle: HTMLInputElement | null = null;

  const presetButtons = new Map<PresetId, HTMLButtonElement>();

  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;

  let selectedPreset: PresetId = 'normal';
  let customBpm = 120;
  let currentBpm = 120;
  let latencyOffsetMs = 0;
  let audioEnabled = true;
  let visualEnabled = true;
  let hapticsEnabled = false;
  let highContrastEnabled = false;

  let blockMode: BlockMode | null = null;
  let blockBeats = DEFAULT_BLOCK_BEATS;
  let activeBeats: Beat[] = [];
  let activeTaps: Tap[] = [];
  let sessionResults: BlockResult[] = [];

  let blockStartedAt = 0;
  let blockEndedAt = 0;
  let blockIntervalMs = bpmToIntervalMs(currentBpm);
  let blockActive = false;
  let lastTapTimestamp = 0;

  let schedulerId: number | null = null;
  let completionTimeout: number | null = null;
  const beatTimeouts = new Map<number, number>();
  const pulseReleaseTimeouts = new Map<number, number>();
  const audioScheduledBeats = new Set<number>();

  let scheduledCursor = 0;
  let executedBeats = 0;

  let blockAudioStartTime = 0;

  const cleanupTasks: Array<() => void> = [];

  const ensureAudioContext = (): AudioContext | null => {
    const win = window as WindowWithWebkit;
    const AudioCtor = window.AudioContext ?? win.webkitAudioContext;

    if (!AudioCtor) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.45;
      masterGain.connect(audioContext.destination);
      updateAudioGain();
    }

    return audioContext;
  };

  const updateAudioGain = () => {
    if (!masterGain) {
      return;
    }

    const context = masterGain.context;
    const target = audioEnabled ? 0.45 : 0;
    masterGain.gain.cancelScheduledValues(context.currentTime);
    masterGain.gain.setTargetAtTime(target, context.currentTime, 0.03);
  };

  const resetScheduler = () => {
    if (schedulerId !== null) {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }

    beatTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    beatTimeouts.clear();

    pulseReleaseTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pulseReleaseTimeouts.clear();

    if (completionTimeout !== null) {
      window.clearTimeout(completionTimeout);
      completionTimeout = null;
    }

    audioScheduledBeats.clear();
  };

  const clearState = () => {
    blockActive = false;
    blockMode = null;
    scheduledCursor = 0;
    executedBeats = 0;
    activeBeats = [];
    activeTaps = [];
    blockStartedAt = 0;
    blockEndedAt = 0;
    lastTapTimestamp = 0;
    resetScheduler();
    updateHud();
  };

  const triggerPulse = (beatIndex: number) => {
    if (!pulseNode) {
      return;
    }

    if (!visualEnabled) {
      return;
    }

    pulseNode.classList.add('is-pulsing');
    const timeoutId = window.setTimeout(() => {
      pulseNode?.classList.remove('is-pulsing');
      pulseReleaseTimeouts.delete(beatIndex);
    }, 150);
    pulseReleaseTimeouts.set(beatIndex, timeoutId);
  };

  const vibrate = (duration: number) => {
    if (!hapticsEnabled) {
      return;
    }
    if (!('vibrate' in navigator)) {
      return;
    }
    navigator.vibrate(duration);
  };

  const executeBeat = (beat: Beat) => {
    if (!blockActive) {
      return;
    }

    beatTimeouts.delete(beat.index);

    if (beat.index < executedBeats) {
      return;
    }

    executedBeats = beat.index + 1;
    updateHud();

    triggerPulse(beat.index);
    vibrate(10);

    if (beat.index === activeBeats.length - 1) {
      if (completionTimeout !== null) {
        window.clearTimeout(completionTimeout);
      }
      completionTimeout = window.setTimeout(() => finalizeBlock(), blockIntervalMs + 420);
    }
  };

  const scheduleBeatTimeout = (beat: Beat) => {
    if (beatTimeouts.has(beat.index)) {
      return;
    }

    const now = performance.now();
    const delay = Math.max(0, beat.actualTimeMs - now);
    const timeoutId = window.setTimeout(() => executeBeat(beat), delay);
    beatTimeouts.set(beat.index, timeoutId);
  };

  const scheduleAudioClick = (beat: Beat, accent: boolean) => {
    if (!audioEnabled) {
      return;
    }

    const context = ensureAudioContext();

    if (!context || !masterGain) {
      return;
    }

    if (audioScheduledBeats.has(beat.index)) {
      return;
    }

    const offsetSeconds = (beat.actualTimeMs - blockStartedAt) / 1000;
    const scheduledTime = blockAudioStartTime + offsetSeconds;

    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    envelope.gain.value = 0;

    oscillator.type = accent ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(accent ? 1175 : 880, scheduledTime);

    envelope.gain.setValueAtTime(0, scheduledTime);
    envelope.gain.linearRampToValueAtTime(accent ? 0.6 : 0.42, scheduledTime + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, scheduledTime + 0.12);

    oscillator.connect(envelope);
    envelope.connect(masterGain);

    oscillator.start(scheduledTime);
    oscillator.stop(scheduledTime + 0.16);

    audioScheduledBeats.add(beat.index);
  };

  const scheduleBeats = () => {
    if (!blockActive) {
      return;
    }

    const now = performance.now();

    while (scheduledCursor < activeBeats.length) {
      const beat = activeBeats[scheduledCursor];
      const timeUntilBeat = beat.actualTimeMs - now;

      if (timeUntilBeat <= SCHEDULER_LOOKAHEAD_MS) {
        scheduleBeatTimeout(beat);
        scheduleAudioClick(beat, beat.index % 4 === 0);
        scheduledCursor += 1;
      } else {
        break;
      }
    }

    if (scheduledCursor >= activeBeats.length && schedulerId !== null) {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }
  };

  const updateStatus = (message: string) => {
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const updateHud = () => {
    if (beatCounterNode) {
      beatCounterNode.textContent = `${Math.min(executedBeats, activeBeats.length)}/${activeBeats.length}`;
    }

    if (bpmNode) {
      bpmNode.textContent = `${currentBpm} BPM`;
    }

    if (tapCounterNode) {
      tapCounterNode.textContent = `${activeTaps.length}`;
    }

    if (offsetDisplayNode) {
      offsetDisplayNode.textContent = formatMs(latencyOffsetMs);
    }
  };

  const setContainerModeFlags = () => {
    if (!container) {
      return;
    }
    container.classList.toggle('rhythm-tapping--visual-disabled', !visualEnabled);
    container.classList.toggle('rhythm-tapping--audio-disabled', !audioEnabled);
    container.classList.toggle('rhythm-tapping--contrast', highContrastEnabled);

    // Update glass components for high contrast mode
    document.querySelectorAll('.rhythm-tapping .glass-control, .rhythm-tapping .glass-tile, .rhythm-tapping .glass-badge').forEach((element) => {
      element.setAttribute('data-high-contrast', highContrastEnabled ? 'true' : 'false');
    });
  };

  const refreshPresetButtons = () => {
    presetButtons.forEach((button, id) => {
      button.classList.toggle('is-active', id === selectedPreset);
    });
  };

  const applyBpm = (bpm: number) => {
    const clamped = clampNumber(Math.round(bpm), 40, 200);
    currentBpm = clamped;
    blockIntervalMs = bpmToIntervalMs(clamped);
    updateHud();
  };

  const ensureTapRecorded = (source: TapSource) => {
    if (!blockActive) {
      return;
    }

    const now = performance.now();

    if (now - lastTapTimestamp < MIN_TAP_INTERVAL_MS) {
      return;
    }

    lastTapTimestamp = now;

    const tap: Tap = {
      timeMs: now,
      source
    };

    activeTaps.push(tap);
    updateHud();

    tapPadButton?.classList.add('is-active');
    window.setTimeout(() => {
      tapPadButton?.classList.remove('is-active');
    }, 120);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!blockActive) {
      return;
    }

    if (event.repeat) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      ensureTapRecorded('keyboard');
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!blockActive) {
      return;
    }
    if (event.pointerType === 'mouse') {
      ensureTapRecorded('mouse');
    } else if (event.pointerType === 'touch') {
      ensureTapRecorded('touch');
    } else {
      ensureTapRecorded('unknown');
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible' && blockActive) {
      stopBlock(true);
      updateStatus('标签页不可见，已自动暂停本轮节奏。');
    }
  };

  const startScheduler = () => {
    scheduleBeats();
    if (schedulerId !== null) {
      return;
    }
    schedulerId = window.setInterval(scheduleBeats, SCHEDULER_INTERVAL_MS);
  };

  const finalizeBlock = () => {
    if (!blockActive) {
      return;
    }

    blockActive = false;
    blockEndedAt = performance.now();

    const blockResult = computeBlockResult({
      beats: activeBeats,
      taps: activeTaps,
      bpm: currentBpm,
      latencyOffsetMs,
      startedAt: blockStartedAt,
      endedAt: blockEndedAt,
      toleranceMs: DEFAULT_BEAT_TOLERANCE_MS,
      outlierThresholdMs: DEFAULT_OUTLIER_THRESHOLD_MS
    });

    resetScheduler();

    if (blockMode === 'calibration') {
      const calibrationMean = blockResult.metrics.meanAsynchrony;
      if (calibrationMean !== null) {
        latencyOffsetMs = clampNumber(latencyOffsetMs - calibrationMean, LATENCY_MIN_MS, LATENCY_MAX_MS);
        if (latencyInput) {
          latencyInput.value = `${latencyOffsetMs}`;
        }
        updateStatus(`校准完成：新的延迟补偿 ${formatMs(latencyOffsetMs)}，尝试再次演奏。`);
      } else {
        updateStatus('校准未获得有效敲击样本，请重新尝试。');
      }
    } else {
      updateStatus('本轮完成，查看统计并可继续下一组节奏。');
      sessionResults.push(blockResult);
    }

    renderBlockSummary(blockResult, blockMode === 'calibration');
    renderSessionSummary();
    updateHud();
    setControlsState();
    blockMode = null;
  };

  const stopBlock = (abort: boolean) => {
    if (!blockActive) {
      return;
    }

    if (!abort) {
      finalizeBlock();
      return;
    }

    blockActive = false;
    clearState();
    updateStatus('已中止本轮节奏。');
    setControlsState();
    renderBlockSummary(null, false);
  };

  const startBlock = (mode: BlockMode) => {
    if (blockActive) {
      return;
    }

    const context = ensureAudioContext();
    if (context) {
      context.resume().catch(() => {
        /* ignored */
      });
    }

    blockMode = mode;
    blockBeats = mode === 'calibration' ? CALIBRATION_BEATS : DEFAULT_BLOCK_BEATS;
    blockIntervalMs = bpmToIntervalMs(currentBpm);

    const startTime = performance.now() + START_DELAY_MS;
    blockStartedAt = startTime;
    blockEndedAt = 0;
    blockAudioStartTime = context ? context.currentTime + START_DELAY_MS / 1000 : 0;

    activeBeats = calculateBeatSchedule(startTime, blockBeats, blockIntervalMs, latencyOffsetMs);
    activeTaps = [];
    executedBeats = 0;
    scheduledCursor = 0;
    lastTapTimestamp = 0;

    updateHud();

    blockActive = true;
    updateStatus(mode === 'calibration' ? '请随节拍敲击以测量设备延迟…' : '保持节奏稳定，完成整个节拍块。');

    renderBlockSummary(null, mode === 'calibration');

    startScheduler();
    setControlsState();
  };

  const renderBlockSummary = (result: BlockResult | null, isCalibration: boolean) => {
    if (!blockSummaryNode) {
      return;
    }

    blockSummaryNode.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'rhythm-tapping__summary-card';

    const title = document.createElement('h3');
    title.className = 'rhythm-tapping__summary-title';
    title.textContent = isCalibration ? '最新校准结果' : '本轮节拍统计';

    card.appendChild(title);

    const metricsList = document.createElement('div');
    metricsList.className = 'rhythm-tapping__metrics';

    if (!result) {
      const placeholder = document.createElement('p');
      placeholder.className = 'rhythm-tapping__status';
      placeholder.textContent = isCalibration
        ? '校准结果将在完成一次校准节奏后显示。'
        : '完成一轮节奏练习后，将显示 RMS 误差与稳定性指标。';
      card.appendChild(placeholder);
      blockSummaryNode.appendChild(card);
      return;
    }

    const matched = result.matches.filter((entry) => entry.asynchrony !== null).length;
    const total = result.matches.length;

    const createMetric = (label: string, value: string) => {
      const row = document.createElement('div');
      row.className = 'rhythm-tapping__metric';

      const labelNode = document.createElement('span');
      labelNode.className = 'rhythm-tapping__metric-label';
      labelNode.textContent = label;

      const valueNode = document.createElement('span');
      valueNode.className = 'rhythm-tapping__metric-value';
      valueNode.textContent = value;

      row.append(labelNode, valueNode);
      metricsList.appendChild(row);
    };

    createMetric('样本覆盖', formatCoverage(matched, total));
    createMetric('平均偏移 (bias)', formatMs(result.metrics.meanAsynchrony));
    createMetric('RMS 误差', formatPositiveMs(result.metrics.rmsError));
    createMetric('稳定性 (SD)', formatPositiveMs(result.metrics.stdDev));
    createMetric('异常率 (>|150|ms)', formatPercent(result.metrics.outlierRate));
    createMetric('节奏设定', `${result.bpm} BPM / ${total} 拍`);

    card.appendChild(metricsList);
    blockSummaryNode.appendChild(card);
  };

  const renderSessionSummary = () => {
    if (!sessionSummaryNode) {
      return;
    }

    sessionSummaryNode.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'rhythm-tapping__summary-card';

    const title = document.createElement('h3');
    title.className = 'rhythm-tapping__summary-title';
    title.textContent = '会话累计指标';
    card.appendChild(title);

    if (sessionResults.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'rhythm-tapping__status';
      placeholder.textContent = '完成至少一轮节奏后，将累计展示整体 RMS 误差与稳定性趋势。';
      card.appendChild(placeholder);
      sessionSummaryNode.appendChild(card);
      return;
    }

    const metricsList = document.createElement('div');
    metricsList.className = 'rhythm-tapping__metrics';

    const allMatches = sessionResults.flatMap((result) => result.matches);
    const matched = allMatches.filter((entry) => entry.asynchrony !== null).length;
    const total = allMatches.length;

    const aggregated = computeAsynchronyMetrics(allMatches, DEFAULT_OUTLIER_THRESHOLD_MS);

    const averageBpm = Math.round(
      sessionResults.reduce((sum, result) => sum + result.bpm, 0) / sessionResults.length
    );

    const totalBeats = sessionResults.reduce((sum, result) => sum + result.matches.length, 0);
    const totalTaps = sessionResults.reduce((sum, result) => sum + result.taps.length, 0);

    const createMetric = (label: string, value: string) => {
      const row = document.createElement('div');
      row.className = 'rhythm-tapping__metric';

      const labelNode = document.createElement('span');
      labelNode.className = 'rhythm-tapping__metric-label';
      labelNode.textContent = label;

      const valueNode = document.createElement('span');
      valueNode.className = 'rhythm-tapping__metric-value';
      valueNode.textContent = value;

      row.append(labelNode, valueNode);
      metricsList.appendChild(row);
    };

    createMetric('完成节拍块', `${sessionResults.length}`);
    createMetric('平均 BPM', `${averageBpm} BPM`);
    createMetric('匹配覆盖', formatCoverage(matched, total));
    createMetric('整体平均偏移', formatMs(aggregated.meanAsynchrony));
    createMetric('整体 RMS 误差', formatPositiveMs(aggregated.rmsError));
    createMetric('稳定性 (SD)', formatPositiveMs(aggregated.stdDev));
    createMetric('异常率', formatPercent(aggregated.outlierRate));
    createMetric('累计数据', `${totalTaps} 次敲击 / ${totalBeats} 拍`);

    card.appendChild(metricsList);
    sessionSummaryNode.appendChild(card);
  };

  const resetSession = () => {
    sessionResults = [];
    renderSessionSummary();
    renderBlockSummary(null, false);
    updateStatus('会话数据已清空，可重新开始新的节奏测量。');
  };

  const setControlsState = () => {
    if (startButton) {
      startButton.disabled = blockActive;
    }
    if (stopButton) {
      stopButton.disabled = !blockActive;
    }
    if (calibrateButton) {
      calibrateButton.disabled = blockActive;
    }
    if (latencyInput) {
      latencyInput.disabled = blockActive;
    }
    if (customBpmInput) {
      customBpmInput.disabled = selectedPreset !== 'custom' || blockActive;
    }
  };

  const handlePresetSelect = (preset: BpmPreset) => {
    selectedPreset = preset.id;
    refreshPresetButtons();

    if (preset.id !== 'custom') {
      applyBpm(preset.bpm);
    } else {
      applyBpm(customBpm);
    }

    if (customBpmInput) {
      customBpmInput.value = `${selectedPreset === 'custom' ? customBpm : preset.bpm}`;
    }

    updateStatus(`当前节奏设定：${currentBpm} BPM，可按“开始”进入节奏练习。`);
    updateHud();
    setControlsState();
  };

  const handleLatencyChange = (value: string) => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    latencyOffsetMs = clampNumber(parsed, LATENCY_MIN_MS, LATENCY_MAX_MS);
    if (latencyInput) {
      latencyInput.value = `${latencyOffsetMs}`;
    }
    updateHud();
    updateStatus(`延迟补偿已调整为 ${formatMs(latencyOffsetMs)}。`);
  };

  const buildInterface = (target: HTMLElement) => {
    ensureStyles();

    container = document.createElement('div');
    container.className = 'rhythm-tapping';
    container.style.setProperty('--rhythm-accent', meta.accentColor);

    const layout = document.createElement('div');
    layout.className = 'rhythm-tapping__layout';

    const stage = document.createElement('div');
    stage.className = 'rhythm-tapping__stage';

    pulseNode = document.createElement('div');
    pulseNode.className = 'rhythm-tapping__pulse';
    pulseNode.textContent = '节拍';

    tapPadButton = document.createElement('button');
    tapPadButton.className = 'rhythm-tapping__pad';
    tapPadButton.type = 'button';
    tapPadButton.textContent = '点击、触碰或按空格/回车同步敲击';
    tapPadButton.addEventListener('pointerdown', handlePointerDown);
    cleanupTasks.push(() => tapPadButton?.removeEventListener('pointerdown', handlePointerDown));

    const hud = document.createElement('div');
    hud.className = 'rhythm-tapping__hud';

    const createHudItem = (label: string) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'rhythm-tapping__hud-item';

      const labelNode = document.createElement('span');
      labelNode.className = 'rhythm-tapping__hud-label';
      labelNode.textContent = label;

      const valueNode = document.createElement('span');
      valueNode.className = 'rhythm-tapping__hud-value';

      wrapper.append(labelNode, valueNode);
      hud.appendChild(wrapper);
      return valueNode;
    };

    beatCounterNode = createHudItem('当前节拍');
    bpmNode = createHudItem('节奏');
    tapCounterNode = createHudItem('采集敲击');
    offsetDisplayNode = createHudItem('延迟补偿');

    statusNode = document.createElement('p');
    statusNode.className = 'rhythm-tapping__status';
    statusNode.textContent = '选择 BPM 后点击开始，保持敲击与节拍同步。';

    stage.append(pulseNode, tapPadButton, hud, statusNode);

    const sidebar = document.createElement('div');
    sidebar.className = 'rhythm-tapping__controls';

    const presetGroup = document.createElement('div');
    presetGroup.className = 'rhythm-tapping__preset-group';

    bpmPresets.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'glass-control rhythm-tapping__chip';
      button.textContent = preset.label;
      button.title = preset.description;
      const onClick = () => handlePresetSelect(preset);
      button.addEventListener('click', onClick);
      presetGroup.appendChild(button);
      presetButtons.set(preset.id, button);
      cleanupTasks.push(() => button.removeEventListener('click', onClick));
    });

    const bpmField = document.createElement('div');
    bpmField.className = 'rhythm-tapping__field';
    const bpmLabel = document.createElement('label');
    bpmLabel.textContent = '自定义 BPM';
    customBpmInput = document.createElement('input');
    customBpmInput.type = 'number';
    customBpmInput.min = '40';
    customBpmInput.max = '200';
    customBpmInput.step = '1';
    customBpmInput.value = `${customBpm}`;
    const handleCustomBpmChange = (event: Event) => {
      const value = Number.parseFloat((event.target as HTMLInputElement).value);
      if (Number.isNaN(value)) {
        return;
      }
      customBpm = clampNumber(Math.round(value), 40, 200);
      if (selectedPreset === 'custom') {
        applyBpm(customBpm);
        updateStatus(`已设置自定义节奏 ${currentBpm} BPM。`);
      }
      if (customBpmInput) {
        customBpmInput.value = `${customBpm}`;
      }
    };
    customBpmInput.addEventListener('change', handleCustomBpmChange);
    cleanupTasks.push(() => customBpmInput?.removeEventListener('change', handleCustomBpmChange));

    bpmField.append(bpmLabel, customBpmInput);

    const latencyField = document.createElement('div');
    latencyField.className = 'rhythm-tapping__field';
    const latencyLabel = document.createElement('label');
    latencyLabel.textContent = '延迟补偿 (ms)';
    latencyInput = document.createElement('input');
    latencyInput.type = 'number';
    latencyInput.min = `${LATENCY_MIN_MS}`;
    latencyInput.max = `${LATENCY_MAX_MS}`;
    latencyInput.step = '5';
    latencyInput.value = `${latencyOffsetMs}`;
    const handleLatencyInputChange = (event: Event) =>
      handleLatencyChange((event.target as HTMLInputElement).value);
    latencyInput.addEventListener('change', handleLatencyInputChange);
    cleanupTasks.push(() => latencyInput?.removeEventListener('change', handleLatencyInputChange));

    latencyField.append(latencyLabel, latencyInput);

    const togglesGroup = document.createElement('div');
    togglesGroup.className = 'rhythm-tapping__toggles';

    const createToggle = (label: string, initial: boolean, onChange: (value: boolean) => void) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'rhythm-tapping__toggle';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = initial;
      const handleChange = (event: Event) => {
        const value = (event.target as HTMLInputElement).checked;
        onChange(value);
      };
      checkbox.addEventListener('change', handleChange);

      const text = document.createElement('span');
      text.textContent = label;

      wrapper.append(checkbox, text);
      togglesGroup.appendChild(wrapper);
      cleanupTasks.push(() => checkbox.removeEventListener('change', handleChange));
      return checkbox;
    };

    createToggle('启用音频节拍', audioEnabled, (value) => {
      audioEnabled = value;
      updateAudioGain();
      setContainerModeFlags();
      updateStatus(value ? '节拍音效已开启。' : '节拍音效已关闭，可使用纯视觉模式。');
    });

    createToggle('启用视觉脉冲', visualEnabled, (value) => {
      visualEnabled = value;
      setContainerModeFlags();
      updateStatus(value ? '视觉节奏指示已开启。' : '视觉指示已关闭，当前为音频模式。');
    });

    hapticsToggle = createToggle('移动端震动提示', hapticsEnabled, (value) => {
      if (!('vibrate' in navigator)) {
        hapticsEnabled = false;
        return;
      }
      hapticsEnabled = value;
      updateStatus(value ? '震动提示已开启。' : '震动提示已关闭。');
    });

    if (hapticsToggle && !('vibrate' in navigator)) {
      hapticsToggle.checked = false;
      hapticsToggle.disabled = true;
    }

    createToggle('高对比模式', highContrastEnabled, (value) => {
      highContrastEnabled = value;
      setContainerModeFlags();
    });

    const actions = document.createElement('div');
    actions.className = 'rhythm-tapping__actions';

    startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'glass-control';
    startButton.textContent = '开始节奏练习';
    const handleStartClick = () => startBlock('play');
    startButton.addEventListener('click', handleStartClick);
    cleanupTasks.push(() => startButton?.removeEventListener('click', handleStartClick));

    stopButton = document.createElement('button');
    stopButton.type = 'button';
    stopButton.className = 'glass-control';
    stopButton.textContent = '停止';
    stopButton.disabled = true;
    const handleStopClick = () => stopBlock(true);
    stopButton.addEventListener('click', handleStopClick);
    cleanupTasks.push(() => stopButton?.removeEventListener('click', handleStopClick));

    calibrateButton = document.createElement('button');
    calibrateButton.type = 'button';
    calibrateButton.className = 'glass-control';
    calibrateButton.textContent = '快速延迟校准';
    const handleCalibrateClick = () => startBlock('calibration');
    calibrateButton.addEventListener('click', handleCalibrateClick);
    cleanupTasks.push(() =>
      calibrateButton?.removeEventListener('click', handleCalibrateClick)
    );

    resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'glass-control';
    resetButton.textContent = '清除会话统计';
    resetButton.addEventListener('click', resetSession);
    cleanupTasks.push(() => resetButton?.removeEventListener('click', resetSession));

    actions.append(startButton, stopButton, calibrateButton, resetButton);

    sidebar.append(presetGroup, bpmField, latencyField, togglesGroup, actions);

    layout.append(stage, sidebar);

    const summaryWrapper = document.createElement('div');
    summaryWrapper.className = 'rhythm-tapping__summary';

    blockSummaryNode = document.createElement('div');
    sessionSummaryNode = document.createElement('div');

    summaryWrapper.append(blockSummaryNode, sessionSummaryNode);

    renderBlockSummary(null, false);
    renderSessionSummary();

    container.append(layout, summaryWrapper);

    target.innerHTML = '';
    target.appendChild(container);

    updateHud();
    refreshPresetButtons();
    setContainerModeFlags();
    applyBpm(currentBpm);
    updateAudioGain();
    setControlsState();
  };

  const attachGlobalListeners = () => {
    window.addEventListener('keydown', handleKeyDown);
    cleanupTasks.push(() => window.removeEventListener('keydown', handleKeyDown));

    document.addEventListener('visibilitychange', handleVisibilityChange);
    cleanupTasks.push(() =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    );
  };

  const initialize = (target: HTMLElement) => {
    host = target;
    sessionResults = [];
    blockActive = false;
    selectedPreset = 'normal';
    customBpm = 120;
    currentBpm = 120;
    latencyOffsetMs = 0;
    audioEnabled = true;
    visualEnabled = true;
    hapticsEnabled = Boolean('vibrate' in navigator);
    highContrastEnabled = false;

    cleanupTasks.length = 0;

    buildInterface(target);
    attachGlobalListeners();
    updateStatus('选择合适的节奏或使用校准功能，随时开始节奏同步。');
  };

  const teardown = () => {
    stopBlock(true);
    cleanupTasks.forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        console.error('Failed to cleanup rhythm tapping listener', error);
      }
    });
    cleanupTasks.length = 0;

    if (host) {
      host.innerHTML = '';
    }

    host = null;
    container = null;
    pulseNode = null;
    tapPadButton = null;
    beatCounterNode = null;
    bpmNode = null;
    tapCounterNode = null;
    offsetDisplayNode = null;
    statusNode = null;
    blockSummaryNode = null;
    sessionSummaryNode = null;
    startButton = null;
    stopButton = null;
    calibrateButton = null;
    resetButton = null;
    latencyInput = null;
    customBpmInput = null;
    hapticsToggle = null;
    presetButtons.clear();
    sessionResults = [];

    if (audioContext) {
      try {
        audioContext.close();
      } catch (error) {
        console.warn('Failed to close audio context', error);
      }
    }
    audioContext = null;
    masterGain = null;
  };

  return {
    init(target: HTMLElement) {
      initialize(target);
    },
    destroy() {
      teardown();
    },
    getMeta() {
      return meta;
    }
  } satisfies GameModule;
})();

export default rhythmTappingGame;
