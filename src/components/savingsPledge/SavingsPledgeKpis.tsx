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

const GRID_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
};

export function SavingsPledgeKpis({ items }: { items: KpiItem[] }) {
  return (
    <div className={`grid grid-cols-1 ${GRID_COLS[items.length] ?? 'sm:grid-cols-2 xl:grid-cols-4'} gap-3 p-4 font-app`}>
      {items.map((k) => (
        <div key={k.label} data-metric-tone={k.tone} className="workspace-kpi-card px-4 py-3 min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">{k.label}</div>
          <div className={`mt-1 font-mono font-bold text-base sm:text-lg whitespace-nowrap tabular-nums ${VALUE_COLOR[k.tone]}`}>{k.value}</div>
          {k.sub && <div className="text-[11px] text-ink-muted">{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}
