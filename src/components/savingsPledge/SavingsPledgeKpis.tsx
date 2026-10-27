import React from 'react';

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone: 'accent' | 'collateral' | 'pos' | 'warn' | 'neg';
}

const VALUE_COLOR: Record<KpiItem['tone'], string> = {
  accent: 'text-accent',
  collateral: 'text-kpi-collateral',
  pos: 'text-pos',
  warn: 'text-warn',
  neg: 'text-neg',
};

export function SavingsPledgeKpis({ items }: { items: KpiItem[] }) {
  return (
    <div data-workspace-metrics className="grid grid-cols-2 xl:grid-cols-4 font-app">
      {items.map((k) => (
        <div key={k.label} data-workspace-panel data-metric-tone={k.tone} className="px-4 py-3 border-b border-line min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">{k.label}</div>
          <div className={`mt-1 font-mono font-bold text-sm sm:text-base whitespace-nowrap tabular-nums ${VALUE_COLOR[k.tone]}`}>{k.value}</div>
          {k.sub && <div className="text-[11px] text-ink-muted">{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}
