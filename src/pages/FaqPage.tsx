import { useMemo, useState } from 'react';
import { Accordion } from '@/components/ui/Accordion';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import type { TKey } from '@/i18n';
import { cn } from '@/utils/cn';

const TOPICS = ['delivery', 'returns', 'payment', 'bonus'] as const;
type Topic = (typeof TOPICS)[number];

const ITEMS: Record<Topic, Array<[TKey, TKey]>> = {
  delivery: [
    ['faq.d1.q', 'faq.d1.a'],
    ['faq.d2.q', 'faq.d2.a'],
    ['faq.d3.q', 'faq.d3.a'],
  ],
  returns: [
    ['faq.r1.q', 'faq.r1.a'],
    ['faq.r2.q', 'faq.r2.a'],
  ],
  payment: [
    ['faq.p1.q', 'faq.p1.a'],
    ['faq.p2.q', 'faq.p2.a'],
  ],
  bonus: [
    ['faq.b1.q', 'faq.b1.a'],
    ['faq.b2.q', 'faq.b2.a'],
    ['faq.b3.q', 'faq.b3.a'],
  ],
};

export default function FaqPage() {
  const t = useT();
  useSeo(t('nav.faq'), t('seo.faq'));
  const [topic, setTopic] = useState<Topic>('delivery');
  const items = useMemo(() => ITEMS[topic].map(([q, a]) => ({ id: q, title: t(q), content: t(a) })), [topic, t]);

  return (
    <div className="container-page max-w-3xl py-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{t('nav.faq')}</h1>
      <p className="muted mt-1">{t('faq.intro')}</p>
      <div className="scrollbar-none my-5 flex gap-2 overflow-x-auto" role="group" aria-label={t('faq.topics')}>
        {TOPICS.map((tp) => (
          <button key={tp} type="button" aria-pressed={topic === tp} onClick={() => setTopic(tp)} className={cn('chip shrink-0', topic === tp && 'chip-active')}>
            {t(`faq.topic.${tp}`)}
          </button>
        ))}
      </div>
      <Accordion key={topic} items={items} />
    </div>
  );
}
