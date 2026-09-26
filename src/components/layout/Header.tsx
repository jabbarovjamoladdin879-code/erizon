import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bell, GitCompareArrows, Heart, MapPin, Phone, ShoppingCart, User } from 'lucide-react';
import { STORE_INFO } from '@/data/zones';
import { useT } from '@/hooks/useT';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { useCartCount } from '@/store/cartStore';
import { useListsStore } from '@/store/listsStore';
import { cn } from '@/utils/cn';
import { LangSwitcher } from './LangSwitcher';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';
import { ThemeToggle } from './ThemeToggle';

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-950"
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

const iconLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative grid h-10 w-10 place-items-center rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800',
    isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200',
  );

export function Header() {
  const t = useT();
  const cartCount = useCartCount();
  const favCount = useListsStore((s) => s.favorites.length);
  const compareCount = useListsStore((s) => s.compare.length);
  const user = useCurrentUser();
  const unread = useAuthStore((s) => s.unread);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-white/85 backdrop-blur-xl transition-shadow duration-300 dark:bg-slate-950/85',
        scrolled ? 'border-slate-200 shadow-soft dark:border-slate-800' : 'border-slate-200/60 dark:border-slate-900',
      )}
    >
      <div className="hidden border-b border-slate-100 bg-slate-50/80 text-xs dark:border-slate-900 dark:bg-slate-900/50 md:block">
        <div className="container-page flex h-8 items-center justify-between text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {t('header.city')}
          </span>
          <div className="flex items-center gap-5">
            <Link to="/delivery" className="hover:text-brand-700 dark:hover:text-brand-300">
              {t('nav.delivery')}
            </Link>
            <Link to="/track" className="hover:text-brand-700 dark:hover:text-brand-300">
              {t('nav.track')}
            </Link>
            <Link to="/faq" className="hover:text-brand-700 dark:hover:text-brand-300">
              {t('nav.faq')}
            </Link>
            <a href={STORE_INFO.phoneHref} className="flex items-center gap-1 font-semibold hover:text-brand-700 dark:hover:text-brand-300">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {STORE_INFO.phone}
            </a>
          </div>
        </div>
      </div>
      <div className="container-page flex h-14 items-center gap-3 md:h-16 lg:gap-6">
        <Logo />
        <nav aria-label={t('nav.main')} className="hidden lg:block">
          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              cn(
                'rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-200',
              )
            }
          >
            {t('nav.catalog')}
          </NavLink>
        </nav>
        <SearchBox className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          <LangSwitcher />
          <ThemeToggle />
          <NavLink to="/compare" className={(s) => cn(iconLink(s), 'hidden sm:grid')} aria-label={t('nav.compare')}>
            <GitCompareArrows className="h-5 w-5" />
            <CountBadge count={compareCount} label={t('header.count', { n: compareCount })} />
          </NavLink>
          <NavLink to="/favorites" className={(s) => cn(iconLink(s), 'hidden md:grid')} aria-label={t('nav.favorites')}>
            <Heart className="h-5 w-5" />
            <CountBadge count={favCount} label={t('header.count', { n: favCount })} />
          </NavLink>
          <NavLink to="/cart" className={(s) => cn(iconLink(s), 'hidden md:grid')} aria-label={t('nav.cart')}>
            <ShoppingCart className="h-5 w-5" />
            <CountBadge count={cartCount} label={t('header.count', { n: cartCount })} />
          </NavLink>
          {user && (
            <Link to="/profile?tab=notifications" className={iconLink({ isActive: false })} aria-label={t('notify.title')}>
              <Bell className="h-5 w-5" />
              <CountBadge count={unread} label={t('header.count', { n: unread })} />
            </Link>
          )}
          <NavLink
            to={user ? '/profile' : '/login'}
            className={(s) => cn(iconLink(s), 'hidden md:grid')}
            aria-label={user ? t('nav.profile') : t('nav.login')}
          >
            <User className="h-5 w-5" />
          </NavLink>
        </div>
      </div>
      <div className="container-page pb-2.5 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
