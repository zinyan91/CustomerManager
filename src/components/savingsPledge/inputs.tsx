import { useState } from 'react';
import { Input } from '../ui/Field';
import { formatMoneyInput, parseDecimalNumber, parseMoneyInput } from '../../lib/utils';

interface MoneyProps {
  id: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}

// Giữ nguyên chuỗi đang gõ, chỉ định dạng khi rời ô: định dạng theo từng phím làm con trỏ nhảy về cuối
// và không xoá được dấu phân cách.
export function MoneyInput({ id, value, onChange, disabled }: MoneyProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      id={id}
      inputMode="numeric"
      disabled={disabled}
      className="text-right font-mono tabular-nums"
      value={draft ?? (value ? formatMoneyInput(String(Math.round(value))) : '')}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseMoneyInput(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
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
      className="text-right font-mono tabular-nums"
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
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}
