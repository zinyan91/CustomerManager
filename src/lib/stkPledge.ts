import { edate, diffDays } from './calcMath';

export type TenorUnit = 'thang' | 'nam' | 'tuan' | 'ngay';

export const TENOR_UNIT_LABELS: Record<TenorUnit, string> = {
  thang: 'Tháng',
  nam: 'Năm',
  tuan: 'Tuần',
  ngay: 'Ngày',
};

function isNum(v?: number | null): v is number {
  return v !== null && v !== undefined && !isNaN(v);
}

export function addTenor(startDate: string, tenor: number, unit: TenorUnit): string {
  if (!startDate || !isNum(tenor) || tenor <= 0) return '';
  if (unit === 'thang') return edate(startDate, Math.trunc(tenor));
  if (unit === 'nam') return edate(startDate, Math.trunc(tenor) * 12);

  const days = unit === 'tuan' ? Math.trunc(tenor) * 7 : Math.trunc(tenor);
  const parts = startDate.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10) + days
  );
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function accruedInterest(
  principal: number,
  rateAnnual: number,
  days: number
): number {
  if (!isNum(principal) || !isNum(rateAnnual) || !isNum(days)) return 0;
  if (principal <= 0 || days <= 0) return 0;
  return Math.round(principal * rateAnnual * (days / 365));
}

export type PledgeDepositType = 'tg_vnd' | 'tg_foreign' | 'cctg';
export type DepositInterestPaymentMethod = 'end_term' | 'periodic' | 'upfront';

export const PLEDGE_DEPOSIT_TYPE_LABELS: Record<PledgeDepositType, string> = {
  tg_vnd: 'Tiền gửi (TG) VND',
  tg_foreign: 'Tiền gửi Ngoại tệ',
  cctg: 'Chứng chỉ tiền gửi (CCTG)',
};

export const INTEREST_PAYMENT_METHOD_LABELS: Record<DepositInterestPaymentMethod, string> = {
  end_term: 'Lãnh lãi cuối kỳ',
  periodic: 'Lãnh lãi định kỳ',
  upfront: 'Lãnh lãi trước',
};

export const DEFAULT_NON_TERM_RATE_ANNUAL = 0.002; // 0.20% / năm

export interface StkLoanItemInput {
  id?: string;
  name?: string;
  loanAmount: number;
  loanRateAnnual: number;
  disbursementDate: string;
  loanDueDate?: string;
}

export interface StkLoanItemResult {
  id: string;
  name: string;
  loanAmount: number;
  loanRateAnnual: number;
  disbursementDate: string;
  loanDueDate: string;
  loanDays: number;
  loanInterest: number;
  totalObligation: number;
}

export interface StkPledgeInput {
  savingsAmount: number;
  pledgeRatio?: number;
  customLoanAmount?: number;
  depositDate: string;
  tenor: number;
  tenorUnit: TenorUnit;
  savingsRateAnnual: number;
  loanRateAnnual?: number;
  disbursementDate?: string;
  loanDueDate?: string;

  // Danh sách nhiều khoản vay cầm cố
  loans?: StkLoanItemInput[];

  // Compliance & Collateral fields
  depositType?: PledgeDepositType;
  interestPaymentMethod?: DepositInterestPaymentMethod;
  currency?: string;
  exchangeRate?: number;
  paidInterest?: number;
  clawbackAmount?: number;
  nonTermRateAnnual?: number;
  customLtvPercent?: number;
}

export interface StkPledgeResult {
  loanAmount: number;
  savingsDueDate: string;
  savingsDays: number;
  savingsInterest: number;
  savingsTotal: number;
  savingsNetReceived: number;
  loanDueDate: string;
  loanDays: number;
  loanInterest: number;
  netGain: number;
  totalRepayment: number;

  // Danh sách các khoản vay chi tiết
  loanItems: StkLoanItemResult[];

  // Audit details
  depositType: PledgeDepositType;
  interestPaymentMethod: DepositInterestPaymentMethod;
  currency: string;
  exchangeRate: number;
  savingsPrincipalVnd: number;
  isSameMaturity: boolean;
  appliedSavingsRate: number;
  savingsProjectedDays: number;
  savingsProjectedInterest: number;
  paidInterest: number;
  clawbackAmount: number;
  ltvPercent: number;
  maxPrincipalCap: number;
  maxRecoveryBound: number;
  maxLoanFromSafeRecovery: number;
  maxAllowableLoan: number;
  totalObligation: number;
  isValidLoan: boolean;
  exceedsPrincipalCap: boolean;
  exceedsRecoveryBound: boolean;
  remainingLoanCapacity: number;
  formulaDescription: string;
}

