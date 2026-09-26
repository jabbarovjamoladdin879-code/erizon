import { Suspense } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ExternalLink, Gift, History, LogOut, Package, ShieldAlert, ShieldCheck, ShoppingBag, Tag } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { cn } from '@/utils/cn';

/**
 * Admin panel. Kirish huquqi SERVERDA tekshiriladi (rol + 2FA). Bu yerdagi tekshiruv
 * faqat qulaylik uchun — admin bo'lmagan foydalanuvchi API'dan baribir 403 oladi.
 * Admin paneli ichki vosita bo'lgani uchun faqat o'zbek tilida.
 */
const NAV = [
  { to: '/admin', label: 'Boshqaruv paneli', icon: BarChart3, end: true },
  { to: '/admin/products', label: 'Mahsulotlar', icon: Package, end: false },
  { to: '/admin/orders', label: 'Buyurtmalar', icon: ShoppingBag, end: false },
  { to: '/admin/promos', label: 'Promokod va aksiya', icon: Tag, end: false },
  { to: '/admin/gifts', label: "Sovg'a sertifikatlari", icon: Gift, end: false },
  { to: '/admin/audit', label: 'Audit jurnali', icon: History, end: false },
  { to: '/admin/security', label: 'Xavfsizlik (2FA)', icon: ShieldCheck, end: false },
];

export default function AdminLayout() {
  const user = useCurrentUser();
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (status !== 'ready') return <PageSkeleton />;
  if (!user) return <Navigate to="/login?redirect=/admin" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link to="/admin" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white">E</span>
            <span className="hidden sm:inline">Erizon Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="muted hidden text-sm md:inline">{user.name}</span>
            <Link to="/" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Do'kon</span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/'))}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
        <nav aria-label="Admin menyu" className="scrollbar-none flex gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {!user.totpEnabled && pathname !== '/admin/security' && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <Link
            to="/admin/security"
            className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          >
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              <b>Ikki bosqichli himoya (2FA) yoqilmagan.</b> Production'da 2FA'siz admin API'ga kirish taqiqlangan — hoziroq yoqing.
            </span>
          </Link>
        </div>
      )}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
