import { gamesIndexPath } from '@/games';

export interface NavItem {
  label: string;
  path: string;
}

export const NAV_ITEMS = [
  { label: '首页', path: '/' },
  { label: '小游戏', path: gamesIndexPath }
] as const satisfies readonly NavItem[];
