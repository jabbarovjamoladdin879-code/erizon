import type { Combo } from './types.js';

/** Kombo-to'plamlar: alohida olingandan arzonroq, bitta tugma bilan savatga qo'shiladi */
export const COMBOS: Combo[] = [
  {
    id: 'combo-plov',
    nameKey: 'combo.plov',
    icon: 'CookingPot',
    hue: 32,
    price: 165_000,
    items: [
      { productId: 'gr-02', qty: 1 },
      { productId: 'me-03', qty: 1 },
      { productId: 'gr-05', qty: 1 },
      { productId: 'pr-07', qty: 1 },
      { productId: 'pr-06', qty: 1 },
      { productId: 'gr-09', qty: 1 },
    ],
  },
  {
    id: 'combo-family',
    nameKey: 'combo.family',
    icon: 'Pizza',
    hue: 18,
    price: 209_000,
    items: [
      { productId: 'ff-01', qty: 2 },
      { productId: 'ff-04', qty: 2 },
      { productId: 'ff-07', qty: 1 },
      { productId: 'ff-09', qty: 2 },
      { productId: 'dr-06', qty: 1 },
    ],
  },
  {
    id: 'combo-breakfast',
    nameKey: 'combo.breakfast',
    icon: 'Croissant',
    hue: 45,
    price: 99_000,
    items: [
      { productId: 'da-01', qty: 1 },
      { productId: 'da-06', qty: 1 },
      { productId: 'sw-01', qty: 2 },
      { productId: 'da-07', qty: 0.5 },
      { productId: 'da-04', qty: 1 },
    ],
  },
  {
    id: 'combo-clean',
    nameKey: 'combo.clean',
    icon: 'SprayCan',
    hue: 190,
    price: 109_000,
    items: [
      { productId: 'ch-01', qty: 1 },
      { productId: 'ch-02', qty: 1 },
      { productId: 'ch-05', qty: 1 },
      { productId: 'ch-06', qty: 1 },
    ],
  },
];
