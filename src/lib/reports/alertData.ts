import type { Collateral, CreditContract, Customer, LoanContract, PledgeBundle } from '../../types';
import { contractDueState, type DuePeriodRow } from '../duePeriod';
import { filterByDue, type DueFilter } from '../dueList';
import { buildHdtdExpiryList } from '../hdtdExpiryAlerts';
import { appraisalExpiryDate } from '../collateralMath';
import { parseCollateralIds } from '../creditLimit';
import { outstandingOf } from '../loanMath';
import { daysUntil } from '../utils';
import { openLoans, pledgeLoanAsKunn } from '../pledgePortfolio';
import { outstandingPrincipal } from '../pledgeLoanMath';
import { pledgeLoanDebtGroup } from '../pledgeLoan';
import { archivedCustomerIdSet, filterActiveCustomers, isCustomerArchived } from '../customerStatus';
import { groupPeriodsByContract, kunnDebtGroup } from './debtGroup';

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
  pledge?: PledgeBundle;
}

export interface AlertFilters {
  onlyGroup1: boolean;
  due: DueFilter;
  search: string;
}

export function selectAlertRows(data: AlertSnapshot, filters: AlertFilters) {
  const archivedIds = archivedCustomerIdSet(data.customers);
  const activeCustomers = filterActiveCustomers(data.customers);
  const customerMap = new Map(activeCustomers.map(c => [c.Id, c]));
  const isActiveRecord = <T extends { CustomerId: number; customer?: Customer }>(item: T) =>
    !archivedIds.has(item.CustomerId) && !isCustomerArchived(item.customer);

  const periodsMap = groupPeriodsByContract(data.periods);
  const active = data.contracts.filter(c => !c.IsSettled && isActiveRecord(c));
  const activeCreditContracts = data.creditContracts.filter(isActiveRecord);
  const activeCollaterals = data.collaterals.filter(isActiveRecord);
  const eligible = active.filter(c =>
    !filters.onlyGroup1 || kunnDebtGroup(c, periodsMap.get(c.Id) ?? [], data.today) === 1);
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
  }));
  const pledge = data.pledge;
  const pledgeKunn = pledge
    ? openLoans(pledge)
        .filter(l => !archivedIds.has(l.CustomerId))
        .filter(l => !filters.onlyGroup1 || pledgeLoanDebtGroup(l, pledge.repayments, data.today) === 1)
        .map(l => ({
          contract: pledgeLoanAsKunn(l, outstandingPrincipal(l, pledge.repayments)),
          customer: customerMap.get(l.CustomerId),
          daysLeft: daysUntil(l.DueDate, data.today),
        }))
    : [];
  const kunnDue = [...kunn, ...pledgeKunn].filter(item => item.daysLeft !== null && item.daysLeft <= 10)
    .sort((a,b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const credit = buildHdtdExpiryList(outstandingEligible, activeCreditContracts, data.today)
    .map(item => ({ ...item, customer: customerMap.get(item.contract.CustomerId) }));
  const creditById = new Map(activeCreditContracts.map(cc => [cc.Id, cc]));
  const usedCollateralIds = new Set(
    active.filter(hasOutstanding).flatMap(c => {
      const parent = c.CreditContractId ? creditById.get(c.CreditContractId) : undefined;
      return parent ? [...parseCollateralIds(c), ...parseCollateralIds(parent)] : parseCollateralIds(c);
    })
  );
  const collateral = activeCollaterals.filter(c => usedCollateralIds.has(c.Id)).map(collateral => {
    const expiryDateStr = appraisalExpiryDate(collateral);
    return { collateral, customer: customerMap.get(collateral.CustomerId), expiryDateStr,
      daysLeft: daysUntil(expiryDateStr, data.today) };
  }).filter(item => item.expiryDateStr && item.daysLeft !== null && item.daysLeft <= 30)
    .sort((a,b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  return {
    due: filterByDue(due, filters.due, r => r.state.daysLeft).filter(r => matches(r.customer,r.contract.ContractNumber)),
    kunn: filterByDue(kunnDue, filters.due, r => r.daysLeft).filter(r => matches(r.customer,r.contract.ContractNumber)),
    credit: filterByDue(credit, filters.due, r => r.daysLeft).filter(r => matches(r.customer,r.masterNo)),
    collateral: filterByDue(collateral, filters.due, r => r.daysLeft)
      .filter(r => matches(r.customer,r.collateral.AssetCode,r.collateral.Address)),
  };
}

export type AlertRows = ReturnType<typeof selectAlertRows>;
