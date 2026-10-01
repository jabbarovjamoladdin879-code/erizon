/**
 * Mahsulot, kategoriya va bannerlar uchun ikonkalar (lucide-react nomlari).
 * Bazada faqat nom saqlanadi; frontend uni src/components/ui/AppIcon.tsx orqali chizadi.
 * Yangi ikonka qo'shilsa — shu ro'yxatga va AppIcon registriga qo'shing.
 */
export const ICON_NAMES = [
  // Kiyim
  'Shirt', 'Dumbbell', 'Snowflake', 'Backpack', 'Moon',
  // Oziq-ovqat
  'Wheat', 'Bean', 'Sun', 'Droplets', 'Candy', 'UtensilsCrossed', 'Soup', 'Leaf', 'Container',
  // Ichimliklar
  'Coffee', 'Droplet', 'GlassWater', 'CupSoda', 'Citrus', 'Cherry', 'Zap', 'Wine',
  // Go'sht va fast-food
  'Beef', 'Bone', 'Drumstick', 'Bird', 'Ham', 'Fish', 'Egg', 'Sandwich', 'Pizza', 'Popcorn',
  // Sut, meva-sabzavot, shirinlik
  'Milk', 'Apple', 'Banana', 'LeafyGreen', 'Sprout', 'Carrot', 'Grape',
  'Donut', 'Cake', 'Cookie', 'Dessert', 'Croissant', 'IceCreamCone',
  // Maishiy kimyo va kosmetika
  'WashingMachine', 'SprayCan', 'FlaskConical', 'Brush', 'Scroll', 'Smile', 'Trash2',
  'Flower', 'Hand', 'Palette', 'Eye', 'Wind', 'Scissors',
  // Bolalar va uy
  'Baby', 'ToyBrick', 'Rabbit', 'Bath', 'Car', 'Pencil',
  'CookingPot', 'EggFried', 'Utensils', 'BedDouble', 'BedSingle', 'Lightbulb', 'House',
  // Umumiy
  'Gift', 'Percent', 'Package', 'ShoppingBasket',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const DEFAULT_ICON: IconName = 'Package';

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && (ICON_NAMES as readonly string[]).includes(value);
}
