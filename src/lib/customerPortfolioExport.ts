import type { Customer, LoanContract, CreditContract, Collateral, PledgeBundle } from '../types';
import { pledgePortfolioRows } from './pledgePortfolio';
import { fmtDate, todayIso } from './utils';
import { kunnPrincipal, outstandingOf } from './loanMath';
import { getEffectiveActiveRate } from './rateResolution';
import { appraisalExpiryDate } from './collateralMath';
import { isKunnOfClosedHdtd, resolveMasterHdtdNumber } from './creditContract';
import { archivedCustomerIdSet, filterActiveCustomers, isCustomerArchived } from './customerStatus';
import { diffDays } from './calcMath';
import type { DuePeriodRow } from './duePeriod';
import { groupPeriodsByContract, kunnDebtGroup } from './reports/debtGroup';

export interface CustomerPortfolioExportParams {
  customers: Customer[];
  contracts: LoanContract[];
  creditContracts: CreditContract[];
  collaterals: Collateral[];
  paidPrincipalMap?: Record<number, number>;
  todayStr?: string;
  pledge?: PledgeBundle;
  periods?: DuePeriodRow[];
}

export interface PortfolioKunnRowData {
  customer: Customer;
  kunn: LoanContract;
  creditContract: CreditContract | null;
  matchedCollaterals: Collateral[];
  masterHdtdNumber: string;
  grantedLimit: number;
  principalAmount: number;
  currentBalance: number;
  interestRatePercent: number;
  disbursementDate: string;
  kunnTenor: string;
  kunnDueDate: string;
  hdtdStartDate: string;
  hdtdTenor: string;
  hdtdEndDate: string;
  debtGroup: number;
}

/**
 * Kiểm tra KUNN có đang lưu nợ hay không (loại bỏ hoàn toàn khoản vay đã tất toán hoặc dư nợ 0)
 */
export function isKunnActiveDebt(
  k: LoanContract,
  paidPrincipalMap?: Record<number, number>
): boolean {
  if (k.IsSettled === true) return false;
  const paid = paidPrincipalMap?.[k.Id];
  const balance = paid !== undefined ? outstandingOf(k, paid) : (k.CurrentBalance ?? kunnPrincipal(k));
  return balance > 0;
}

/**
 * Tìm HĐTD gốc tương ứng với KUNN
 */
export function findMatchedCreditContract(
  kunn: LoanContract,
  creditContracts: CreditContract[]
): CreditContract | null {
  if (kunn.CreditContractId) {
    const byId = creditContracts.find(cc => cc.Id === kunn.CreditContractId);
    if (byId) return byId;
  }
  const masterNo = resolveMasterHdtdNumber(kunn, creditContracts);
  if (masterNo) {
    const byNo = creditContracts.find(
      cc => cc.HdtdNumber.trim() === masterNo.trim() && cc.CustomerId === kunn.CustomerId
    );
    if (byNo) return byNo;
  }
  return null;
}

/**
 * Tìm TSBĐ thế chấp cho KUNN / HĐTD
 */
export function findMatchedCollaterals(
  kunn: LoanContract,
  creditContract: CreditContract | null,
  allCollaterals: Collateral[]
): Collateral[] {
  const customerCollaterals = allCollaterals.filter(c => c.CustomerId === kunn.CustomerId);
  if (customerCollaterals.length === 0) return [];

  // 1. Kiểm tra CollateralIds trên HĐTD
  const ccIds = (creditContract?.CollateralIds || '')
    .split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x > 0);
  if (ccIds.length > 0) {
    const matched = customerCollaterals.filter(c => ccIds.includes(c.Id));
    if (matched.length > 0) return matched;
  }

  // 2. Kiểm tra CollateralId / CollateralIds trên KUNN
  const kunnIds = (kunn.CollateralIds || '')
    .split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x > 0);
  if (kunn.CollateralId) kunnIds.push(kunn.CollateralId);

  if (kunnIds.length > 0) {
    const matched = customerCollaterals.filter(c => kunnIds.includes(c.Id));
    if (matched.length > 0) return matched;
  }

  // 3. Mặc định lấy toàn bộ TSBĐ của khách hàng đó
  return customerCollaterals;
}

/**
 * Lọc và tổng hợp danh sách các khách hàng đang có dư nợ (loại trừ đã tất toán)
 */
