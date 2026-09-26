import type { Lang } from '@/types';
import { kaa } from './kaa';
import { ru } from './ru';
import { uz } from './uz';

export type TKey = keyof typeof uz;
export type TParams = Record<string, string | number>;
export type TFunction = (key: TKey, params?: TParams) => string;
export type Dictionary = Record<TKey, string>;

const DICTS: Record<Lang, Dictionary> = { uz, ru, kaa };

export const LANGS: Array<{ code: Lang; label: string; short: string }> = [
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'kaa', label: 'Qaraqalpaqsha', short: 'QQ' },
];

export function isTKey(key: string): key is TKey {
  return Object.prototype.hasOwnProperty.call(uz, key);
}

export function translate(lang: Lang, key: TKey, params?: TParams): string {
  const template = DICTS[lang]?.[key] ?? uz[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}
