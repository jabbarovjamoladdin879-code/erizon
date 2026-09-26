import type { Category } from './types.js';

export const CATEGORIES: Category[] = [
  { id: 'clothing', emoji: '👕', hue: 262 },
  { id: 'grocery', emoji: '🌾', hue: 38 },
  { id: 'drinks', emoji: '🥤', hue: 199 },
  { id: 'meat', emoji: '🥩', hue: 355 },
  { id: 'fastfood', emoji: '🍔', hue: 24 },
  { id: 'dairy', emoji: '🥛', hue: 210 },
  { id: 'produce', emoji: '🍎', hue: 130 },
  { id: 'sweets', emoji: '🍰', hue: 325 },
  { id: 'chemicals', emoji: '🧴', hue: 180 },
  { id: 'cosmetics', emoji: '💄', hue: 300 },
  { id: 'kids', emoji: '🧸', hue: 48 },
  { id: 'home', emoji: '🏠', hue: 160 },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
