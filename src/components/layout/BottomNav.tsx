import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useCurrentUser } from '@/store/authStore';
import { useCartCount } from '@/store/cartStore';
import { useListsStore } from '@/store/listsStore';
import { cn } from '@/utils/cn';

/** Mobil qurilmalar uchun pastki navigatsiya paneli */
export function BottomNav() {
  const t = useT();
  const cartCount = useCartCount();
  const favCount = useListsStore((s) => s.favorites.length);
  const user = useCurrentUser();

  const items = [
    { to: '/', label: t('nav.home'), icon: Home, end: true, count: 0 },
    { to: '/catalog', label: t('nav.catalog'), icon: LayoutGrid, end: false, count: 0 },
    { to: '/cart', label: t('nav.cart'), icon: ShoppingCart, end: false, count: cartCount },
    { to: '/favorites', label: t('nav.favorites'), icon: Heart, end: false, count: favCount },
    { to: user ? '/profile' : '/login', label: t('nav.profile'), icon: User, end: false, count: 0 },
  ];

  return (
    <nav
      aria-label={t('nav.mobile')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end, count }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] font-medium transition-colors',
                  isActive ? 'font-semibold text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn('relative grid h-8 w-12 place-items-center rounded-xl transition', isActive && 'text-brand-700 dark:text-brand-300')}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                    {count > 0 && (
                      <span className="absolute -top-1 right-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-accent-700 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
