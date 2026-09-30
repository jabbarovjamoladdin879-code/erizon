import { Link } from 'react-router-dom';
import { Clock, Download, Instagram, Mail, MapPin, Phone, Send } from 'lucide-react';
import { STORE_INFO } from '@/data/zones';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useT } from '@/hooks/useT';
import { Logo } from './Logo';

export function Footer() {
  const t = useT();
  const { canInstall, install } = useInstallPrompt();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200/70 bg-white/70 pb-24 backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-900/60 md:pb-0">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-8 py-8 sm:py-10 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Logo />
          <p className="muted mt-3 text-sm leading-relaxed">{t('footer.about')}</p>
          {canInstall && (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.97]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('footer.install')}
            </button>
          )}
        </div>
        <nav aria-label={t('footer.buyers')}>
          <h2 className="mb-3 font-bold">{t('footer.buyers')}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/catalog">{t('nav.catalog')}</Link></li>
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/delivery">{t('nav.delivery')}</Link></li>
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/track">{t('nav.track')}</Link></li>
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/faq">{t('nav.faq')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('footer.company')}>
          <h2 className="mb-3 font-bold">{t('footer.company')}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/about">{t('nav.about')}</Link></li>
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/contact">{t('nav.contact')}</Link></li>
            <li><Link className="muted hover:text-brand-700 dark:hover:text-brand-300" to="/admin">{t('footer.admin')}</Link></li>
          </ul>
        </nav>
        <div className="col-span-2 lg:col-span-1">
          <h2 className="mb-3 font-bold">{t('nav.contact')}</h2>
          <ul className="muted space-y-2.5 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{STORE_INFO.address}</li>
            <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t('contact.everyDay')} {STORE_INFO.hours}</li>
            <li><a className="flex gap-2 hover:text-brand-700" href={STORE_INFO.phoneHref}><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{STORE_INFO.phone}</a></li>
            <li><a className="flex gap-2 hover:text-brand-700" href={`mailto:${STORE_INFO.email}`}><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{STORE_INFO.email}</a></li>
          </ul>
          <div className="mt-4 flex gap-2">
            <a href={STORE_INFO.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-800">
              <Send className="h-4 w-4" />
            </a>
            <a href={STORE_INFO.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-800">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {year} Erizon Mall · {t('footer.rights')} · {t('footer.demo')}
      </div>
    </footer>
  );
}
