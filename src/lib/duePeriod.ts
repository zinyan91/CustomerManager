import type { RepaymentSchedule } from '../types';
import { daysUntil, toIsoDate } from './utils';

export type DuePeriodRow = Pick<
  RepaymentSchedule,
  'Id' | 'ContractId' | 'PeriodNumber' | 'DueDate' | 'TotalAmount' | 'IsPaid'
>;

export type DueKind = 'overdue' | 'upcoming' | 'none';

export interface ContractDueState {
  kind: DueKind;
  period: DuePeriodRow | null;
  dueDateIso: string | null;
  daysLeft: number | null;
}

export const UPCOMING_DAYS = 5;

const KHONG_HIEN: ContractDueState = {
  kind: 'none',
  period: null,
  dueDateIso: null,
  daysLeft: null,
};

export function isPeriodOutstanding(period: Pick<DuePeriodRow, 'IsPaid'>): boolean {
  return !period.IsPaid;
}

export function contractDueState(
  periods: DuePeriodRow[],
  todayIso?: string
): ContractDueState {
  const conNo = periods
    .filter(isPeriodOutstanding)
    .map(period => ({ period, iso: toIsoDate(period.DueDate) }))
    .filter((x): x is { period: DuePeriodRow; iso: string } => x.iso !== null)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const somNhat = conNo[0];
  if (!somNhat) return KHONG_HIEN;

  const daysLeft = daysUntil(somNhat.iso, todayIso);
  if (daysLeft === null) return KHONG_HIEN;

  const kind: DueKind =
    daysLeft < 0 ? 'overdue' : daysLeft <= UPCOMING_DAYS ? 'upcoming' : 'none';

  return { kind, period: somNhat.period, dueDateIso: somNhat.iso, daysLeft };
}