export function calcStkPledge(input: StkPledgeInput): StkPledgeResult {
  const depositType: PledgeDepositType = input.depositType || 'tg_vnd';
  const interestPaymentMethod: DepositInterestPaymentMethod = input.interestPaymentMethod || 'end_term';
  const currency = (input.currency || (depositType === 'tg_foreign' ? 'USD' : 'VND')).toUpperCase();
  const exchangeRate = depositType === 'tg_foreign' && isNum(input.exchangeRate) && input.exchangeRate > 0
    ? input.exchangeRate
    : 1;

  const rawSavingsAmount = isNum(input.savingsAmount) ? Math.max(0, input.savingsAmount) : 0;
  const savingsPrincipalVnd = Math.round(rawSavingsAmount * exchangeRate);

  const defaultLtv = depositType === 'tg_foreign' ? 90 : 100;
  const ltvPercent = isNum(input.customLtvPercent) ? Math.max(0, input.customLtvPercent) : defaultLtv;
  const maxPrincipalCap = Math.round(savingsPrincipalVnd * (ltvPercent / 100));

  const savingsDueDate = addTenor(input.depositDate, input.tenor, input.tenorUnit);
  const savingsDays = savingsDueDate ? diffDays(input.depositDate, savingsDueDate) : 0;

  const defaultLoanDisbDate = input.disbursementDate || input.depositDate;
  const defaultLoanDueDate = input.loanDueDate || savingsDueDate;
  const defaultLoanDays = defaultLoanDueDate ? diffDays(defaultLoanDisbDate, defaultLoanDueDate) : 0;

  const isSameMaturity = Boolean(savingsDueDate && defaultLoanDueDate && savingsDueDate === defaultLoanDueDate);
  const regularSavingsRate = isNum(input.savingsRateAnnual) ? input.savingsRateAnnual : 0;
  const nonTermRate = isNum(input.nonTermRateAnnual) ? input.nonTermRateAnnual : DEFAULT_NON_TERM_RATE_ANNUAL;

  const appliedSavingsRate = isSameMaturity ? regularSavingsRate : nonTermRate;
  const savingsProjectedDays = isSameMaturity
    ? savingsDays
    : (defaultLoanDueDate && input.depositDate ? Math.max(0, diffDays(input.depositDate, defaultLoanDueDate)) : 0);

  const savingsProjectedInterest = accruedInterest(
    savingsPrincipalVnd,
    appliedSavingsRate,
    savingsProjectedDays
  );

  const regularFullSavingsInterest = accruedInterest(
    savingsPrincipalVnd,
    regularSavingsRate,
    savingsDays
  );

  const paidInterest = isNum(input.paidInterest) ? Math.max(0, input.paidInterest) : 0;
  const clawbackAmount = isNum(input.clawbackAmount) ? Math.max(0, input.clawbackAmount) : 0;

  let maxRecoveryBound = savingsPrincipalVnd;
  let formulaDescription = '';

  if (depositType === 'tg_foreign') {
    maxRecoveryBound = savingsPrincipalVnd;
    formulaDescription = `Số tiền cho vay (VND) + Lãi vay phát sinh (VND) ≤ Gốc TG quy đổi (${currency} → VND)`;
  } else if (depositType === 'cctg') {
    if (interestPaymentMethod === 'end_term') {
      maxRecoveryBound = savingsPrincipalVnd + savingsProjectedInterest - clawbackAmount;
      formulaDescription = 'Số tiền cho vay + Lãi vay ≤ Gốc CCTG + Lãi gửi dự kiến - Khoản phải thu hồi';
    } else {
      maxRecoveryBound = savingsPrincipalVnd - paidInterest - savingsProjectedInterest - clawbackAmount;
      formulaDescription = 'Số tiền cho vay + Lãi vay ≤ Gốc CCTG - Lãi CCTG đã chi - Lãi gửi dự kiến - Khoản phải thu hồi';
    }
  } else {
    // tg_vnd
    if (interestPaymentMethod === 'end_term') {
      maxRecoveryBound = savingsPrincipalVnd + savingsProjectedInterest - clawbackAmount;
      formulaDescription = 'Số tiền cho vay + Lãi vay ≤ Gốc TG + Lãi gửi dự kiến - Khoản phải thu hồi';
    } else {
      maxRecoveryBound = savingsPrincipalVnd - paidInterest - savingsProjectedInterest - clawbackAmount;
      formulaDescription = 'Số tiền cho vay + Lãi vay ≤ Gốc TG - Lãi gửi đã chi - Lãi gửi dự kiến - Khoản phải thu hồi';
    }
  }

  const defaultLoanRateAnnual = isNum(input.loanRateAnnual) ? input.loanRateAnnual : 0;
  const loanFactor = 1 + (defaultLoanRateAnnual * defaultLoanDays / 365);
  const maxLoanFromSafeRecovery = loanFactor > 0
    ? Math.max(0, Math.floor(maxRecoveryBound / loanFactor))
    : Math.max(0, maxRecoveryBound);

  const maxAllowableLoan = Math.max(0, Math.min(maxPrincipalCap, maxLoanFromSafeRecovery));

  // Multi-loans processing
  const loanItems: StkLoanItemResult[] = [];
  if (input.loans && input.loans.length > 0) {
    input.loans.forEach((l, idx) => {
      const id = l.id || `loan-${idx + 1}`;
      const name = l.name || `Khoản vay ${idx + 1}`;
      const itemAmount = isNum(l.loanAmount) ? Math.max(0, Math.round(l.loanAmount)) : 0;
      const itemRate = isNum(l.loanRateAnnual) ? l.loanRateAnnual : defaultLoanRateAnnual;
      const itemDisb = l.disbursementDate || defaultLoanDisbDate;
      const itemDue = l.loanDueDate || savingsDueDate;
      const itemDays = itemDue ? Math.max(0, diffDays(itemDisb, itemDue)) : 0;
      const itemInterest = accruedInterest(itemAmount, itemRate, itemDays);
      const itemTotal = itemAmount + itemInterest;

      loanItems.push({
        id,
        name,
        loanAmount: itemAmount,
        loanRateAnnual: itemRate,
        disbursementDate: itemDisb,
        loanDueDate: itemDue,
        loanDays: itemDays,
        loanInterest: itemInterest,
        totalObligation: itemTotal,
      });
    });
  } else {
    let singleLoanAmount = 0;
    if (isNum(input.customLoanAmount)) {
      singleLoanAmount = Math.max(0, Math.round(input.customLoanAmount));
    } else if (isNum(input.pledgeRatio)) {
      singleLoanAmount = Math.round(savingsPrincipalVnd * Math.max(0, input.pledgeRatio));
    } else {
      singleLoanAmount = maxAllowableLoan;
    }
    const singleLoanInterest = accruedInterest(singleLoanAmount, defaultLoanRateAnnual, defaultLoanDays);
    loanItems.push({
      id: 'loan-1',
      name: 'Khoản vay 1',
      loanAmount: singleLoanAmount,
      loanRateAnnual: defaultLoanRateAnnual,
      disbursementDate: defaultLoanDisbDate,
      loanDueDate: defaultLoanDueDate,
      loanDays: defaultLoanDays,
      loanInterest: singleLoanInterest,
      totalObligation: singleLoanAmount + singleLoanInterest,
    });
  }

  const totalLoanAmount = loanItems.reduce((sum, item) => sum + item.loanAmount, 0);
  const totalLoanInterest = loanItems.reduce((sum, item) => sum + item.loanInterest, 0);
  const totalObligation = totalLoanAmount + totalLoanInterest;

  const exceedsPrincipalCap = totalLoanAmount > maxPrincipalCap;
  const exceedsRecoveryBound = totalObligation > maxRecoveryBound;
  const isValidLoan = !exceedsPrincipalCap && !exceedsRecoveryBound && totalLoanAmount > 0;
  const remainingLoanCapacity = Math.max(0, maxPrincipalCap - totalLoanAmount);

  const actualSavingsInterestToEarn = isSameMaturity ? regularFullSavingsInterest : savingsProjectedInterest;
  const savingsNetReceived = Math.max(0, savingsPrincipalVnd + actualSavingsInterestToEarn - paidInterest - clawbackAmount);

  return {
    loanAmount: totalLoanAmount,
    savingsDueDate,
    savingsDays,
    savingsInterest: actualSavingsInterestToEarn,
    savingsTotal: savingsPrincipalVnd + actualSavingsInterestToEarn,
    savingsNetReceived,
    loanDueDate: defaultLoanDueDate,
    loanDays: defaultLoanDays,
    loanInterest: totalLoanInterest,
    netGain: actualSavingsInterestToEarn - totalLoanInterest,
    totalRepayment: totalObligation,

    loanItems,

    depositType,
    interestPaymentMethod,
    currency,
    exchangeRate,
    savingsPrincipalVnd,
    isSameMaturity,
    appliedSavingsRate,
    savingsProjectedDays,
    savingsProjectedInterest,
    paidInterest,
    clawbackAmount,
    ltvPercent,
    maxPrincipalCap,
    maxRecoveryBound,
    maxLoanFromSafeRecovery,
    maxAllowableLoan,
    totalObligation,
    isValidLoan,
    exceedsPrincipalCap,
    exceedsRecoveryBound,
    remainingLoanCapacity,
    formulaDescription,
  };
}

