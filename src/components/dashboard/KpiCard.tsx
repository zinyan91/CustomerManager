import { memo, type ReactNode, type ElementType } from 'react';
import type { Tone } from './DueSectionPanel';

export type KpiTone = Tone | 'neutral';

const TONE_VALUE: Record<KpiTone, string> = {
  neutral: 'text-ink',
  accent: 'text-accent',
  pos: 'text-pos',
  warn: 'text-warn',
  neg: 'text-neg',
};

const TONE_TILE: Record<KpiTone, string> = {
  neutral: 'bg-panel-muted text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/30',
  pos: 'bg-pos-soft text-pos border-pos/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  neg: 'bg-neg-soft text-neg border-neg/30',
};

const TONE_RAIL: Record<KpiTone, string> = {
  neutral: '',
  accent: 'bg-accent',
  pos: 'bg-pos',
  warn: 'bg-warn',
  neg: 'bg-neg',
};

interface KpiCardProps {
  cardBg: string;
  tone: KpiTone;
  iconTone?: KpiTone;
  icon: ElementType;
  label: string;
  value: string;
  unit?: string;
  note: ReactNode;
}

export const KpiCard = memo<KpiCardProps>(({
  cardBg, tone, iconTone, icon: Icon, label, value, unit, note,
}) => (
  <div className={`${cardBg} relative overflow-hidden p-4 rounded-xl border border-line flex items-start justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-200 group`}>
    {TONE_RAIL[tone] && (
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${TONE_RAIL[tone]}`} />
    )}
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-ink-faint uppercase tracking-wider text-balance">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-xl xl:text-2xl font-extrabold whitespace-nowrap font-mono tracking-tight ${TONE_VALUE[tone]}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-ink-faint whitespace-nowrap">{unit}</span>}
      </div>
      <div className="text-[11px] text-ink-muted mt-1.5 text-balance">{note}</div>
    </div>
    <div className={`hidden sm:flex items-center justify-center shrink-0 w-11 h-11 rounded-lg border ${TONE_TILE[iconTone || tone]} transition-transform duration-200 group-hover:scale-105`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
));

KpiCard.displayName = 'KpiCard';
