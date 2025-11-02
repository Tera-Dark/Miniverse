/**
 * Central registry describing every available game.
 *
 * Adding a new game only requires two steps:
 * 1. Create its module under `src/games/<game-id>` exporting `createGame(meta)`.
 * 2. Append a new entry to `gamesRegistry` below with the game's metadata.
 */
import type { DifficultyPreset, GameFactory, GameMeta, GameModule, GameTag } from './types';

export interface GameRegistryEntry extends GameMeta {
  tags: GameTag[];
  difficultyPresets: DifficultyPreset[];
  loader: () => Promise<GameModule>;
}

type GameModuleImport = {
  createGame?: GameFactory;
  default?: GameFactory;
  [key: string]: unknown;
};

const createLazyLoader = (
  importer: () => Promise<GameModuleImport>,
  meta: GameMeta
): (() => Promise<GameModule>) => {
  return async () => {
    const module = await importer();
    const factory = module.createGame ?? module.default;

    if (typeof factory !== 'function') {
      throw new Error(`Game module for "${meta.id}" is missing a createGame export.`);
    }

    return factory(meta);
  };
};

const cancellationMeta: GameMeta = {
  id: 'cancellation-task',
  title: '取消任务：图形搜索',
  description: '根据目标规则快速标记所有目标图形，统计命中率与反应时间。',
  accentColor: '#f97316'
};

const cancellationPresets: DifficultyPreset[] = [
  {
    id: 'easy',
    label: '轻松 5×5',
    description: '较少干扰，适合热身。',
    summary: '5×5 · 6–8 目标 · 90 秒'
  },
  {
    id: 'normal',
    label: '标准 6×6',
    description: '干扰更多，需要更快的检索速度。',
    summary: '6×6 · 8–11 目标 · 70 秒'
  },
  {
    id: 'hard',
    label: '挑战 7×7',
    description: '颜色与形状高度相似，考验极限专注。',
    summary: '7×7 · 11–14 目标 · 60 秒'
  }
];

const schulteMeta: GameMeta = {
  id: 'schulte-table',
  title: '舒尔特方格训练',
  description: '在不同大小的方格中按顺序寻找数字，锻炼专注力与视线速度。',
  accentColor: '#38bdf8'
};

const schultePresets: DifficultyPreset[] = [
  {
    id: 'focus',
    label: '入门 4×4',
    description: '熟悉节奏，范围更小，适合热身。',
    summary: '4×4 · 16 个目标'
  },
  {
    id: 'classic',
    label: '标准 5×5',
    description: '经典舒尔特方格，训练视线搜索与专注。',
    summary: '5×5 · 25 个目标'
  },
  {
    id: 'advanced',
    label: '挑战 6×6',
    description: '数字更多，更考验持续的注意力。',
    summary: '6×6 · 36 个目标'
  }
];

const memoryMatrixMeta: GameMeta = {
  id: 'memory-matrix',
  title: '记忆矩阵挑战',
  description: '观察矩阵中点亮的格子，短暂隐藏后尝试完全复现，训练工作记忆与空间还原能力。',
  accentColor: '#a855f7'
};

const memoryMatrixPresets: DifficultyPreset[] = [
  {
    id: 'easy',
    label: '轻松 3×3',
    description: '短暂展示 3 个目标格，适合快速热身。',
    summary: '3×3 · 3 格 · 1.5 秒曝光'
  },
  {
    id: 'normal',
    label: '标准 4×4',
    description: '4×4 网格中记忆 5 个位置，挑战稳定的工作记忆。',
    summary: '4×4 · 5 格 · 1.2 秒曝光'
  },
  {
    id: 'hard',
    label: '进阶 5×5',
    description: '更大范围与更短暴露时间，考验快速编码能力。',
    summary: '5×5 · 7 格 · 1.0 秒曝光'
  },
  {
    id: 'progressive',
    label: '渐进挑战',
    description: '完美记忆将自动升级更大矩阵，构建持续挑战。',
    summary: '7 个渐进阶段'
  }
];

