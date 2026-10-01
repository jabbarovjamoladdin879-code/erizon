import {
  Apple, Baby, Backpack, Banana, Bath, Bean, BedDouble, BedSingle, Beef, Bird, Bone, Brush, Cake, Candy, Car, Carrot,
  Cherry, Citrus, Coffee, Container, CookingPot, Cookie, Croissant, CupSoda, Dessert, Donut, Droplet, Droplets, Drumstick,
  Dumbbell, Egg, EggFried, Eye, Fish, FlaskConical, Flower, Gift, GlassWater, Grape, Ham, Hand, House, IceCreamCone,
  LeafyGreen, Leaf, Lightbulb, Milk, Moon, Package, Palette, Pencil, Percent, Pizza, Popcorn, Rabbit, Sandwich, Scissors,
  Scroll, Shirt, ShoppingBasket, Smile, Snowflake, Soup, SprayCan, Sprout, Sun, ToyBrick, Trash2, Utensils,
  UtensilsCrossed, WashingMachine, Wheat, Wind, Wine, Zap,
  type LucideIcon, type LucideProps,
} from 'lucide-react';
import type { IconName } from '@/data/icons';

/** Ikonka nomi (bazada saqlanadi) → lucide komponenti. Faqat kerakli ikonkalar bundle'ga kiradi. */
const REGISTRY: Record<IconName, LucideIcon> = {
  Shirt, Dumbbell, Snowflake, Backpack, Moon,
  Wheat, Bean, Sun, Droplets, Candy, UtensilsCrossed, Soup, Leaf, Container,
  Coffee, Droplet, GlassWater, CupSoda, Citrus, Cherry, Zap, Wine,
  Beef, Bone, Drumstick, Bird, Ham, Fish, Egg, Sandwich, Pizza, Popcorn,
  Milk, Apple, Banana, LeafyGreen, Sprout, Carrot, Grape,
  Donut, Cake, Cookie, Dessert, Croissant, IceCreamCone,
  WashingMachine, SprayCan, FlaskConical, Brush, Scroll, Smile, Trash2,
  Flower, Hand, Palette, Eye, Wind, Scissors,
  Baby, ToyBrick, Rabbit, Bath, Car, Pencil,
  CookingPot, EggFried, Utensils, BedDouble, BedSingle, Lightbulb, House,
  Gift, Percent, Package, ShoppingBasket,
};

interface AppIconProps extends LucideProps {
  name: string;
}

/** Ma'lumotdagi ikonka nomini chizadi; noma'lum nom bo'lsa — standart "quti" ikonkasi */
export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = REGISTRY[name as IconName] ?? Package;
  return <Icon aria-hidden="true" {...props} />;
}
