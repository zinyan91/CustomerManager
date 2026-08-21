import React from 'react';

export type StatusTone = 'pos' | 'warn' | 'neg' | 'info' | 'neutral';
export type StatusSize = 'sm' | 'md';

export interface StatusPillProps {
  status?: StatusTone;
  solid?: boolean;
  size?: StatusSize;
  children: React.ReactNode;
  className?: string;
}

const SOFT_STYLES: Record<StatusTone, string> = {
  pos: 'bg-pos-soft text-pos border border-pos/30',
  warn: 'bg-warn-soft text-warn border border-warn/30',
  neg: 'bg-neg-soft text-neg border border-neg/30',
  info: 'bg-accent-soft text-accent border border-accent/30',
  neutral: 'bg-surface/80 text-ink-muted border border-line/70',
};

const SOLID_STYLES: Record<StatusTone, string> = {
  pos: 'bg-pos text-surface border border-pos font-bold shadow-2xs',
  warn: 'bg-warn text-surface border border-warn font-bold shadow-2xs',
  neg: 'bg-neg text-surface border border-neg font-bold shadow-2xs',
  info: 'bg-accent text-accent-ink border border-accent font-bold shadow-2xs',
  neutral: 'bg-panel-muted text-ink border border-line font-bold shadow-2xs',
};

const SIZE_STYLES: Record<StatusSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status = 'neutral',
  solid = false,
  size = 'sm',
  children,
  className = '',
}) => {
  const toneClass = solid ? SOLID_STYLES[status] : SOFT_STYLES[status];
  const sizeClass = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold tracking-tight rounded-[var(--r-pill)] transition-colors select-none ${toneClass} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
};
