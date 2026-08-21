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
    className={`${cardBg} relative overflow-hidden p-4 sm:p-4.5 rounded-2xl border border-line/60 bg-gradient-to-b from-panel/95 via-panel/85 to-panel/65 backdrop-blur-xl flex items-start justify-between gap-3 shadow-sm hover:shadow-xl hover:border-[color-mix(in_srgb,var(--kpi-hue)_60%,transparent)] hover:-translate-y-1 transition-all duration-300 group`}
  >
    {/* Top glowing accent bar */}
    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--kpi-hue)] via-[var(--kpi-hue)]/60 to-transparent opacity-90 group-hover:opacity-100" />
    
    {/* Luminous background bloom on hover */}
    <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[var(--kpi-hue)]/8 blur-2xl pointer-events-none group-hover:bg-[var(--kpi-hue)]/22 transition-all duration-500" />

    <div className="min-w-0 flex-1 relative z-10">
      <div className="text-[11px] font-bold text-ink-faint uppercase tracking-wider text-balance flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--kpi-hue)] shadow-[0_0_6px_var(--kpi-hue)] inline-block shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl sm:text-2xl font-black whitespace-nowrap font-mono tracking-tight text-[var(--kpi-hue)] drop-shadow-[0_2px_12px_color-mix(in_srgb,var(--kpi-hue)_35%,transparent)]">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-ink-faint whitespace-nowrap">{unit}</span>}
      </div>
      {note && <div className="text-[11px] text-ink-muted mt-1.5 text-balance leading-snug font-medium">{note}</div>}
    </div>

    <div className="hidden sm:flex items-center justify-center shrink-0 w-10 h-10 rounded-xl border border-[color-mix(in_srgb,var(--kpi-hue)_40%,transparent)] bg-[color-mix(in_srgb,var(--kpi-hue)_15%,transparent)] text-[var(--kpi-hue)] shadow-[0_0_12px_color-mix(in_srgb,var(--kpi-hue)_20%,transparent)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--kpi-hue)_40%,transparent)] relative z-10">
      <Icon className="w-5 h-5" />
    </div>
  </div>
));

KpiCard.displayName = 'KpiCard';
