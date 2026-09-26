import { Modal } from '@/components/ui/Modal';
import { SIZE_CHART_ADULT, SIZE_CHART_KIDS } from '@/data/options';
import { useT } from '@/hooks/useT';

interface Props {
  open: boolean;
  onClose: () => void;
  kids: boolean;
}

export function SizeChartModal({ open, onClose, kids }: Props) {
  const t = useT();
  const rows = kids ? SIZE_CHART_KIDS : SIZE_CHART_ADULT;
  return (
    <Modal open={open} onClose={onClose} title={t('size.chartTitle')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="muted mb-3 text-left text-xs">{t('size.chartNote')}</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-700">
              <th scope="col" className="py-2 pr-3">{kids ? t('size.age') : t('product.size')}</th>
              <th scope="col" className="py-2 pr-3">{t('size.chest')}</th>
              <th scope="col" className="py-2 pr-3">{t('size.waist')}</th>
              <th scope="col" className="py-2">{t('size.height')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.size} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <th scope="row" className="py-2 pr-3 font-bold text-brand-700 dark:text-brand-300">
                  {r.size}
                </th>
                <td className="py-2 pr-3">{r.chest}</td>
                <td className="py-2 pr-3">{r.waist}</td>
                <td className="py-2">{r.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
