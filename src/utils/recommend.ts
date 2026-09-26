import type { CategoryId, Product } from '@/types';

/** "Bu bilan birga olishadi" — kategoriya bo'yicha mos qo'shimchalar */
const COMPLEMENTS: Record<CategoryId, CategoryId[]> = {
  fastfood: ['drinks', 'sweets'],
  meat: ['grocery', 'produce'],
  grocery: ['meat', 'produce'],
  drinks: ['fastfood', 'sweets'],
  dairy: ['sweets', 'produce'],
  produce: ['dairy', 'grocery'],
  sweets: ['drinks', 'dairy'],
  clothing: ['clothing', 'cosmetics'],
  chemicals: ['home', 'chemicals'],
  cosmetics: ['cosmetics', 'chemicals'],
  kids: ['kids', 'dairy'],
  home: ['home', 'chemicals'],
};

export function getBoughtTogether(product: Product, all: Product[], limit = 6): Product[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const manual = (product.relatedIds ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is Product => !!p && p.inStock && p.id !== product.id);
  const cats = COMPLEMENTS[product.categoryId];
  const auto = all
    .filter((p) => p.inStock && p.id !== product.id && cats.includes(p.categoryId) && !manual.includes(p))
    .sort((a, b) => b.popularity - a.popularity);
  return [...manual, ...auto].slice(0, limit);
}

export function getSimilar(product: Product, all: Product[], limit = 10): Product[] {
  return all
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .sort((a, b) => {
      const ga = a.gender === product.gender ? 1 : 0;
      const gb = b.gender === product.gender ? 1 : 0;
      return gb - ga || Math.abs(a.price - product.price) - Math.abs(b.price - product.price);
    })
    .slice(0, limit);
}
