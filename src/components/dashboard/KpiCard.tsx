import { memo, type ReactNode, type ElementType } from 'react';
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

const TONE_GRADIENT: Record<Tone, string> = {
  accent: 'from-accent/60 via-accent/20 to-transparent',
  pos: 'from-pos/60 via-pos/20 to-transparent',
  warn: 'from-warn/60 via-warn/20 to-transparent',
  neg: 'from-neg/60 via-neg/20 to-transparent',
};

interface KpiCardProps {
  cardBg: string;
  tone: Tone;
  icon: ElementType;
  label: string;
  value: string;
  unit?: string;
  note: ReactNode;
}

export const KpiCard = memo<KpiCardProps>(({
  cardBg, tone, icon: Icon, label, value, unit, note,
}) => (
  <div className={`${cardBg} relative overflow-hidden p-4 rounded-xl border border-line flex items-start justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-200 group`}>
    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${TONE_GRADIENT[tone]}`} />
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
    <div className={`hidden sm:flex items-center justify-center shrink-0 w-11 h-11 rounded-lg border ${TONE_TILE[tone]} transition-transform duration-200 group-hover:scale-105`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
));

KpiCard.displayName = 'KpiCard';
