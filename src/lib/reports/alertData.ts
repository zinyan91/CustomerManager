import type { Collateral, CreditContract, Customer, LoanContract } from '../../types';
import { contractDueState, type DuePeriodRow } from '../duePeriod';
import { filterByDue, type DueFilter } from '../dueList';
import { buildHdtdExpiryList } from '../hdtdExpiryAlerts';
import { appraisalExpiryDate } from '../collateralMath';
import { parseCollateralIds } from '../creditLimit';
import { debtGroupFromOverdueDays, outstandingOf } from '../loanMath';
import { daysUntil } from '../utils';

export const ALERT_REPORTS = [
  { id: 'due', label: 'Kỳ due' },
  { id: 'kunn', label: 'KUNN đến hạn' },
  { id: 'credit', label: 'HĐTD đến hạn' },
  { id: 'collateral', label: 'Định giá TSBĐ' },
] as const;
export type AlertReportId = typeof ALERT_REPORTS[number]['id'];

export interface AlertSnapshot {
  customers: Customer[];
  contracts: LoanContract[];
  creditContracts: CreditContract[];
  collaterals: Collateral[];
  periods: DuePeriodRow[];
  paidPrincipalMap: Record<number, number>;
  today: string;
}

export interface AlertFilters {
  onlyGroup1: boolean;
  due: DueFilter;
  search: string;
}

export function selectAlertRows(data: AlertSnapshot, filters: AlertFilters) {
  const customerMap = new Map(data.customers.map(c => [c.Id, c]));
  const periodsMap = new Map<number, DuePeriodRow[]>();
  for (const period of data.periods) {
    const list = periodsMap.get(period.ContractId) ?? [];
    list.push(period);
    periodsMap.set(period.ContractId, list);
  }
  const active = data.contracts.filter(c => !c.IsSettled);
  const eligible = active.filter(c => {
    if (!filters.onlyGroup1) return true;
    const overdue = Math.max(0, ...(periodsMap.get(c.Id) ?? [])
      .filter(p => !p.IsPaid).map(p => -(daysUntil(p.DueDate, data.today) ?? 0)));
    return Math.max(c.DebtGroup ?? 1, debtGroupFromOverdueDays(overdue)) === 1;
  });
  const search = filters.search.trim().toLocaleLowerCase('vi');
  const matches = (customer: Customer | undefined, ...values: (string | null | undefined)[]) =>
    !search || [customer?.FullName, customer?.CifKh, ...values]
      .some(value => value?.toLocaleLowerCase('vi').includes(search));

  const due = eligible.map(contract => ({
    contract, customer: customerMap.get(contract.CustomerId),
    state: contractDueState(periodsMap.get(contract.Id) ?? [], data.today),
  })).filter(item => item.state.kind !== 'none')
    .sort((a,b) => (a.state.daysLeft ?? 0) - (b.state.daysLeft ?? 0));
  const hasOutstanding = (contract: LoanContract) => outstandingOf(contract, data.paidPrincipalMap[contract.Id]) > 0;
  const outstandingEligible = eligible.filter(hasOutstanding);
  const kunn = outstandingEligible.map(contract => ({
    contract, customer: customerMap.get(contract.CustomerId),
    daysLeft: daysUntil(contract.KunnDueDate, data.today),
  })).filter(item => item.daysLeft !== null && item.daysLeft <= 10)
    .sort((a,b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const credit = buildHdtdExpiryList(outstandingEligible, data.creditContracts, data.today)
    .map(item => ({ ...item, customer: customerMap.get(item.contract.CustomerId) }));
  const usedCollateralIds = new Set(active.filter(hasOutstanding).flatMap(parseCollateralIds));
  const collateral = data.collaterals.filter(c => usedCollateralIds.has(c.Id)).map(collateral => {
    const expiryDateStr = appraisalExpiryDate(collateral);
    return { collateral, customer: customerMap.get(collateral.CustomerId), expiryDateStr,
      daysLeft: daysUntil(expiryDateStr, data.today) };
  }).filter(item => item.expiryDateStr && item.daysLeft !== null && item.daysLeft <= 30)
    .sort((a,b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  return {
    due: filterByDue(due, filters.due, r => r.state.daysLeft).filter(r => matches(r.customer,r.contract.ContractNumber)),
    kunn: filterByDue(kunn, filters.due, r => r.daysLeft).filter(r => matches(r.customer,r.contract.ContractNumber)),
    credit: filterByDue(credit, filters.due, r => r.daysLeft).filter(r => matches(r.customer,r.masterNo)),
    collateral: filterByDue(collateral, filters.due, r => r.daysLeft)
      .filter(r => matches(r.customer,r.collateral.AssetCode,r.collateral.Address)),
  };
}

export type AlertRows = ReturnType<typeof selectAlertRows>;
