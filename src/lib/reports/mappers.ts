import type { Collateral, CreditContract, Customer, LoanContract, RepaymentSchedule } from '../../types';
import { isScheduleFullySettled, outstandingOf } from '../loanMath';
import { summarizeCreditContracts, resolveMasterHdtdNumber } from '../creditContract';
import { appraisalExpiryDate, assetClassLabel, collateralValue, getEffectiveLtv, maxLoanFromCollateral } from '../collateralMath';
import type { KunnSheetRow } from './builders/kunnSheet';
import type { DueSheetRow } from './builders/dueSheet';
import type { CreditSheetRow } from './builders/creditSheet';
import type { CollateralSheetRow } from './builders/collateralSheet';

type PaidPrincipalMap = Record<number, number>;

function customerLookup(customers: Customer[]): (id: number) => Customer | undefined {
  const map = new Map(customers.map(c => [c.Id, c]));
  return id => map.get(id);
}

function outstandingFor(k: LoanContract, paid: PaidPrincipalMap): number {
  return outstandingOf(k, paid[k.Id]);
}

function schedulesByContract(schedules: RepaymentSchedule[]): Map<number, RepaymentSchedule[]> {
  const map = new Map<number, RepaymentSchedule[]>();
  for (const s of schedules) {
    const list = map.get(s.ContractId);
    if (list) list.push(s);
    else map.set(s.ContractId, [s]);
  }
  return map;
}

export function mapKunnRows(
  customers: Customer[],
  contracts: LoanContract[],
  outstandingSchedules: RepaymentSchedule[],
  paid: PaidPrincipalMap,
  creditContracts: CreditContract[] = []
): KunnSheetRow[] {
  const khOf = customerLookup(customers);
  const lichOf = schedulesByContract(outstandingSchedules);

  return contracts
    .filter(k => k.IsSettled !== true)
    .map(k => {
      const kh = khOf(k.CustomerId);
      return {
        cif: kh?.CifKh ?? '',
        customerName: kh?.FullName ?? '',
        kunnNumber: k.ContractNumber,
        creditContractNumber: resolveMasterHdtdNumber(k, creditContracts) || null,
        loanMethod: k.LoanMethod ?? null,
        disbursementDate: k.DisbursementDate ?? null,
        kunnDueDate: k.KunnDueDate ?? null,
        loanAmount: k.LoanAmount ?? null,
        outstanding: outstandingFor(k, paid),
        interestRate: k.InterestRate ?? null,
        storedDebtGroup: k.DebtGroup,
        overdueSchedules: lichOf.get(k.Id) ?? [],
      };
    });
}

export function mapDueRows(
  customers: Customer[],
  contracts: LoanContract[],
  outstandingSchedules: RepaymentSchedule[],
  paid: PaidPrincipalMap
): DueSheetRow[] {
  const khOf = customerLookup(customers);
  const khoanOf = new Map(contracts.filter(k => k.IsSettled !== true).map(k => [k.Id, k]));
  const conNo = outstandingSchedules.filter(s => !isScheduleFullySettled(s));
  const lichOf = schedulesByContract(conNo);

  const rows: DueSheetRow[] = [];
  for (const s of conNo) {
    const k = khoanOf.get(s.ContractId);
    if (!k) continue;
    const kh = khOf(k.CustomerId);
    rows.push({
      cif: kh?.CifKh ?? '',
      customerName: kh?.FullName ?? '',
      kunnNumber: k.ContractNumber,
      periodNumber: s.PeriodNumber ?? null,
      dueDate: s.DueDate ?? null,
      principal: s.PrincipalAmount ?? null,
      interest: s.InterestAmount ?? null,
      total: s.TotalAmount ?? null,
      outstanding: outstandingFor(k, paid),
      storedDebtGroup: k.DebtGroup,
      overdueSchedules: lichOf.get(k.Id) ?? [],
    });
  }
  return rows;
}

export function mapCreditRows(
  customers: Customer[],
  creditContracts: CreditContract[],
  contracts: LoanContract[],
  paid: PaidPrincipalMap,
  todayIso: string
): CreditSheetRow[] {
  const khOf = customerLookup(customers);
  const dangMo = creditContracts.filter(c => c.IsClosed !== true);
  const tomTat = summarizeCreditContracts(dangMo, contracts, {
    getOutstanding: k => outstandingFor(k, paid),
    today: todayIso,
  });

  return tomTat.map(t => {
    const c = t.contract;
    const kh = khOf(c.CustomerId);
    return {
      cif: kh?.CifKh ?? '',
      customerName: kh?.FullName ?? '',
      hdtdNumber: c.HdtdNumber,
      approvalCode: c.ApprovalCode ?? null,
      loanMethod: c.LoanMethod ?? null,
      startDate: c.ContractStartDate ?? null,
      endDate: c.ContractEndDate ?? null,
      granted: c.ContractAmount ?? null,
      used: t.revolving ? t.outstanding : t.disbursedCumulative,
      available: t.available,
    };
  });
}

export function mapCollateralRows(customers: Customer[], collaterals: Collateral[]): CollateralSheetRow[] {
  const khOf = customerLookup(customers);

  return collaterals.map(c => {
    const kh = khOf(c.CustomerId);
    return {
      cif: kh?.CifKh ?? '',
      customerName: kh?.FullName ?? '',
      assetCode: c.AssetCode ?? null,
      assetType: c.AssetType ? assetClassLabel(c.AssetType) : null,
      address: c.Address ?? null,
      appraisalDate: c.AppraisalDate ?? null,
      tenorMonths: c.AppraisalTenorMonths ?? null,
      expiryDate: appraisalExpiryDate(c),
      appraisedValue: collateralValue(c),
      ltvPercent: getEffectiveLtv(c),
      maxLoan: maxLoanFromCollateral(c),
    };
  });
}
