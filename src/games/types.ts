export interface GameDifficultyPreset {
  id: string;
  label: string;
  description?: string;
}

export type GameTag = string;

export type GameCategory = 'attention' | 'memory' | 'speed';

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  tags?: GameTag[];
  categories?: GameCategory[];
  difficultyPresets?: GameDifficultyPreset[];
}

export interface GameModule {
  init: (container: HTMLElement, opts?: Record<string, unknown>) => void;
  destroy: () => void;
  getMeta: () => GameMeta;
}

export interface GameDefinitionBase extends GameMeta {
  loader: () => Promise<GameModule>;
}
