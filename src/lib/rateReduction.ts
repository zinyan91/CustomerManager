import { edate, diffDays } from './calcMath';
import { roundPrincipalCore, PRINCIPAL_ROUND_MODE } from './loanMath';
import type { PrincipalRoundMode } from './loanMath';

export interface RateReductionLoanInput {
  balance: number;
  standardRateAnnual: number;
  proposedRateAnnual: number;
  days: number;
  cofAnnual?: number | null;
}

export interface RateReductionLoanResult {
  deltaRateAnnual: number;
  interestReduced: number;
  interestOriginal: number;
  interestFinal: number;
  marginCurrentAnnual: number | null;
  marginProposedAnnual: number | null;
}

function isNum(v?: number | null): v is number {
  return v !== null && v !== undefined && !isNaN(v);
}

export function calcRateReductionForLoan(input: RateReductionLoanInput): RateReductionLoanResult {
  const balance = isNum(input.balance) ? Math.max(0, input.balance) : 0;
  const standard = isNum(input.standardRateAnnual) ? input.standardRateAnnual : 0;
  const proposed = isNum(input.proposedRateAnnual) ? input.proposedRateAnnual : 0;
  const days = isNum(input.days) ? Math.max(0, input.days) : 0;
  const cof = isNum(input.cofAnnual) ? input.cofAnnual : null;

  const deltaRateAnnual = Math.max(0, standard - proposed);
  const dayFactor = days / 365;

  return {
    deltaRateAnnual,
    interestReduced: Math.round(balance * deltaRateAnnual * dayFactor),
    interestOriginal: Math.round(balance * standard * dayFactor),
    interestFinal: Math.round(balance * Math.min(standard, proposed) * dayFactor),
    marginCurrentAnnual: cof === null ? null : standard - cof,
    marginProposedAnnual: cof === null ? null : Math.min(standard, proposed) - cof,
  };
}

export function sumInterestReduced(results: RateReductionLoanResult[]): number {
  if (!results || results.length === 0) return 0;
  return results.reduce((sum, r) => sum + (isNum(r.interestReduced) ? r.interestReduced : 0), 0);
}

export interface RateReductionScheduleInput {
  loanAmount: number;
  tenorMonths: number;
  firstPaymentDate: string;
  preferentialRateAnnual: number;
  preferentialMonths: number;
  postPreferentialRateAnnual: number;
  reductionStartMonth: number;
  reductionMonths: number;
  proposedRateAnnual?: number | null;
  minRateAnnual: number;
  maxReductionAnnual: number;
  roundMode?: PrincipalRoundMode;
}

export interface RateReductionSchedulePeriod {
  month: number;
  paymentDate: string;
  daysInPeriod: number;
  beginningBalance: number;
  principalPayment: number;
  endingBalance: number;
  standardRateAnnual: number;
  reducedRateAnnual: number;
  deltaRateAnnual: number;
  isReduced: boolean;
  interestOriginal: number;
  interestFinal: number;
  interestReduced: number;
}

export function resolveReducedRateAnnual(
  standardRateAnnual: number,
  proposedRateAnnual: number | null | undefined,
  minRateAnnual: number,
  maxReductionAnnual: number
): number {
  const floor = isNum(minRateAnnual) ? minRateAnnual : 0;
  const cap = isNum(maxReductionAnnual) ? Math.max(0, maxReductionAnnual) : 0;

  let candidate = standardRateAnnual - cap;
  if (isNum(proposedRateAnnual) && proposedRateAnnual > 0) {
    candidate = Math.max(candidate, proposedRateAnnual);
  }
  return Math.min(standardRateAnnual, Math.max(floor, candidate));
}