const stopSignalMeta: GameMeta = {
  id: 'stop-signal',
  title: '停止信号任务（SST）',
  description: '通过自适应停止信号延迟测量抑制控制能力，计算 SSRT 与停止成功率。',
  accentColor: '#f472b6'
};

const stopSignalPresets: DifficultyPreset[] = [
  {
    id: 'practice',
    label: '练习 40 试次',
    description: '缩短总试次数，快速熟悉停止信号节奏。',
    summary: '40 试次 · 25% 停止试次 · 自适应 SSD'
  },
  {
    id: 'standard',
    label: '标准 120 试次',
    description: '推荐配置，平衡测量时长与抑制控制稳定性。',
    summary: '120 试次 · 25% 停止试次 · SSD 50–900ms'
  },
  {
    id: 'extended',
    label: '延伸 200 试次',
    description: '更长的主试次带来更稳定的数据，适合深度评估。',
    summary: '200 试次 · 更长测试时长'
  }
];

const rhythmTappingMeta: GameMeta = {
  id: 'rhythm-tapping',
  title: '节奏同步：节拍敲击',
  description: '跟随节拍器稳定敲击，测量节奏偏移、RMS 误差与节奏稳定性。',
  accentColor: '#facc15'
};

const rhythmTappingPresets: DifficultyPreset[] = [
  {
    id: 'easy',
    label: '轻松 · 90 BPM',
    description: '舒缓速度，适合热身与初学者。',
    summary: '90 BPM · 宽容度默认'
  },
  {
    id: 'normal',
    label: '标准 · 120 BPM',
    description: '常见的流行节奏，训练稳定同步。',
    summary: '120 BPM · 平衡挑战'
  },
  {
    id: 'hard',
    label: '挑战 · 150 BPM',
    description: '快速节拍，考验反应与稳定性。',
    summary: '150 BPM · 更紧凑节奏'
  },
  {
    id: 'custom',
    label: '自定义模式',
    description: '40–200 BPM，可自由调节并保存偏好。',
    summary: '自定义节奏范围'
  }
];

export const gamesRegistry: GameRegistryEntry[] = [
  {
    ...cancellationMeta,
    tags: ['attention', 'visual-search', 'inhibition'],
    difficultyPresets: cancellationPresets,
    loader: createLazyLoader(() => import('./cancellation-task'), cancellationMeta)
  },
  {
    ...schulteMeta,
    tags: ['attention', 'processing-speed', 'visual-search'],
    difficultyPresets: schultePresets,
    loader: createLazyLoader(() => import('./schulte-table'), schulteMeta)
  },
  {
    ...memoryMatrixMeta,
    tags: ['memory', 'spatial', 'attention'],
    difficultyPresets: memoryMatrixPresets,
    loader: createLazyLoader(() => import('./memory-matrix'), memoryMatrixMeta)
  },
  {
    ...stopSignalMeta,
    tags: ['executive-control', 'attention', 'inhibition'],
    difficultyPresets: stopSignalPresets,
    loader: createLazyLoader(() => import('./stop-signal'), stopSignalMeta)
  },
  {
    ...rhythmTappingMeta,
    tags: ['rhythm', 'timing', 'motor'],
    difficultyPresets: rhythmTappingPresets,
    loader: createLazyLoader(() => import('./rhythm-tapping'), rhythmTappingMeta)
  }
];

export type GameId = (typeof gamesRegistry)[number]['id'];

export const listGames = (): GameMeta[] =>
  gamesRegistry.map(({ loader: _loader, tags: _tags, difficultyPresets: _difficultyPresets, ...meta }) => ({
    ...meta
  }));

export const getGameById = (id: GameId): GameRegistryEntry | undefined =>
  gamesRegistry.find((game) => game.id === id);

export const listGameOptionsByTag = (tag: GameTag): GameRegistryEntry[] =>
  gamesRegistry.filter((game) => game.tags.includes(tag));
