import type { Category } from './types.js';

export const CATEGORIES: Category[] = [
  { id: 'clothing', icon: 'Shirt', hue: 262 },
  { id: 'grocery', icon: 'Wheat', hue: 38 },
  { id: 'drinks', icon: 'CupSoda', hue: 199 },
  { id: 'meat', icon: 'Beef', hue: 355 },
  { id: 'fastfood', icon: 'Pizza', hue: 24 },
  { id: 'dairy', icon: 'Milk', hue: 210 },
  { id: 'produce', icon: 'Apple', hue: 130 },
  { id: 'sweets', icon: 'Cake', hue: 325 },
  { id: 'chemicals', icon: 'SprayCan', hue: 180 },
  { id: 'cosmetics', icon: 'Palette', hue: 300 },
  { id: 'kids', icon: 'Baby', hue: 48 },
  { id: 'home', icon: 'House', hue: 160 },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
