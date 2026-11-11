import { daysUntil } from '../utils';

export type PortfolioTone = 'pos' | 'warn' | 'neg';

export const KUNN_RED_WITHIN_DAYS = 3;
export const KUNN_YELLOW_WITHIN_DAYS = 10;
export const HDTD_RED_BELOW_DAYS = 6;
export const HDTD_GREEN_FROM_DAYS = 21;
export const APPRAISAL_GREEN_FROM_DAYS = 16;

export function kunnDueTone(daysLeft: number | null): PortfolioTone | null {
  if (daysLeft === null) return null;
  if (daysLeft <= KUNN_RED_WITHIN_DAYS) return 'neg';
  if (daysLeft <= KUNN_YELLOW_WITHIN_DAYS) return 'warn';
  return 'pos';
}

export function hdtdEndTone(daysLeft: number | null): PortfolioTone | null {
  if (daysLeft === null) return null;
  if (daysLeft < HDTD_RED_BELOW_DAYS) return 'neg';
  if (daysLeft < HDTD_GREEN_FROM_DAYS) return 'warn';
  return 'pos';
}

export function appraisalTone(daysLeft: number | null): PortfolioTone | null {
  if (daysLeft === null) return null;
  if (daysLeft < 1) return 'neg';
  if (daysLeft < APPRAISAL_GREEN_FROM_DAYS) return 'warn';
  return 'pos';
}

export const toneOfDate = (rule: (daysLeft: number | null) => PortfolioTone | null) =>
  (dateIso: string | null | undefined, today: string): PortfolioTone | null =>
    rule(daysUntil(dateIso, today));

export const TONE_XLSX_FILL: Record<PortfolioTone, string> = {
  pos: 'DCFCE7',
  warn: 'FEF3C7',
  neg: 'FEE2E2',
};
