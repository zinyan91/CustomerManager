import type { RepaymentSchedule } from '../types';
import { daysUntil, toIsoDate, parseAnyDate } from './utils';

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

export function dueCutoffIso(todayIso?: string): string {
  const p = todayIso ? parseAnyDate(todayIso) : null;
  const base = p
    ? Date.UTC(p.year, p.month - 1, p.day)
    : (() => {
        const d = new Date();
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      })();

  const moc = new Date(base + UPCOMING_DAYS * 86400000);
  const mm = String(moc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(moc.getUTCDate()).padStart(2, '0');
  return `${moc.getUTCFullYear()}-${mm}-${dd}`;
}

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
