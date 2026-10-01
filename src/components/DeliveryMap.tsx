import { memo, useId, useState } from 'react';
import { DELIVERY_ZONES, MALL_POINT } from '@/data/zones';
import { usePrice, useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

interface DeliveryMapProps {
  selected?: string | null;
  onSelect?: (zoneId: string) => void;
}

/** Tashqi xarita API'sisiz sodda interaktiv SVG xarita (klaviatura bilan ham boshqariladi) */
export const DeliveryMap = memo(function DeliveryMap({ selected, onSelect }: DeliveryMapProps) {
  const t = useT();
  const fmt = usePrice();
  const [hover, setHover] = useState<string | null>(null);
  const gridId = `map-grid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const info = DELIVERY_ZONES.find((z) => z.id === (hover ?? selected));

  return (
    <div>
      <svg
        viewBox="0 0 400 300"
        className="w-full rounded-xl bg-sky-50 dark:bg-slate-800"
        role="group"
        aria-label={t('delivery.mapLabel')}
      >
        <defs>
          <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-sky-200 dark:text-slate-700" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={`url(#${gridId})`} />
        {/* Amudaryo (dekorativ) */}
        <path d="M0,262 C80,250 120,292 200,284 S330,258 400,272" fill="none" stroke="#38bdf8" strokeWidth="7" opacity="0.45" />
        {DELIVERY_ZONES.map((z) => {
          const isSel = z.id === selected;
          const isHover = z.id === hover;
          return (
            <g key={z.id}>
              <polygon
                points={z.points}
                role={onSelect ? 'button' : 'img'}
                tabIndex={onSelect ? 0 : -1}
                aria-pressed={onSelect ? isSel : undefined}
                aria-label={`${z.name}: ${fmt(z.fee)}, ~${z.minutes} ${t('common.min')}`}
                onMouseEnter={() => setHover(z.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(z.id)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(z.id)}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelect(z.id);
                  }
                }}
                className={cn(
                  'stroke-white stroke-[3] outline-none transition-colors dark:stroke-slate-900',
                  onSelect && 'cursor-pointer',
                  isSel ? 'fill-brand-500' : isHover ? 'fill-brand-300' : 'fill-brand-100 dark:fill-brand-950',
                )}
              />
              <text
                x={z.labelX}
                y={z.labelY}
                textAnchor="middle"
                className={cn('pointer-events-none select-none text-[10px] font-semibold', isSel ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200')}
              >
                {z.name}
              </text>
            </g>
          );
        })}
        <g aria-hidden="true" className="pointer-events-none">
          <circle cx={MALL_POINT.x} cy={MALL_POINT.y - 12} r="13" className="fill-accent-500" />
          <circle cx={MALL_POINT.x} cy={MALL_POINT.y - 12} r="20" className="fill-accent-500" opacity="0.25">
            <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x={MALL_POINT.x} y={MALL_POINT.y - 8} textAnchor="middle" className="fill-white text-[12px] font-bold">
            E
          </text>
        </g>
      </svg>
      <div className="mt-3 min-h-[3rem] rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-800/60" aria-live="polite">
        {info ? (
          <span>
            <b>{info.name}</b> — {t('delivery.fee')}: <b>{fmt(info.fee)}</b>, {t('delivery.time')}: ~{info.minutes} {t('common.min')}
          </span>
        ) : (
          <span className="muted">{t('delivery.mapHint')}</span>
        )}
      </div>
    </div>
  );
});
