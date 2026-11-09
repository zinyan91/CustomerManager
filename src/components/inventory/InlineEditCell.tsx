import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { parseMoneyDecimalInput } from '../../lib/utils';
import { formatQuantityWith } from '../../lib/formatSettings';

const BASE = 'w-full min-w-0 rounded-md border border-line/50 bg-surface/40 px-1.5 py-1 hover:border-line-strong focus:border-accent focus:bg-panel focus:outline-none';

function useDraft(shown: string) {
  const [draft, setDraft] = useState(shown);
  const cancelled = useRef(false);
  useEffect(() => setDraft(shown), [shown]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      cancelled.current = true;
      e.currentTarget.blur();
    }
  };

  const finish = (apply: (draft: string) => boolean) => {
    if (cancelled.current || !apply(draft)) setDraft(shown);
    cancelled.current = false;
  };

  return { draft, setDraft, onKeyDown, finish };
}

interface InlineTextInputProps {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  className?: string;
  required?: boolean;
}

export function InlineTextInput({ value, onCommit, label, className = '', required = false }: InlineTextInputProps) {
  const { draft, setDraft, onKeyDown, finish } = useDraft(value);
  return (
    <input
      type="text"
      aria-label={label}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish(text => {
        const next = text.trim();
        if (required && !next) return false;
        if (next !== value) onCommit(next);
        return true;
      })}
      className={`${BASE} ${className}`}
    />
  );
}

interface InlineNumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  label: string;
  className?: string;
}

export function InlineNumberInput({ value, onCommit, label, className = '' }: InlineNumberInputProps) {
  const { draft, setDraft, onKeyDown, finish } = useDraft(formatQuantityWith(value));
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onFocus={e => e.currentTarget.select()}
      onKeyDown={onKeyDown}
      onBlur={() => finish(text => {
        const next = text.trim() ? parseMoneyDecimalInput(text) : 0;
        if (!Number.isFinite(next) || next < 0) return false;
        if (next !== value) onCommit(next);
        return false;
      })}
      className={`${BASE} text-right font-mono tabular-nums ${className}`}
    />
  );
}
