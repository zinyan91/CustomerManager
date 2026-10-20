import React from 'react';
import { UI } from '../../lib/uiClasses';
import { formatMoneyInput, parseMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';
import { UNIT_FACTOR, type MoneyUnit } from './units';

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}

const baseInput = `w-full rounded-md p-2 text-xs border font-mono text-right ${UI.inputStyle}`;

export const MoneyField: React.FC<FieldProps & { unit: MoneyUnit }> = ({
  label, value, onChange, unit, disabled, hint,
}) => {
  const factor = UNIT_FACTOR[unit];
  const shown = unit === 'vnd'
    ? formatMoneyInput(String(Math.round(value)))
    : (value === 0 ? '' : String(Math.round(value / factor * 1000) / 1000));

  const handle = (raw: string) => {
    onChange(unit === 'vnd' ? parseMoneyInput(raw) : parseMoneyDecimalInput(raw) * factor);
  };

  return (
    <label className="block">
      <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>{label}</span>
      <input type="text" inputMode="decimal" value={shown} disabled={disabled}
        onChange={e => handle(e.target.value)}
        className={`${baseInput} ${disabled ? UI.readonlyInputStyle : ''}`} />
      {hint && <span className="block mt-0.5 text-[10px] text-ink-faint">{hint}</span>}
    </label>
  );
};

export const PercentField: React.FC<FieldProps> = ({ label, value, onChange, hint }) => {
  const [dangGo, setDangGo] = React.useState<string | null>(null);
  return (
    <label className="block">
      <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={dangGo ?? (value === 0 ? '' : String(value))}
          onChange={e => {
            setDangGo(e.target.value);
            onChange(parseMoneyDecimalInput(e.target.value));
          }}
          onBlur={() => setDangGo(null)}
          className={`${baseInput} pr-6`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint">%</span>
      </div>
      {hint && <span className="block mt-0.5 text-[10px] text-ink-faint">{hint}</span>}
    </label>
  );
};

export const CountField: React.FC<FieldProps & { suffix?: string }> = ({
  label, value, onChange, suffix, hint,
}) => (
  <label className="block">
    <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>{label}</span>
    <div className="relative">
      <input type="text" inputMode="numeric" value={value === 0 ? '' : String(value)}
        onChange={e => onChange(parseMoneyInput(e.target.value))}
        className={`${baseInput} ${suffix ? 'pr-12' : ''}`} />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint">{suffix}</span>
      )}
    </div>
    {hint && <span className="block mt-0.5 text-[10px] text-ink-faint">{hint}</span>}
  </label>
);

export const ReadOnlyRow: React.FC<{
  label: string; value: string; strong?: boolean; tone?: 'pos' | 'neg' | 'warn';
}> = ({ label, value, strong, tone }) => {
  const toneClass = tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : tone === 'pos' ? 'text-pos' : 'text-ink';
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-line last:border-0">
      <span className={`text-[11px] ${strong ? 'font-bold text-ink' : UI.labelStyle}`}>{label}</span>
      <span className={`font-mono text-xs ${strong ? 'font-bold' : ''} ${toneClass}`}>{value}</span>
    </div>
  );
};

export const Block: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({
  title, children, aside,
}) => (
  <div data-workspace-panel className={`${UI.containerCardBg} rounded-lg border p-3`}>
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-accent">{title}</h3>
      {aside}
    </div>
    {children}
  </div>
);
