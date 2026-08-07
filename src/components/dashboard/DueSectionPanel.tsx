import React from 'react';
import { Printer } from 'lucide-react';
import { DUE_FILTER_LABELS, type DueFilter } from '../../lib/dueList';
import { AdaptiveTable, type AdaptiveColumn } from '../AdaptiveTable';

export type Tone = 'accent' | 'warn' | 'pos' | 'neg';

const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent',
  warn: 'text-warn',
  pos: 'text-pos',
  neg: 'text-neg',
};

const TONE_CHIP: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent border-accent/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  pos: 'bg-pos-soft text-pos border-pos/30',
  neg: 'bg-neg-soft text-neg border-neg/30',
};

const TONE_FILTER_ON: Record<Tone, string> = {
  accent: 'bg-accent text-accent-ink',
  warn: 'bg-warn text-surface',
  pos: 'bg-pos text-surface',
  neg: 'bg-neg text-surface',
};

interface DueSectionPanelProps<T> {
  icon: React.ElementType;
  tone: Tone;
  title: string;
  counts: { upcoming: number; expired: number };
  columns: AdaptiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  cardTitle: (row: T) => React.ReactNode;
  cardSubtitle?: (row: T) => React.ReactNode;
  emptyText: string;
  cardBg: string;
  filter?: DueFilter;
  onFilterChange?: (f: DueFilter) => void;
  onPrint?: () => void;
}

export function DueSectionPanel<T>({
  icon: Icon, tone, title, counts, columns, rows, rowKey, cardTitle, cardSubtitle,
  emptyText, cardBg, filter, onFilterChange, onPrint,
}: DueSectionPanelProps<T>) {
  return (
  <div className={`${cardBg} rounded-lg p-4 border space-y-3`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 ${TONE_TEXT[tone]}`} />
        <h3 className={`font-bold text-xs tracking-tight ${TONE_TEXT[tone]}`}>{title}</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONE_CHIP[tone]}`}>
          {counts.upcoming} sắp đến · {counts.expired} quá hạn
        </span>

        {onFilterChange && filter && (
          <div className="flex items-center gap-1.5">
            {(['all', 'upcoming', 'expired'] as DueFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                aria-pressed={filter === f}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors duration-150 ${
                  filter === f ? TONE_FILTER_ON[tone] : 'text-ink-faint hover:bg-panel-muted'
                }`}
              >
                {DUE_FILTER_LABELS[f]}
              </button>
            ))}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border bg-panel border-line text-ink-muted hover:border-accent hover:text-accent transition-colors duration-150"
              >
                <Printer className="w-3 h-3" />PDF
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    <AdaptiveTable
      rows={rows}
      rowKey={rowKey}
      columns={columns}
      emptyText={emptyText}
      cardTitle={cardTitle}
      cardSubtitle={cardSubtitle}
    />
  </div>
  );
}

export function dueBadgeClass(daysLeft: number, urgentWithinDays: number): string {
  if (daysLeft < 0) return 'bg-neg text-surface border border-neg font-bold';
  if (daysLeft <= urgentWithinDays) return 'bg-neg-soft text-neg border border-neg/30';
  return 'bg-warn-soft text-warn border border-warn/30';
}

export function dueBadgeText(daysLeft: number): string {
  return daysLeft < 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`;
}
