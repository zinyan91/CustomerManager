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
  note: ReactNode;
}

export const KpiCard = memo<KpiCardProps>(({
  cardBg, hue, icon: Icon, label, value, unit, note,
}) => (
  <div
    data-kpi-hue={hue}
    style={{ '--kpi-hue': HUE_VAR[hue] } as CSSProperties}
    className={`${cardBg} relative overflow-hidden p-4 rounded-xl border border-line flex items-start justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-200 group`}
  >
    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--kpi-hue)]" />
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-ink-faint uppercase tracking-wider text-balance">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl xl:text-3xl font-extrabold whitespace-nowrap font-mono tracking-tight text-[var(--kpi-hue)]">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-ink-faint whitespace-nowrap">{unit}</span>}
      </div>
      <div className="text-[11px] text-ink-muted mt-1.5 text-balance">{note}</div>
    </div>
    <div className="hidden sm:flex items-center justify-center shrink-0 w-11 h-11 rounded-lg border border-[color-mix(in_srgb,var(--kpi-hue)_40%,transparent)] bg-[color-mix(in_srgb,var(--kpi-hue)_14%,transparent)] text-[var(--kpi-hue)] transition-transform duration-200 group-hover:scale-105">
      <Icon className="w-5 h-5" />
    </div>
  </div>
));

KpiCard.displayName = 'KpiCard';
