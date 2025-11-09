import { gamesIndexPath } from '@/games';

export interface NavItem {
  label: string;
  path: string;
}

export const NAV_ITEMS = [
  { label: 'Games', path: gamesIndexPath }
] as const satisfies readonly NavItem[];