export interface StkCycleInput {
  tenor: number;
  tenorUnit: TenorUnit;
  savingsRateAnnual: number;
  pledgeRatio: number;
}

export interface StkCycleRow {
  index: number;
  openingPrincipal: number;
  depositDate: string;
  tenor: number;
  tenorUnit: TenorUnit;
  dueDate: string;
  savingsRateAnnual: number;
  days: number;
  interest: number;
  closingBalance: number;
  pledgeRatio: number;
  pledgeCapacity: number;
}

export interface StkRolloverInput {
  loanAmount: number;
  loanRateAnnual: number;
  disbursementDate: string;
  loanDueDate: string;
  initialSavingsAmount: number;
  firstDepositDate: string;
  cycles: StkCycleInput[];
}

export interface StkRolloverResult {
  rows: StkCycleRow[];
  loanDays: number;
  loanInterest: number;
  totalSavingsInterest: number;
  finalBalance: number;
  netGain: number;
  totalRepayment: number;
}

export function buildStkRollover(input: StkRolloverInput): StkRolloverResult {
  const loanAmount = isNum(input.loanAmount) ? Math.max(0, input.loanAmount) : 0;
  const loanDays = diffDays(input.disbursementDate, input.loanDueDate);
  const loanInterest = accruedInterest(
    loanAmount,
    isNum(input.loanRateAnnual) ? input.loanRateAnnual : 0,
    loanDays
  );

  const rows: StkCycleRow[] = [];
  let principal = isNum(input.initialSavingsAmount) ? Math.max(0, input.initialSavingsAmount) : 0;
  let depositDate = input.firstDepositDate;

  for (let i = 0; i < (input.cycles || []).length; i++) {
    const cycle = input.cycles[i];
    const dueDate = addTenor(depositDate, cycle.tenor, cycle.tenorUnit);
    const days = dueDate ? diffDays(depositDate, dueDate) : 0;
    const rate = isNum(cycle.savingsRateAnnual) ? cycle.savingsRateAnnual : 0;
    const interest = accruedInterest(principal, rate, days);
    const closingBalance = principal + interest;
    const ratio = isNum(cycle.pledgeRatio) ? Math.max(0, cycle.pledgeRatio) : 0;

    rows.push({
      index: i + 1,
      openingPrincipal: principal,
      depositDate,
      tenor: cycle.tenor,
      tenorUnit: cycle.tenorUnit,
      dueDate,
      savingsRateAnnual: rate,
      days,
      interest,
      closingBalance,
      pledgeRatio: ratio,
      pledgeCapacity: Math.round(closingBalance * ratio),
    });

    principal = closingBalance;
    depositDate = dueDate;
  }

  const totalSavingsInterest = rows.reduce((sum, r) => sum + r.interest, 0);
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].closingBalance : principal;

  return {
    rows,
    loanDays,
    loanInterest,
    totalSavingsInterest,
    finalBalance,
    netGain: totalSavingsInterest - loanInterest,
    totalRepayment: loanAmount + loanInterest,
  };
}

