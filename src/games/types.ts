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
