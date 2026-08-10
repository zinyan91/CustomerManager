export type MoneyUnit = 'vnd' | 'million';

export const UNIT_FACTOR: Record<MoneyUnit, number> = { vnd: 1, million: 1_000_000 };
export const UNIT_LABEL: Record<MoneyUnit, string> = { vnd: 'đồng', million: 'trđ' };