export const DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5;
export const DEFAULT_INTEREST_PENALTY_RATE = 0.10;

export interface OverduePenaltyInput {
  overduePrincipal: number;
  normalRateAnnual: number;
  principalOverdueDays: number;
  unpaidInterest: number;
  interestPenaltyRateAnnual?: number | null;
  interestOverdueDays: number;
  principalPenaltyMultiplier?: number | null;
}

export interface OverduePenaltyResult {
  principalPenaltyRate: number;
  principalPenalty: number;
  interestPenaltyRate: number;
  interestPenalty: number;
  totalDue: number;
}

export function calcOverduePenalty(input: OverduePenaltyInput): OverduePenaltyResult {
  const overduePrincipal = isNum(input.overduePrincipal) ? Math.max(0, input.overduePrincipal) : 0;
  const normalRate = isNum(input.normalRateAnnual) ? input.normalRateAnnual : 0;
  const multiplier = isNum(input.principalPenaltyMultiplier)
    ? input.principalPenaltyMultiplier
    : DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER;
  const unpaidInterest = isNum(input.unpaidInterest) ? Math.max(0, input.unpaidInterest) : 0;
  const interestPenaltyRate = isNum(input.interestPenaltyRateAnnual)
    ? input.interestPenaltyRateAnnual
    : DEFAULT_INTEREST_PENALTY_RATE;

  const principalPenaltyRate = normalRate * multiplier;
  const principalPenalty = accruedInterest(
    overduePrincipal, principalPenaltyRate, input.principalOverdueDays
  );
  const interestPenalty = accruedInterest(
    unpaidInterest, interestPenaltyRate, input.interestOverdueDays
  );

  return {
    principalPenaltyRate,
    principalPenalty,
    interestPenaltyRate,
    interestPenalty,
    totalDue: overduePrincipal + unpaidInterest + principalPenalty + interestPenalty,
  };
}
