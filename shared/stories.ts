import type { IconName } from './icons.js';

/** Bosh sahifadagi "stories" aksiya lentasi (matnlar i18n kalitlari orqali) */
export interface Story {
  id: string;
  icon: IconName;
  /** Doira rangi (Tailwind klassi) */
  color: string;
  titleKey: 'story.1.title' | 'story.2.title' | 'story.3.title' | 'story.4.title' | 'story.5.title';
  textKey: 'story.1.text' | 'story.2.text' | 'story.3.text' | 'story.4.text' | 'story.5.text';
  href: string;
}

export const STORIES: Story[] = [
  { id: 's1', icon: 'Percent', color: 'bg-rose-600', titleKey: 'story.1.title', textKey: 'story.1.text', href: '/catalog?sale=1' },
  { id: 's2', icon: 'Pizza', color: 'bg-orange-600', titleKey: 'story.2.title', textKey: 'story.2.text', href: '/catalog?cat=fastfood' },
  { id: 's3', icon: 'Beef', color: 'bg-red-700', titleKey: 'story.3.title', textKey: 'story.3.text', href: '/catalog?cat=meat' },
  { id: 's4', icon: 'Gift', color: 'bg-brand-700', titleKey: 'story.4.title', textKey: 'story.4.text', href: '/profile?tab=bonus' },
  { id: 's5', icon: 'Shirt', color: 'bg-sky-700', titleKey: 'story.5.title', textKey: 'story.5.text', href: '/catalog?cat=clothing' },
];
