import type { GameMeta, GameModule } from './types';

export interface GameDefinition extends GameMeta {
  loader: () => Promise<GameModule>;
}

export const gamesRegistry: GameDefinition[] = [
  {
    id: 'cancellation-task',
    title: '取消任务：图形搜索',
    description: '在彩色图形矩阵中找出所有符合规则的目标，训练视觉搜索与抑制干扰能力。',
    accentColor: '#f97316',
    loader: () => import('./cancellation-task').then((module) => module.default)
  },
  {
    id: 'schulte-table',
    title: '舒尔特方格训练',
    description: '通过不同难度的舒尔特方格锻炼专注力与视线速度。',
    accentColor: '#38bdf8',
    loader: () => import('./schulte-table').then((module) => module.default)
  }
];

export const listGames = (): GameMeta[] =>
  gamesRegistry.map(({ loader: _loader, ...meta }) => ({ ...meta }));

export const getGameDefinition = (id: string): GameDefinition | undefined =>
  gamesRegistry.find((game) => game.id === id);
