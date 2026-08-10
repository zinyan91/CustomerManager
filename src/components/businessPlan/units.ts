import { fmtDecimals } from '../../lib/utils';

export type MoneyUnit = 'vnd' | 'million';

export const UNIT_FACTOR: Record<MoneyUnit, number> = { vnd: 1, million: 1_000_000 };
export const UNIT_LABEL: Record<MoneyUnit, string> = { vnd: 'đồng', million: 'trđ' };

export function decimalsFor(scaled: number): number {
  const le = Math.abs(scaled % 1);
  return le < 0.05 || le > 0.95 ? 0 : 1;
}

export function moneyText(value: number, unit: MoneyUnit, fallback = '0'): string {
  const scaled = value / UNIT_FACTOR[unit];
  return fmtDecimals(scaled, decimalsFor(scaled), fallback);
}

export function moneyInputText(value: number, unit: MoneyUnit): string {
  if (!value) return '';
  return moneyText(value, unit, '');
}
