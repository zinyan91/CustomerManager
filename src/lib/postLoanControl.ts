import type { LoanContract, Collateral } from '../types';
import { addDaysToDate, addMonthsToDate, getDaysBetween, parseDateParts } from './loanMath';
import { getMasterHdtdNumber } from './utils';
import { parseCollateralIds } from './creditLimit';

export type ControlType = 'purpose' | 'periodic' | 'collateral';

export const CONTROL_TYPE_LABEL: Record<ControlType, string> = {
  purpose: 'Kiểm tra mục đích sử dụng vốn',
  periodic: 'Kiểm tra sau vay',
  collateral: 'Kiểm tra hiện trạng tài sản',
};

export const PURPOSE_CHECK_DAYS = 30;
export const PERIODIC_CHECK_MONTHS = 3;
export const COLLATERAL_CHECK_MONTHS_DEFAULT = 12;

export type ControlStatus = 'overdue' | 'due_soon' | 'upcoming';

export interface ControlItem {
  key: string;
  type: ControlType;
  periodIndex: number;
  dueDate: string;
  basisDate: string;
  status: ControlStatus;
  daysRemaining: number;
  customerId: number;
  contractIds: number[];
  contractNumbers: string[];
  masterHdtd?: string;
  collateralId?: number;
  assetCode?: string;
}

export interface GenerateControlInput {
  contracts: LoanContract[];
  collaterals: Collateral[];
  todayStr: string;
  horizonMonths?: number;
  collateralIntervalMonths?: number;
  dueSoonDays?: number;
}

function statusOf(dueDate: string, todayStr: string, dueSoonDays: number) {
  const due = parseDateParts(dueDate);
  const today = parseDateParts(todayStr);
  if (!due || !today) return { status: 'upcoming' as ControlStatus, daysRemaining: 0 };

  const diffMs = Date.UTC(due.y, due.m, due.d) - Date.UTC(today.y, today.m, today.d);
  const daysRemaining = Math.round(diffMs / 86400000);

  let status: ControlStatus = 'upcoming';
  if (daysRemaining < 0) status = 'overdue';
  else if (daysRemaining <= dueSoonDays) status = 'due_soon';

  return { status, daysRemaining };
}

function disbursementOf(c: LoanContract): string | null {
  const d = c.DisbursementDate || c.ContractStartDate || null;
  return d && parseDateParts(d) ? d : null;
}

function endDateOf(c: LoanContract): string | null {
  const d = c.KunnDueDate || c.ContractEndDate || null;
  return d && parseDateParts(d) ? d : null;
}

function isActive(c: LoanContract): boolean {
  return !c.IsSettled;
}

export function generateControlSchedule(input: GenerateControlInput): ControlItem[] {
  const {
    contracts,
    collaterals,
    todayStr,
    horizonMonths = 12,
    collateralIntervalMonths = COLLATERAL_CHECK_MONTHS_DEFAULT,
    dueSoonDays = 30,
  } = input;

  const horizonEnd = addMonthsToDate(todayStr, horizonMonths) || todayStr;
  const active = contracts.filter(isActive);
  const items: ControlItem[] = [];

  for (const c of active) {
    const basis = disbursementOf(c);
    if (!basis) continue;
    const dueDate = addDaysToDate(basis, PURPOSE_CHECK_DAYS);
    if (!dueDate) continue;
    const { status, daysRemaining } = statusOf(dueDate, todayStr, dueSoonDays);
    items.push({
      key: `purpose-${c.Id}`,
      type: 'purpose',
      periodIndex: 1,
      dueDate,
      basisDate: basis,
      status,
      daysRemaining,
      customerId: c.CustomerId,
      contractIds: [c.Id],
      contractNumbers: [c.ContractNumber],
      masterHdtd: getMasterHdtdNumber(c),
    });
  }

  const groups = new Map<string, LoanContract[]>();
  for (const c of active) {
    if (!disbursementOf(c)) continue;
    const key = `${c.CustomerId}::${getMasterHdtdNumber(c) || c.ContractNumber}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  for (const [groupKey, group] of groups) {
    const basisDates = group.map(disbursementOf).filter(Boolean) as string[];
    const basis = basisDates.sort((a, b) => a.localeCompare(b))[0];

    const endDates = group.map(endDateOf).filter(Boolean) as string[];
    const groupEnd = endDates.length > 0
      ? endDates.sort((a, b) => b.localeCompare(a))[0]
      : null;

    const limit = groupEnd && groupEnd < horizonEnd ? groupEnd : horizonEnd;
    const masterHdtd = groupKey.split('::')[1];

    for (let i = 1; i <= 400; i++) {
      const dueDate = addMonthsToDate(basis, i * PERIODIC_CHECK_MONTHS);
      if (!dueDate || dueDate > limit) break;
      const { status, daysRemaining } = statusOf(dueDate, todayStr, dueSoonDays);
      items.push({
        key: `periodic-${groupKey}-${i}`,
        type: 'periodic',
        periodIndex: i,
        dueDate,
        basisDate: basis,
        status,
        daysRemaining,
        customerId: group[0].CustomerId,
        contractIds: group.map(c => c.Id),
        contractNumbers: group.map(c => c.ContractNumber),
        masterHdtd,
      });
    }
  }

  const linkedCollateralIds = new Set<number>();
  for (const c of active) {
    for (const id of parseCollateralIds(c)) linkedCollateralIds.add(id);
  }

  for (const col of collaterals) {
    if (!linkedCollateralIds.has(col.Id)) continue;
    const basis = col.AppraisalDate && parseDateParts(col.AppraisalDate) ? col.AppraisalDate : null;
    if (!basis) continue;

    const relatedContracts = active.filter(c => parseCollateralIds(c).includes(col.Id));

    for (let i = 1; i <= 200; i++) {
      const dueDate = addMonthsToDate(basis, i * collateralIntervalMonths);
      if (!dueDate || dueDate > horizonEnd) break;
      const { status, daysRemaining } = statusOf(dueDate, todayStr, dueSoonDays);
      items.push({
        key: `collateral-${col.Id}-${i}`,
        type: 'collateral',
        periodIndex: i,
        dueDate,
        basisDate: basis,
        status,
        daysRemaining,
        customerId: col.CustomerId,
        contractIds: relatedContracts.map(c => c.Id),
        contractNumbers: relatedContracts.map(c => c.ContractNumber),
        collateralId: col.Id,
        assetCode: col.AssetCode ?? `#${col.Id}`,
      });
    }
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
}

export interface ControlSummary {
  overdue: number;
  dueSoon: number;
  upcoming: number;
  total: number;
}

export function summarizeControls(items: ControlItem[]): ControlSummary {
  const s: ControlSummary = { overdue: 0, dueSoon: 0, upcoming: 0, total: items.length };
  for (const it of items) {
    if (it.status === 'overdue') s.overdue++;
    else if (it.status === 'due_soon') s.dueSoon++;
    else s.upcoming++;
  }
  return s;
}

export function overdueDaysOf(item: ControlItem): number {
  return item.status === 'overdue' ? Math.abs(item.daysRemaining) : 0;
}

export function daysFromBasis(item: ControlItem): number {
  return getDaysBetween(item.basisDate, item.dueDate);
}
