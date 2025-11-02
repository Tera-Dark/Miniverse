export type GameTag =
  | 'attention'
  | 'visual-search'
  | 'memory'
  | 'spatial'
  | 'executive-control'
  | 'inhibition'
  | 'processing-speed'
  | 'motor'
  | 'timing'
  | 'rhythm';

export interface DifficultyPreset {
  id: string;
  label: string;
  description: string;
  summary?: string;
}

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  accentColor: string;
}

export interface GameModule {
  init: (container: HTMLElement, opts?: Record<string, unknown>) => void;
  destroy: () => void;
  getMeta: () => GameMeta;
}

export type GameFactory = (meta: GameMeta) => GameModule;