export function buildActivePortfolioData({
  customers,
  contracts,
  creditContracts,
  collaterals,
  paidPrincipalMap,
  pledge,
  periods = [],
  todayStr,
}: CustomerPortfolioExportParams): PortfolioKunnRowData[] {
  const result: PortfolioKunnRowData[] = [];
  const today = todayStr || todayIso();
  const periodsMap = groupPeriodsByContract(periods);
  const archivedIds = archivedCustomerIdSet(customers);
  const activeCustomers = filterActiveCustomers(customers);
  const customerMap = new Map<number, Customer>(activeCustomers.map(c => [c.Id, c]));

  // Lọc toàn bộ KUNN đang lưu nợ (trừ đã tất toán, HĐTD đã đóng, hoặc KH đã lưu trữ)
  const activeKunns = contracts.filter(
    k =>
      !archivedIds.has(k.CustomerId) &&
      !isCustomerArchived(k.customer) &&
      !isKunnOfClosedHdtd(k, creditContracts) &&
      isKunnActiveDebt(k, paidPrincipalMap)
  );

  for (const k of activeKunns) {
    const customer = customerMap.get(k.CustomerId);
    if (!customer) continue;

    const cc = findMatchedCreditContract(k, creditContracts);
    const matchedCols = findMatchedCollaterals(k, cc, collaterals);

    const masterHdtdNumber = cc?.HdtdNumber || resolveMasterHdtdNumber(k, creditContracts) || '—';
    const grantedLimit = cc?.ContractAmount ?? k.CreditLimitAmount ?? k.ContractAmount ?? kunnPrincipal(k);
    const principalAmount = kunnPrincipal(k);
    const paid = paidPrincipalMap?.[k.Id];
    const currentBalance = paid !== undefined ? outstandingOf(k, paid) : (k.CurrentBalance ?? principalAmount);
    const interestRatePercent = Number((getEffectiveActiveRate(k) * 100).toFixed(2));

    const disbursementDate = k.DisbursementDate || k.ContractStartDate || '—';
    const kunnTenor = k.KunnTenor || (k.LoanTenorMonths ? `${k.LoanTenorMonths} tháng` : '—');
    const kunnDueDate = k.KunnDueDate || k.ContractEndDate || '—';

    const hdtdStartDate = cc?.ContractStartDate || '—';
    const hdtdTenor = cc?.LoanTenorMonths ? `${cc.LoanTenorMonths} tháng` : '—';
    const hdtdEndDate = cc?.ContractEndDate || '—';

    result.push({
      customer,
      kunn: k,
      creditContract: cc,
      matchedCollaterals: matchedCols,
      masterHdtdNumber,
      grantedLimit,
      principalAmount,
      currentBalance,
      interestRatePercent,
      disbursementDate,
      kunnTenor,
      kunnDueDate,
      hdtdStartDate,
      hdtdTenor,
      hdtdEndDate,
      debtGroup: kunnDebtGroup(k, periodsMap.get(k.Id) ?? [], today),
    });
  }

  if (pledge) result.push(...pledgePortfolioRows(pledge, activeCustomers, today));

  // Sắp xếp theo tên khách hàng rồi đến số KUNN
  result.sort((a, b) => {
    const cmpName = a.customer.FullName.localeCompare(b.customer.FullName, 'vi');
    if (cmpName !== 0) return cmpName;
    return a.kunn.ContractNumber.localeCompare(b.kunn.ContractNumber, 'vi');
  });

  return result;
}

/**
 * Tính toán chuỗi hiển thị số ngày còn lại của định giá TSBĐ
 */
export function formatAppraisalDaysRemaining(
  col: Collateral,
  today: string
): { expiryDate: string; daysRemainingLabel: string } {
  const expiry = appraisalExpiryDate(col);
  if (!expiry) {
    return { expiryDate: '—', daysRemainingLabel: 'Chưa có ngày ĐG' };
  }

  const days = diffDays(today, expiry);
  if (expiry < today) {
    const overdueDays = Math.abs(diffDays(expiry, today));
    return {
      expiryDate: fmtDate(expiry),
      daysRemainingLabel: `Quá hạn ${overdueDays} ngày`,
    };
  }

  return {
    expiryDate: fmtDate(expiry),
    daysRemainingLabel: `Còn ${days} ngày`,
  };
}

