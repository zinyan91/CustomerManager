import React from 'react';
import { StatusPill, type StatusTone } from '../ui/StatusPill';
import type { RowTone } from '../../lib/savingsPledgeView';

const PILL_TONE: Record<RowTone, StatusTone> = {
  pos: 'pos', warn: 'warn', neg: 'neg', accent: 'info', mute: 'neutral',
};

export function RowStatus({ tone, label }: { tone: RowTone; label: string }) {
  return <StatusPill status={PILL_TONE[tone]} className="whitespace-nowrap shrink-0">{label}</StatusPill>;
}

export function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs mt-3">{children}</dl>;
}

export function DetailRow({ label, value, strong = false, mono = false }: { label: string; value: React.ReactNode; strong?: boolean; mono?: boolean }) {
  const line = strong ? 'border-t border-line pt-1.5 font-bold text-ink' : '';
  return (
    <>
      <dt className={`text-ink-muted ${line}`}>{label}</dt>
      <dd className={`text-right tabular-nums text-ink ${mono ? 'font-mono' : ''} ${line}`}>{value}</dd>
    </>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-2 text-[11px] font-semibold text-ink-muted">{children}</h3>;
}

export function WarningNote({ children }: { children: React.ReactNode }) {
  return <div role="note" className="mt-3 rounded-[var(--r-control)] bg-warn-soft text-warn px-3 py-2 text-xs">{children}</div>;
}
