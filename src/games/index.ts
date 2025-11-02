import {
  gamesRegistry as registry,
  getGameById as readGameById,
  listGameOptionsByTag as readGameOptionsByTag,
  listGames as readGames
} from './registry';
import type { GameRegistryEntry } from './registry';
import type { DifficultyPreset, GameId, GameMeta, GameModule, GameTag } from './types';

export { registry as gamesRegistry };
export type { GameRegistryEntry };
export type { DifficultyPreset, GameId, GameMeta, GameModule, GameTag };

export const listGames = (): GameMeta[] => readGames();

export const getGameById = (id: GameId): GameRegistryEntry | undefined => readGameById(id);

export const listGameOptionsByTag = (tag: GameTag): GameRegistryEntry[] => readGameOptionsByTag(tag);
