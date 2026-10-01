import { Clock, Instagram, Mail, MapPin, Phone, Send } from 'lucide-react';
import { DeliveryMap } from '@/components/DeliveryMap';
import { STORE_INFO } from '@/data/zones';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';

export default function ContactPage() {
  const t = useT();
  useSeo(t('nav.contact'), t('seo.contact'));
  const items = [
    { icon: MapPin, label: t('contact.address'), value: STORE_INFO.address },
    { icon: Clock, label: t('contact.hours'), value: `${t('contact.everyDay')} ${STORE_INFO.hours}` },
    { icon: Phone, label: t('form.phone'), value: STORE_INFO.phone, href: STORE_INFO.phoneHref },
    { icon: Mail, label: 'E-mail', value: STORE_INFO.email, href: `mailto:${STORE_INFO.email}` },
  ];
  return (
    <div className="container-page py-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{t('nav.contact')}</h1>
      <p className="muted mt-1">{t('contact.intro')}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ul className="space-y-3">
          {items.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="card flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <div className="muted text-xs">{label}</div>
                {href ? (
                  <a href={href} className="font-semibold hover:text-brand-700">{value}</a>
                ) : (
                  <div className="font-semibold">{value}</div>
                )}
              </div>
            </li>
          ))}
          <li className="card flex gap-3 p-5">
            <a href={STORE_INFO.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800">
              <Send className="h-4 w-4" aria-hidden="true" /> Telegram
            </a>
            <a href={STORE_INFO.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white hover:bg-pink-700">
              <Instagram className="h-4 w-4" aria-hidden="true" /> Instagram
            </a>
          </li>
        </ul>
        <section className="card p-5" aria-label={t('delivery.mapTitle')}>
          <DeliveryMap />
        </section>
      </div>
    </div>
  );
}
