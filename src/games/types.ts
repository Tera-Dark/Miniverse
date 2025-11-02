export interface GameDifficultyPreset {
  id: string;
  label: string;
  description?: string;
}

export type GameTag = string;

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  tags?: GameTag[];
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
