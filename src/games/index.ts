import type { GameDefinitionBase, GameMeta } from './types';

const registry = [
  {
    id: 'cancellation-task',
    title: '取消任务：图形搜索',
    description: '在彩色图形矩阵中找出所有符合规则的目标，训练视觉搜索与抑制干扰能力。',
    accentColor: '#f97316',
    tags: ['注意力训练', '视觉搜索', '干扰抑制'],
    categories: ['attention'],
    difficultyPresets: [
      { id: 'easy', label: '轻松 5×5', description: '较少干扰，适合热身。' },
      { id: 'normal', label: '标准 6×6', description: '干扰更多，需要更快的检索速度。' },
      { id: 'hard', label: '挑战 7×7', description: '颜色和形状高度相似，考验极限专注。' }
    ],
    loader: () => import('./cancellation-task').then((module) => module.default)
  },
  {
    id: 'schulte-table',
    title: '舒尔特方格训练',
    description: '通过不同难度的舒尔特方格锻炼专注力与视线速度。',
    accentColor: '#38bdf8',
    tags: ['专注力', '视线速度', '数字搜索'],
    categories: ['attention', 'speed'],
    difficultyPresets: [
      { id: 'focus', label: '入门 4×4', description: '熟悉节奏，范围更小，适合热身。' },
      { id: 'classic', label: '标准 5×5', description: '经典舒尔特方格，训练视线搜索与专注。' },
      { id: 'advanced', label: '挑战 6×6', description: '数字更多，更考验持续的注意力。' }
    ],
    loader: () => import('./schulte-table').then((module) => module.default)
  },
  {
    id: 'memory-matrix',
    title: '记忆矩阵挑战',
    description: '观察矩阵中的点亮图案并在隐藏后完整复现，训练工作记忆与空间定位能力。',
    accentColor: '#a855f7',
    tags: ['工作记忆', '空间定位', '逐步挑战'],
    categories: ['memory'],
    difficultyPresets: [
      { id: 'easy', label: '轻松 3×3', description: '短暂展示 3 个目标格，适合快速热身。' },
      { id: 'normal', label: '标准 4×4', description: '4×4 网格中记忆 5 个位置，挑战稳定的工作记忆。' },
      { id: 'hard', label: '进阶 5×5', description: '更大范围与更短暴露时间，考验快速编码能力。' },
      { id: 'progressive', label: '渐进挑战', description: '完美记忆将自动升级更大矩阵，构建持续挑战。' }
    ],
    loader: () => import('./memory-matrix').then((module) => module.default)
  },
  {
    id: 'stop-signal',
    title: '停止信号任务（SST）',
    description: '自适应停止信号延迟的抑制控制测验，输出 SSRT 与停止成功率。',
    accentColor: '#f472b6',
    tags: ['抑制控制', '反应时间', '神经心理'],
    categories: ['attention', 'speed'],
    difficultyPresets: [
      { id: 'balanced', label: '标准 120 试次', description: '默认阶梯调整与练习阶段，获取稳定的 SSRT 指标。' },
      { id: 'compact', label: '快速 60 试次', description: '缩短试次数量，适合课堂或快速筛查。' },
      { id: 'extended', label: '强化 180 试次', description: '延长主试时间，追求更高信噪比。' }
    ],
    loader: () => import('./stop-signal').then((module) => module.default)
  },
  {
    id: 'rhythm-tapping',
    title: '节奏同步：节拍敲击',
    description: '跟随节拍器敲击保持同步，测量节奏平均偏移、RMS 误差与稳定性指标。',
    accentColor: '#facc15',
    tags: ['节奏同步', '感知运动', '时间判断'],
    categories: ['speed'],
    difficultyPresets: [
      { id: 'easy', label: '轻松 · 90 BPM', description: '舒缓速度，适合热身与初学者。' },
      { id: 'normal', label: '标准 · 120 BPM', description: '常见的流行节奏，训练稳定同步。' },
      { id: 'hard', label: '挑战 · 150 BPM', description: '快速节拍，考验反应与稳定性。' },
      { id: 'custom', label: '自定义', description: '40–200 BPM，满足自由调节需求。' }
    ],
    loader: () => import('./rhythm-tapping').then((module) => module.default)
  }
] as const satisfies ReadonlyArray<GameDefinitionBase>;

export type GameId = (typeof registry)[number]['id'];

export type RegisteredGameMeta = Omit<GameMeta, 'id'> & { id: GameId };

export type GameDefinition = Omit<GameDefinitionBase, 'id'> & { id: GameId };

export const gamesRegistry: readonly GameDefinition[] = registry;

const gameIdSet = new Set<GameId>(gamesRegistry.map((game) => game.id));

export const gamesIndexPath = '/games';

export const isGameId = (value: string): value is GameId => gameIdSet.has(value as GameId);

export const listGames = (): RegisteredGameMeta[] =>
  gamesRegistry.map(({ loader: _loader, ...meta }) => ({ ...meta }));

export const getGameDefinition = (id: GameId): GameDefinition | undefined =>
  gamesRegistry.find((game) => game.id === id);

export const getGamePath = (id: GameId): string => `/games/${id}`;
