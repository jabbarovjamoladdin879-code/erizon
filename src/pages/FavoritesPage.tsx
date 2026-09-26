import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { useCatalogStatus, useProductMap } from '@/store/catalogStore';
import { CatalogError } from '@/components/CatalogError';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { useListsStore } from '@/store/listsStore';
import type { Product } from '@/types';

export default function FavoritesPage() {
  const t = useT();
  useSeo(t('nav.favorites'));
  const ids = useListsStore((s) => s.favorites);
  const map = useProductMap();
  const catalogStatus = useCatalogStatus();
  const products = useMemo(() => ids.map((id) => map.get(id)).filter((p): p is Product => !!p), [ids, map]);

  return (
    <div className="container-page py-6">
      <h1 className="mb-5 text-2xl font-extrabold sm:text-3xl">
        {t('nav.favorites')} {products.length > 0 && <span className="muted text-base font-medium">({products.length})</span>}
      </h1>
      {ids.length > 0 && catalogStatus === 'loading' ? (
        <GridSkeleton count={Math.min(8, ids.length)} />
      ) : ids.length > 0 && catalogStatus === 'error' ? (
        <CatalogError embedded />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t('fav.empty')}
          text={t('fav.emptyText')}
          action={<Link to="/catalog" className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">{t('nav.catalog')}</Link>}
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
