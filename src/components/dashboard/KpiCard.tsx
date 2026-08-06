import React from 'react';
import type { Tone } from './DueSectionPanel';

const TONE_VALUE: Record<Tone, string> = {
  accent: 'text-accent',
  pos: 'text-pos',
  warn: 'text-warn',
  neg: 'text-neg',
};

const TONE_TILE: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent border-accent/30',
  pos: 'bg-pos-soft text-pos border-pos/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  neg: 'bg-neg-soft text-neg border-neg/30',
};

interface KpiCardProps {
  cardBg: string;
  tone: Tone;
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  note: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  cardBg, tone, icon: Icon, label, value, unit, note,
}) => (
  <div className={`${cardBg} p-4 rounded-lg border flex items-start justify-between gap-3`}>
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-ink-faint uppercase tracking-wider text-balance">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-xl xl:text-2xl font-extrabold whitespace-nowrap ${TONE_VALUE[tone]}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-normal text-ink-faint whitespace-nowrap">{unit}</span>}
      </div>
      <div className="text-[11px] text-ink-faint mt-1 text-balance">{note}</div>
    </div>
    <div className={`hidden sm:block shrink-0 p-3 rounded-md border ${TONE_TILE[tone]}`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);
