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

export interface StkPledgeInput {
  savingsAmount: number;
  pledgeRatio: number;
  depositDate: string;
  tenor: number;
  tenorUnit: TenorUnit;
  savingsRateAnnual: number;
  loanRateAnnual: number;
  disbursementDate: string;
  loanDueDate?: string;
}

export interface StkPledgeResult {
  loanAmount: number;
  savingsDueDate: string;
  savingsDays: number;
  savingsInterest: number;
  savingsTotal: number;
  loanDueDate: string;
  loanDays: number;
  loanInterest: number;
  netGain: number;
  totalRepayment: number;
}

export function calcStkPledge(input: StkPledgeInput): StkPledgeResult {
  const savingsAmount = isNum(input.savingsAmount) ? Math.max(0, input.savingsAmount) : 0;
  const ratio = isNum(input.pledgeRatio) ? Math.max(0, input.pledgeRatio) : 0;
  const loanAmount = Math.round(savingsAmount * ratio);

  const savingsDueDate = addTenor(input.depositDate, input.tenor, input.tenorUnit);
  const savingsDays = savingsDueDate ? diffDays(input.depositDate, savingsDueDate) : 0;
  const savingsInterest = accruedInterest(
    savingsAmount,
    isNum(input.savingsRateAnnual) ? input.savingsRateAnnual : 0,
    savingsDays
  );

  const loanDueDate = input.loanDueDate || savingsDueDate;
  const loanDays = loanDueDate ? diffDays(input.disbursementDate, loanDueDate) : 0;
  const loanInterest = accruedInterest(
    loanAmount,
    isNum(input.loanRateAnnual) ? input.loanRateAnnual : 0,
    loanDays
  );

  return {
    loanAmount,
    savingsDueDate,
    savingsDays,
    savingsInterest,
    savingsTotal: savingsAmount + savingsInterest,
    loanDueDate,
    loanDays,
    loanInterest,
    netGain: savingsInterest - loanInterest,
    totalRepayment: loanAmount + loanInterest,
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
