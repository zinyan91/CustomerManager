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
  cust: { bg: 'bg-kpi-cust-soft', text: 'text-kpi-cust', valColor: 'text-kpi-cust' },
  collateral: { bg: 'bg-kpi-collateral-soft', text: 'text-kpi-collateral', valColor: 'text-kpi-collateral' },
  card: { bg: 'bg-kpi-card-soft', text: 'text-kpi-card', valColor: 'text-kpi-card' },
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
      onClick={onClick}
      className={`rounded-[var(--r-panel)] border border-line/70 bg-surface/80 hover:bg-surface p-3.5 sm:p-4 shadow-2xs transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[var(--fs-label)] uppercase font-bold text-ink-faint tracking-wider truncate">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-[var(--r-control)] ${styles.bg} ${styles.text} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className={`font-mono font-bold text-[var(--fs-num)] leading-tight tracking-tight truncate ${styles.valColor}`}>
        {value}
      </div>

      {subtext && (
        <div className="mt-1 text-[var(--fs-label)] text-ink-faint font-medium truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
