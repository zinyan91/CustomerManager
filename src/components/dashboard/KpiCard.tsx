import { memo, type ReactNode, type ElementType, type CSSProperties } from 'react';

export type KpiHue =
  | 'cust'
  | 'debt'
  | 'collateral'
  | 'card'
  | 'alert';

const HUE_VAR: Record<KpiHue, string> = {
  cust: 'var(--color-kpi-cust)',
  debt: 'var(--color-accent)',
  collateral: 'var(--color-kpi-collateral)',
  card: 'var(--color-kpi-card)',
  alert: 'var(--color-neg)',
};

interface KpiCardProps {
  cardBg: string;
  hue: KpiHue;
  icon: ElementType;
  label: string;
  value: string;
  unit?: string;
  note?: ReactNode;
}

export const KpiCard = memo<KpiCardProps>(({
  cardBg, hue, icon: Icon, label, value, unit, note,
}) => (
  <div
    data-kpi-hue={hue}
    style={{ '--kpi-hue': HUE_VAR[hue] } as CSSProperties}
    className={`${cardBg} relative overflow-hidden p-3.5 rounded-xl border border-line flex items-start justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-200 group`}
  >
    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--kpi-hue)]" />
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-bold text-ink-faint uppercase tracking-wider text-balance">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl sm:text-2xl font-black whitespace-nowrap font-mono tracking-tight text-[var(--kpi-hue)]">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-ink-faint whitespace-nowrap">{unit}</span>}
      </div>
      {note && <div className="text-[11px] text-ink-muted mt-1 text-balance leading-tight">{note}</div>}
    </div>
    <div className="hidden sm:flex items-center justify-center shrink-0 w-9 h-9 rounded-lg border border-[color-mix(in_srgb,var(--kpi-hue)_40%,transparent)] bg-[color-mix(in_srgb,var(--kpi-hue)_14%,transparent)] text-[var(--kpi-hue)] transition-transform duration-200 group-hover:scale-105">
      <Icon className="w-4.5 h-4.5" />
    </div>
  </div>
));

KpiCard.displayName = 'KpiCard';
