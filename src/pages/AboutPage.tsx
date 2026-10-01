import { Link } from 'react-router-dom';
import { Advantages } from '@/components/home/Advantages';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';

const STATS = [
  { value: '120+', key: 'about.stat.products' },
  { value: '12', key: 'about.stat.categories' },
  { value: '9', key: 'about.stat.zones' },
  { value: '25', key: 'about.stat.minutes' },
] as const;

export default function AboutPage() {
  const t = useT();
  useSeo(t('nav.about'), t('seo.about'));
  return (
    <div className="container-page py-6">
      <section className="overflow-hidden rounded-xl bg-brand-800 p-8 text-white sm:p-12">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{t('about.title')}</h1>
        <p className="mt-3 max-w-2xl text-white/85">{t('about.lead')}</p>
      </section>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <li key={s.key} className="card p-5 text-center">
            <div className="text-3xl font-bold text-brand-700 dark:text-brand-300">{s.value}</div>
            <div className="muted mt-1 text-sm">{t(s.key)}</div>
          </li>
        ))}
      </ul>
      <section className="card mt-6 space-y-3 p-6 leading-relaxed text-slate-700 dark:text-slate-300">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('about.storyTitle')}</h2>
        <p>{t('about.story1')}</p>
        <p>{t('about.story2')}</p>
        <Link to="/contact" className="inline-block font-semibold text-brand-700 hover:underline dark:text-brand-300">
          {t('nav.contact')} →
        </Link>
      </section>
      <Advantages />
    </div>
  );
}
