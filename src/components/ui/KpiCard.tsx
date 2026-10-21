import React from 'react';

export type KpiHue = 'accent' | 'cust' | 'collateral' | 'card' | 'debt' | 'pos' | 'warn' | 'neg';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  hue?: KpiHue;
  className?: string;
  onClick?: () => void;
}

const HUE_STYLES: Record<KpiHue, { bg: string; text: string; valColor: string }> = {
  accent: { bg: 'bg-accent-soft', text: 'text-accent', valColor: 'text-accent' },
  cust: { bg: 'bg-kpi-cust/10', text: 'text-kpi-cust', valColor: 'text-kpi-cust' },
  collateral: { bg: 'bg-kpi-collateral/10', text: 'text-kpi-collateral', valColor: 'text-kpi-collateral' },
  card: { bg: 'bg-kpi-card/10', text: 'text-kpi-card', valColor: 'text-kpi-card' },
  debt: { bg: 'bg-warn-soft', text: 'text-warn', valColor: 'text-ink' },
  pos: { bg: 'bg-pos-soft', text: 'text-pos', valColor: 'text-pos' },
  warn: { bg: 'bg-warn-soft', text: 'text-warn', valColor: 'text-warn' },
  neg: { bg: 'bg-neg-soft', text: 'text-neg', valColor: 'text-neg' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  hue = 'accent',
  className = '',
  onClick,
}) => {
  const styles = HUE_STYLES[hue] || HUE_STYLES.accent;

  return (
    <div
      data-kpi-hue={hue}
      data-metric-tone={hue === 'debt' ? 'warn' : hue}
      onClick={onClick}
      className={`workspace-kpi-card min-w-0 rounded-[var(--r-panel)] border border-line bg-panel p-4 ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 min-h-10">
        <span className="text-[length:var(--fs-label)] font-medium leading-relaxed text-ink-muted text-balance min-w-0">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-[var(--r-control)] ${styles.bg} ${styles.text} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className={`font-mono num-lead font-bold leading-tight tracking-tight truncate ${styles.valColor}`}>
        {value}
      </div>

      {subtext && (
        <div className="mt-2 min-w-0 text-[length:var(--fs-label)] text-ink-muted font-medium">
          {subtext}
        </div>
      )}
    </div>
  );
};
