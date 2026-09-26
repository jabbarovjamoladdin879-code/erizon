import { Clock, Store, Truck } from 'lucide-react';
import { DeliveryMap } from '@/components/DeliveryMap';
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD, STORE_INFO } from '@/data/zones';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';

export default function DeliveryPage() {
  const t = useT();
  const fmt = usePrice();
  useSeo(t('nav.delivery'), t('seo.delivery'));
  return (
    <div className="container-page py-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{t('nav.delivery')}</h1>
      <p className="muted mt-1">{t('delivery.intro')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex gap-3 p-5">
          <Truck className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <h2 className="font-bold">{t('delivery.freeTitle')}</h2>
            <p className="muted text-sm">{t('delivery.freeText', { sum: fmt(FREE_DELIVERY_THRESHOLD) })}</p>
          </div>
        </div>
        <div className="card flex gap-3 p-5">
          <Store className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h2 className="font-bold">{t('checkout.pickup')}</h2>
            <p className="muted text-sm">{t('delivery.pickupText', { address: STORE_INFO.address })}</p>
          </div>
        </div>
        <div className="card flex gap-3 p-5">
          <Clock className="h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h2 className="font-bold">{t('delivery.hoursTitle')}</h2>
            <p className="muted text-sm">{t('contact.everyDay')} {STORE_INFO.hours}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="map-h">
          <h2 id="map-h" className="mb-3 font-bold">{t('delivery.mapTitle')}</h2>
          <DeliveryMap />
        </section>
        <section className="card overflow-x-auto p-5" aria-labelledby="zones-h">
          <h2 id="zones-h" className="mb-3 font-bold">{t('delivery.zonesTitle')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th scope="col" className="py-2 pr-3">{t('delivery.zone')}</th>
                <th scope="col" className="py-2 pr-3">{t('delivery.fee')}</th>
                <th scope="col" className="py-2">{t('delivery.time')}</th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_ZONES.map((z) => (
                <tr key={z.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium">{z.name}</th>
                  <td className="py-2.5 pr-3 font-semibold">{fmt(z.fee)}</td>
                  <td className="py-2.5">~{z.minutes} {t('common.min')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
