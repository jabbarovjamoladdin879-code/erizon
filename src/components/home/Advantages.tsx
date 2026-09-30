import { BadgeCheck, Gift, ShieldCheck, Truck } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { TKey } from '@/i18n';

const ITEMS: Array<{ icon: typeof Truck; title: TKey; text: TKey; color: string }> = [
  { icon: Truck, title: 'adv.fast.title', text: 'adv.fast.text', color: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' },
  { icon: BadgeCheck, title: 'adv.quality.title', text: 'adv.quality.text', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { icon: ShieldCheck, title: 'adv.halal.title', text: 'adv.halal.text', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { icon: Gift, title: 'adv.bonus.title', text: 'adv.bonus.text', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
];

export function Advantages() {
  const t = useT();
  return (
    <section className="py-6" aria-labelledby="adv-title">
      <h2 id="adv-title" className="section-title mb-4">
        {t('home.why')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text, color }) => (
          <li key={title} className="card flex gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold">{t(title)}</h3>
              <p className="muted mt-1 text-sm">{t(text)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
