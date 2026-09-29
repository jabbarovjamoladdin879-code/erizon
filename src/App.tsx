import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/layout/Layout';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Toaster } from '@/components/ui/Toaster';
import { useAuthStore } from '@/store/authStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useUiStore } from '@/store/uiStore';

// Sahifalar React.lazy orqali alohida bo'laklarga (chunk) ajratiladi
const HomePage = lazy(() => import('@/pages/HomePage'));
const CatalogPage = lazy(() => import('@/pages/CatalogPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const ComparePage = lazy(() => import('@/pages/ComparePage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const DeliveryPage = lazy(() => import('@/pages/DeliveryPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminPromosPage = lazy(() => import('@/pages/admin/AdminPromosPage'));
const AdminGiftsPage = lazy(() => import('@/pages/admin/AdminGiftsPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSecurityPage = lazy(() => import('@/pages/admin/AdminSecurityPage'));

function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#020617' : '#6d28d9');
  }, [theme]);
  return null;
}

/** Ilova ochilganda: katalog (serverdan) va joriy sessiya */
function Bootstrap() {
  const loadCatalog = useCatalogStore((s) => s.load);
  const initAuth = useAuthStore((s) => s.init);
  const refreshUnread = useAuthStore((s) => s.refreshUnread);
  useEffect(() => {
    void loadCatalog();
    void initAuth();
  }, [loadCatalog, initAuth]);
  // Bildirishnomalar sonini vaqti-vaqti bilan yangilash (faqat sahifa ko'rinib turganda)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshUnread();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refreshUnread]);
  return null;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeSync />
        <Bootstrap />
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="product/:id" element={<ProductPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="order/success/:id" element={<OrderSuccessPage />} />
                <Route path="track" element={<OrderTrackingPage />} />
                <Route path="track/:id" element={<OrderTrackingPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="reset" element={<ResetPasswordPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="delivery" element={<DeliveryPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route path="admin/login" element={<Navigate to="/login?redirect=/admin" replace />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="promos" element={<AdminPromosPage />} />
                <Route path="gifts" element={<AdminGiftsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="security" element={<AdminSecurityPage />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <Toaster />
      </BrowserRouter>
    </MotionConfig>
  );
}
