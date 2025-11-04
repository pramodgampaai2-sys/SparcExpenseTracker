
import type { Category } from './types';

export enum Page {
  Dashboard = 'dashboard',
  Expenses = 'expenses',
  Add = 'add',
  Settings = 'settings'
}

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Other'
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#34D399',       // Emerald 400
  Transport: '#60A5FA',    // Blue 400
  Shopping: '#F472B6',    // Pink 400
  Utilities: '#FBBF24',   // Amber 400
  Entertainment: '#A78BFA',// Violet 400
  Health: '#F87171',      // Red 400
  Other: '#9CA3AF'      // Gray 400
};