export function buildRateReductionSchedule(
  input: RateReductionScheduleInput
): RateReductionSchedulePeriod[] {
  const loanAmount = isNum(input.loanAmount) ? Math.max(0, input.loanAmount) : 0;
  const tenorMonths = isNum(input.tenorMonths) ? Math.trunc(input.tenorMonths) : 0;
  if (loanAmount <= 0 || tenorMonths <= 0 || !input.firstPaymentDate) return [];

  const prefMonths = isNum(input.preferentialMonths) ? Math.max(0, Math.trunc(input.preferentialMonths)) : 0;
  const prefRate = isNum(input.preferentialRateAnnual) ? input.preferentialRateAnnual : 0;
  const postRate = isNum(input.postPreferentialRateAnnual) ? input.postPreferentialRateAnnual : 0;
  const startMonth = isNum(input.reductionStartMonth) ? Math.trunc(input.reductionStartMonth) : 0;
  const reduceMonths = isNum(input.reductionMonths) ? Math.trunc(input.reductionMonths) : 0;
  const roundMode = input.roundMode ?? PRINCIPAL_ROUND_MODE;

  const rawPrincipal = loanAmount / tenorMonths;
  const steadyPrincipal = roundMode === 'exact'
    ? rawPrincipal
    : roundPrincipalCore(rawPrincipal, roundMode);

  const rows: RateReductionSchedulePeriod[] = [];
  let remaining = loanAmount;

  for (let m = 1; m <= tenorMonths; m++) {
    const paymentDate = edate(input.firstPaymentDate, m - 1);
    const previousDate = edate(input.firstPaymentDate, m - 2);
    const daysInPeriod = Math.max(1, diffDays(previousDate, paymentDate));

    const beginningBalance = Math.max(0, remaining);
    const principalPayment = m === tenorMonths
      ? beginningBalance
      : Math.min(beginningBalance, steadyPrincipal);
    const endingBalance = Math.max(0, beginningBalance - principalPayment);

    const standardRateAnnual = m <= prefMonths ? prefRate : postRate;

    const inWindow = reduceMonths > 0
      && startMonth > 0
      && m > prefMonths
      && m >= startMonth
      && m <= startMonth + reduceMonths - 1;

    const reducedRateAnnual = inWindow
      ? resolveReducedRateAnnual(
          standardRateAnnual,
          input.proposedRateAnnual,
          input.minRateAnnual,
          input.maxReductionAnnual
        )
      : standardRateAnnual;

    const deltaRateAnnual = Math.max(0, standardRateAnnual - reducedRateAnnual);
    const dayFactor = daysInPeriod / 365;

    rows.push({
      month: m,
      paymentDate,
      daysInPeriod,
      beginningBalance,
      principalPayment,
      endingBalance,
      standardRateAnnual,
      reducedRateAnnual,
      deltaRateAnnual,
      isReduced: deltaRateAnnual > 1e-9,
      interestOriginal: Math.round(beginningBalance * standardRateAnnual * dayFactor),
      interestFinal: Math.round(beginningBalance * reducedRateAnnual * dayFactor),
      interestReduced: Math.round(beginningBalance * deltaRateAnnual * dayFactor),
    });

    remaining = endingBalance;
  }

  return rows;
}

export interface RateReductionSummary {
  totalPrincipal: number;
  totalInterestOriginal: number;
  totalInterestFinal: number;
  totalInterestReduced: number;
  reducedPeriodCount: number;
  savingRatio: number;
}

export function summarizeRateReduction(rows: RateReductionSchedulePeriod[]): RateReductionSummary {
  const summary: RateReductionSummary = {
    totalPrincipal: 0,
    totalInterestOriginal: 0,
    totalInterestFinal: 0,
    totalInterestReduced: 0,
    reducedPeriodCount: 0,
    savingRatio: 0,
  };
  if (!rows || rows.length === 0) return summary;

  for (const r of rows) {
    summary.totalPrincipal += r.principalPayment;
    summary.totalInterestOriginal += r.interestOriginal;
    summary.totalInterestFinal += r.interestFinal;
    summary.totalInterestReduced += r.interestReduced;
    if (r.isReduced) summary.reducedPeriodCount += 1;
  }

  summary.savingRatio = summary.totalInterestOriginal > 0
    ? summary.totalInterestReduced / summary.totalInterestOriginal
    : 0;

  return summary;
}
