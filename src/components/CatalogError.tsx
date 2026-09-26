import { useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/hooks/useT';
import { useCatalogStore } from '@/store/catalogStore';

/** Katalogni serverdan yuklab bo'lmaganda (internet yo'q va keshda ham yo'q) */
export function CatalogError({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const load = useCatalogStore((s) => s.load);
  const [busy, setBusy] = useState(false);
  return (
    <div className={embedded ? '' : 'container-page py-8'}>
      <EmptyState
        icon={WifiOff}
        titleAs={embedded ? 'h2' : 'h1'}
        title={t('err.network')}
        text={t('err.retryHint')}
        action={
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true);
              void load().finally(() => setBusy(false));
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('error.retry')}
          </Button>
        }
      />
    </div>
  );
}
