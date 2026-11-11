import type { LoanContract } from '../../types';
import type { DuePeriodRow } from '../duePeriod';
import { debtGroupFromOverdueDays } from '../loanMath';
import { daysUntil } from '../utils';

export type DebtGroupFilter = 'all' | 'group1' | 'group2to5';

export const DEBT_GROUP_FILTER_LABELS: Record<DebtGroupFilter, string> = {
  all: 'Toàn bộ',
  group1: 'Nhóm 1',
  group2to5: 'Nhóm 2–5',
};

export function groupPeriodsByContract(periods: DuePeriodRow[]): Map<number, DuePeriodRow[]> {
  const map = new Map<number, DuePeriodRow[]>();
  for (const period of periods) {
    const list = map.get(period.ContractId) ?? [];
    list.push(period);
    map.set(period.ContractId, list);
  }
  return map;
}

export function kunnDebtGroup(
  contract: Pick<LoanContract, 'DebtGroup'>,
  periods: DuePeriodRow[],
  today: string,
): number {
  const overdue = Math.max(0, ...periods.filter(p => !p.IsPaid).map(p => -(daysUntil(p.DueDate, today) ?? 0)));
  return Math.max(contract.DebtGroup ?? 1, debtGroupFromOverdueDays(overdue));
}

export function matchesDebtGroup(group: number, filter: DebtGroupFilter): boolean {
  if (filter === 'group1') return group <= 1;
  if (filter === 'group2to5') return group >= 2;
  return true;
}
