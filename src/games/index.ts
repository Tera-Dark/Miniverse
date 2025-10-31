import type { GameMeta, GameModule } from './types';

export interface GameDefinition extends GameMeta {
  loader: () => Promise<GameModule>;
}

export const gamesRegistry: GameDefinition[] = [
  {
    id: 'sample',
    title: 'Aurora Drift (Sample)',
    description: 'A playful stub that demonstrates how Miniverse games mount and unmount.',
    accentColor: '#c084fc',
    loader: () => import('./sample').then((module) => module.default)
  }
];

export const listGames = (): GameMeta[] =>
  gamesRegistry.map(({ loader: _loader, ...meta }) => ({ ...meta }));

export const getGameDefinition = (id: string): GameDefinition | undefined =>
  gamesRegistry.find((game) => game.id === id);
