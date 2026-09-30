import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';

export default function NotFoundPage() {
  const t = useT();
  useSeo(t('notFound.title'), t('notFound.text'));
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-brand-600 to-accent-500 bg-clip-text text-8xl font-black text-transparent sm:text-9xl"
          aria-hidden="true"
        >
          404
        </motion.div>
        <h1 className="mt-4 text-2xl font-bold">{t('notFound.title')}</h1>
        <p className="muted mx-auto mt-2 max-w-md">{t('notFound.text')}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="inline-flex h-11 items-center rounded-2xl bg-brand-gradient shadow-glow transition hover:brightness-110 active:scale-[0.97] px-5 text-sm font-semibold text-white">
            {t('error.home')}
          </Link>
          <Link to="/catalog" className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold hover:border-brand-500 dark:border-slate-700">
            {t('nav.catalog')}
          </Link>
        </div>
      </div>
    </div>
  );
}
