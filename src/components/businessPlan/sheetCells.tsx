import React from 'react';
import { fmtDecimals, parseMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';
import { UNIT_FACTOR, moneyText, moneyInputText, type MoneyUnit } from './units';

export const CELL = 'border border-line px-2 py-1 align-middle';
export const HEAD = `${CELL} bg-panel-muted text-[10px] font-bold uppercase tracking-wide text-ink-faint text-center`;
export const OUT_CELL = `${CELL} text-right font-mono text-ink bg-panel-muted/40`;

const INPUT = 'w-full bg-transparent text-right font-mono text-accent font-semibold '
  + 'outline-none focus:ring-1 focus:ring-accent rounded-sm px-0.5';

export const Panel: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({
  title, children, aside,
}) => (
  <div data-workspace-panel className="bg-panel border border-line rounded-lg overflow-hidden">
    <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-panel-muted">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-accent">{title}</h3>
      {aside}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

export const MoneyCell: React.FC<{
  value: number;
  unit: MoneyUnit;
  onChange: (v: number) => void;
  muted?: boolean;
}> = ({ value, unit, onChange, muted }) => {
  const [dangGo, setDangGo] = React.useState<string | null>(null);
  const factor = UNIT_FACTOR[unit];

  return (
    <td className={`${CELL} ${muted ? 'bg-panel-muted/40' : ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={dangGo ?? moneyInputText(value, unit)}
        onChange={e => {
          setDangGo(e.target.value);
          onChange(unit === 'vnd'
            ? parseMoneyInput(e.target.value)
            : parseMoneyDecimalInput(e.target.value) * factor);
        }}
        onBlur={() => setDangGo(null)}
        className={INPUT}
      />
    </td>
  );
};

export const PercentCell: React.FC<{ value: number; onChange: (v: number) => void }> = ({
  value, onChange,
}) => {
  const [dangGo, setDangGo] = React.useState<string | null>(null);
  return (
    <td className={CELL}>
      <div className="flex items-center justify-end gap-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={dangGo ?? (value === 0 ? '' : String(value))}
          onChange={e => {
            setDangGo(e.target.value);
            onChange(parseMoneyDecimalInput(e.target.value));
          }}
          onBlur={() => setDangGo(null)}
          className={INPUT}
        />
        <span className="text-[10px] text-ink-faint shrink-0">%</span>
      </div>
    </td>
  );
};

export const TextCell: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <td className={CELL}>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${INPUT} text-left`}
    />
  </td>
);

export const OutCell: React.FC<{
  value: number; unit: MoneyUnit; bold?: boolean; tone?: 'neg' | 'pos';
}> = ({ value, unit, bold, tone }) => (
  <td className={`${OUT_CELL} ${bold ? 'font-bold' : ''} ${
    tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : ''
  }`}>
    {moneyText(value, unit)}
  </td>
);

export const RatioCell: React.FC<{ value: number; digits?: number; suffix?: string }> = ({
  value, digits = 1, suffix,
}) => (
  <td className={OUT_CELL}>
    {fmtDecimals(value, digits, '0')}{suffix ? ` ${suffix}` : ''}
  </td>
);

export const PercentOutCell: React.FC<{ value: number }> = ({ value }) => (
  <td className={OUT_CELL}>{fmtDecimals(value * 100, 1, '0')}%</td>
);

export const GroupRow: React.FC<{ ky: string; title: string; span: number }> = ({ ky, title, span }) => (
  <tr>
    <td className={`${CELL} text-center font-bold bg-panel-muted/60`}>{ky}</td>
    <td className={`${CELL} font-bold text-ink bg-panel-muted/60`} colSpan={span}>{title}</td>
  </tr>
);

export const LabelCell: React.FC<{
  children: React.ReactNode; bold?: boolean; italic?: boolean; colSpan?: number;
}> = ({ children, bold, italic, colSpan }) => (
  <td className={`${CELL} text-left ${bold ? 'font-bold text-ink' : ''} ${italic ? 'italic text-ink-muted' : ''}`}
    colSpan={colSpan}>
    {children}
  </td>
);

export const SttCell: React.FC<{ children: React.ReactNode; bold?: boolean }> = ({ children, bold }) => (
  <td className={`${CELL} text-center font-mono text-ink-faint ${bold ? 'font-bold text-ink' : ''}`}>
    {children}
  </td>
);
