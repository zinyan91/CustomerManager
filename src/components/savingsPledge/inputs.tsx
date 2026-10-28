import { useLayoutEffect, useRef, useState } from 'react';
import { Input } from '../ui/Field';
import { formatMoneyInput, parseDecimalNumber } from '../../lib/utils';
import { loadFormatSettings, NUMBER_SEPARATORS } from '../../lib/formatSettings';

interface MoneyProps {
  id: string;
  ariaLabel?: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}

// Số tiền VND là số nguyên: chỉ đọc chữ số. Bộ đọc số chung coi "4.5000" là 4,5 nên không dùng ở đây.
// Định dạng lại sau mỗi phím rồi đặt con trỏ theo số chữ số đứng trước nó, để sửa giữa số không nhảy về cuối.
export function MoneyInput({ id, ariaLabel, value, onChange, disabled }: MoneyProps) {
  const ref = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const shown = value ? formatMoneyInput(String(Math.round(value))) : '';

  useLayoutEffect(() => {
    const el = ref.current;
    const n = caretDigits.current;
    if (!el || n === null) return;
    caretDigits.current = null;
    el.setSelectionRange(caretAfterDigits(el.value, n), caretAfterDigits(el.value, n));
  });

  return (
    <Input
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      inputMode="numeric"
      disabled={disabled}
      className="text-right tabular-nums"
      value={shown}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        let before = digitsOf(raw.slice(0, caret));
        let digits = digitsOf(raw);
        if (digits === digitsOf(shown) && raw.length < shown.length && before.length > 0) {
          digits = digits.slice(0, before.length - 1) + digits.slice(before.length);
          before = before.slice(0, -1);
        }
        const trimmed = digits.replace(/^0+/, '');
        caretDigits.current = Math.max(0, before.length - (digits.length - trimmed.length));
        onChange(trimmed ? Number(trimmed) : 0);
      }}
    />
  );
}

function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

function caretAfterDigits(text: string, count: number): number {
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (seen === count) return i;
    if (/\d/.test(text[i])) seen++;
  }
  return text.length;
}

interface DecimalProps {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}

export function DecimalInput({ id, value, onChange }: DecimalProps) {
  const [text, setText] = useState(displayDecimal(value));
  const shown = parseDecimal(text) === (value ?? null) ? text : displayDecimal(value);
  return (
    <Input
      id={id}
      inputMode="decimal"
      className="text-right tabular-nums"
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseDecimal(e.target.value));
      }}
    />
  );
}

function parseDecimal(text: string): number | null {
  if (text.trim() === '') return null;
  const v = parseDecimalNumber(text);
  return Number.isNaN(v) ? null : v;
}

function displayDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace('.', NUMBER_SEPARATORS[loadFormatSettings().numberStyle].decimal);
}
