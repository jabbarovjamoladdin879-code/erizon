/** Bosh sahifadagi "stories" aksiya lentasi (matnlar i18n kalitlari orqali) */
export interface Story {
  id: string;
  emoji: string;
  gradient: string;
  titleKey: 'story.1.title' | 'story.2.title' | 'story.3.title' | 'story.4.title' | 'story.5.title';
  textKey: 'story.1.text' | 'story.2.text' | 'story.3.text' | 'story.4.text' | 'story.5.text';
  href: string;
}

export const STORIES: Story[] = [
  { id: 's1', emoji: '🔥', gradient: 'from-orange-500 to-rose-600', titleKey: 'story.1.title', textKey: 'story.1.text', href: '/catalog?sale=1' },
  { id: 's2', emoji: '🍔', gradient: 'from-amber-400 to-orange-600', titleKey: 'story.2.title', textKey: 'story.2.text', href: '/catalog?cat=fastfood' },
  { id: 's3', emoji: '🥩', gradient: 'from-rose-500 to-red-700', titleKey: 'story.3.title', textKey: 'story.3.text', href: '/catalog?cat=meat' },
  { id: 's4', emoji: '🎁', gradient: 'from-brand-500 to-fuchsia-600', titleKey: 'story.4.title', textKey: 'story.4.text', href: '/profile?tab=bonus' },
  { id: 's5', emoji: '👗', gradient: 'from-sky-500 to-indigo-600', titleKey: 'story.5.title', textKey: 'story.5.text', href: '/catalog?cat=clothing' },
];
