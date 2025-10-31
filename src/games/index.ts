export interface GameMeta {
  id: string;
  title: string;
  description: string;
  author?: string;
  tags?: string[];
}

export interface GameInitOptions {
  theme: 'light' | 'dark';
  [key: string]: unknown;
}

export interface GameModule {
  init(container: HTMLElement, options?: GameInitOptions): void | Promise<void>;
  destroy(): void | Promise<void>;
  getMeta(): GameMeta;
}

export interface GameDefinition {
  id: string;
  title: string;
  summary: string;
  tags?: string[];
  load: () => Promise<GameModule>;
}

const registry: GameDefinition[] = [
  {
    id: 'sample',
    title: 'Sample Nebula',
    summary: 'A placeholder experience that showcases how Miniverse games plug into the shell.',
    tags: ['concept', 'demo'],
    load: async () => (await import('./sample')).default,
  },
];

export const games = registry;

export const listGames = (): GameDefinition[] => [...registry];

export const getGameDefinition = (id: string): GameDefinition | undefined =>
  registry.find((game) => game.id === id);

export const loadGame = async (id: string): Promise<GameModule | undefined> => {
  const definition = getGameDefinition(id);
  if (!definition) {
    return undefined;
  }
  return definition.load();
};
