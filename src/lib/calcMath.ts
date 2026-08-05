import { roundPrincipalCore } from './loanMath';

export function edate(dateStr: string, monthOffset: number): string {
  if (!dateStr || monthOffset === null || monthOffset === undefined || isNaN(monthOffset)) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return '';

    const totalMonths = m + Math.trunc(monthOffset);
    const targetY = y + Math.floor(totalMonths / 12);
    const targetM = ((totalMonths % 12) + 12) % 12;

    const daysInTargetMonth = new Date(targetY, targetM + 1, 0).getDate();
    const targetD = Math.min(d, daysInTargetMonth);

    const mm = String(targetM + 1).padStart(2, '0');
    const dd = String(targetD).padStart(2, '0');
    return `${targetY}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

export function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  return edate(dateStr, months);
}

export function diffDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const p1 = startDateStr.split('-');
    const p2 = endDateStr.split('-');
    if (p1.length !== 3 || p2.length !== 3) return 0;
    const d1 = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
    const d2 = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export type PrincipalRepayMethod = 'equal_principal' | 'bullet';
export type PrepaymentMode = 'reduce_monthly' | 'shorten_tenor';

export interface PrepaymentPlanItem {
  period: number;
  amount: number;
  mode: PrepaymentMode;
}

export interface LoanScheduleParams {
  loanAmount: number;
  promoRateAnnual: number;
  tenorMonths: number;
  disbursementDate: string;
  firstPaymentDate?: string | null;
  repayMethod: PrincipalRepayMethod;
  principalGraceMonths?: number;
  promoMonths?: number | null;
  baseRateAnnual?: number | null;
  marginAnnual?: number | null;
  postPromoRateOverride?: number | null;
  prepayments?: PrepaymentPlanItem[];
}

export interface LoanScheduleRow {
  period: number;
  startDate: string;
  dueDate: string;
  days: number;
  rateAnnual: number;
  beginningBalance: number;
  scheduledPrincipal: number;
  prepayment: number;
  principal: number;
  interest: number;
  totalPayment: number;
  endingBalance: number;
}

function numOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return v;
}

export function postPromoRateAnnual(params: {
  promoRateAnnual: number;
  baseRateAnnual?: number | null;
  marginAnnual?: number | null;
  postPromoRateOverride?: number | null;
}): number {
  const override = numOrNull(params.postPromoRateOverride);
  if (override !== null) return override;
  const base = numOrNull(params.baseRateAnnual);
  const margin = numOrNull(params.marginAnnual);
  return (base === null ? params.promoRateAnnual : base) + (margin === null ? 0 : margin);
}

export function periodRateAnnual(period: number, params: LoanScheduleParams): number {
  const promoMonths = numOrNull(params.promoMonths);
  if (promoMonths !== null && promoMonths > 0 && period <= promoMonths) return params.promoRateAnnual;
  if (promoMonths === null || promoMonths <= 0) return params.promoRateAnnual;
  return postPromoRateAnnual(params);
}

export function mergePrepayments(items: PrepaymentPlanItem[]): PrepaymentPlanItem[] {
  const byPeriod = new Map<number, PrepaymentPlanItem>();
  for (const it of items) {
    const period = Math.trunc(it.period);
    const amount = numOrNull(it.amount);
    if (!Number.isFinite(period) || period < 1) continue;
    if (amount === null || amount <= 0) continue;
    const prev = byPeriod.get(period);
    byPeriod.set(period, {
      period,
      amount: (prev ? prev.amount : 0) + amount,
      mode: it.mode,
    });
  }
  return [...byPeriod.values()].sort((a, b) => a.period - b.period);
}

export function scheduleDueDate(period: number, params: LoanScheduleParams): string {
  const maturity = addMonths(params.disbursementDate, params.tenorMonths);
  const first = (params.firstPaymentDate ?? '').trim();

  if (!first || diffDays(params.disbursementDate, first) <= 0) {
    return addMonths(params.disbursementDate, period);
  }

  const theoKy = period === 1 ? first : edate(first, period - 1);

  if (period === params.tenorMonths && maturity) {
    const kyTruoc = params.tenorMonths === 1 ? params.disbursementDate : edate(first, params.tenorMonths - 2);
    if (diffDays(kyTruoc, maturity) > 0) return maturity;
  }

  return theoKy;
}

export function buildLoanSchedule(params: LoanScheduleParams): LoanScheduleRow[] {
  const { loanAmount, tenorMonths, disbursementDate, repayMethod } = params;
  if (!loanAmount || loanAmount <= 0 || !tenorMonths || tenorMonths < 1 || !disbursementDate) return [];

  const graceRaw = numOrNull(params.principalGraceMonths);
  const graceMonths = graceRaw === null ? 0 : Math.max(0, Math.min(tenorMonths - 1, Math.trunc(graceRaw)));
  const plan = mergePrepayments(params.prepayments ?? []);

  const rows: LoanScheduleRow[] = [];
  let balance = loanAmount;
  let prevDate = disbursementDate;
  let stepPrincipal = repayMethod === 'bullet'
    ? 0
    : roundPrincipalCore(loanAmount / Math.max(1, tenorMonths - graceMonths));

  for (let i = 1; i <= tenorMonths; i++) {
    if (balance <= 0) break;

    const dueDate = scheduleDueDate(i, params);
    const days = diffDays(prevDate, dueDate);
    const rateAnnual = periodRateAnnual(i, params);

    let scheduledPrincipal = 0;
    if (repayMethod === 'bullet') {
      scheduledPrincipal = i === tenorMonths ? balance : 0;
    } else if (i <= graceMonths) {
      scheduledPrincipal = 0;
    } else if (i === tenorMonths) {
      scheduledPrincipal = balance;
    } else {
      scheduledPrincipal = Math.min(balance, stepPrincipal);
    }

    const planned = plan.find(p => p.period === i);
    let prepayment = 0;
    if (planned) {
      prepayment = Math.min(Math.max(0, balance - scheduledPrincipal), planned.amount);
    }

    const principal = Math.min(balance, scheduledPrincipal + prepayment);
    const interest = Math.round(balance * (rateAnnual / 100) * (days / 365));
    const endingBalance = Math.max(0, balance - principal);

    rows.push({
      period: i,
      startDate: prevDate,
      dueDate,
      days,
      rateAnnual,
      beginningBalance: balance,
      scheduledPrincipal,
      prepayment,
      principal,
      interest,
      totalPayment: principal + interest,
      endingBalance,
    });

    if (prepayment > 0 && planned && planned.mode === 'reduce_monthly' && repayMethod !== 'bullet') {
      const remainingPeriods = tenorMonths - Math.max(i, graceMonths);
      if (remainingPeriods > 0 && endingBalance > 0) {
        stepPrincipal = roundPrincipalCore(endingBalance / remainingPeriods);
      }
    }

    balance = endingBalance;
    prevDate = dueDate;
  }

  return rows;
}

export function pvAnnuityFactor(rateMonthly: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  if (rateMonthly <= 0) return tenorMonths;
  return (1 - Math.pow(1 + rateMonthly, -tenorMonths)) / rateMonthly;
}

export function emiFactor(rateMonthly: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  if (rateMonthly <= 0) return 1 / tenorMonths;
  const pow = Math.pow(1 + rateMonthly, tenorMonths);
  return (rateMonthly * pow) / (pow - 1);
}

export function emiMonthlyPayment(loanAmount: number, rateMonthly: number, tenorMonths: number): number {
  if (!loanAmount || tenorMonths <= 0) return 0;
  return Math.round(loanAmount * emiFactor(rateMonthly, tenorMonths));
}

export function dtiMaxMonthlyPayment(
  monthlyIncome: number, livingExpense: number, existingDebt: number, maxDtiPercent: number
): number {
  const netDisposable = Math.max(0, monthlyIncome - livingExpense - existingDebt);
  const dtiLimit = Math.max(0, (monthlyIncome * (maxDtiPercent / 100)) - existingDebt);
  return Math.min(netDisposable, dtiLimit);
}

export function effectiveAnnualRate(nominalRateAnnual: number, compoundingFreq: number): number {
  if (compoundingFreq <= 0) return nominalRateAnnual;
  return Math.pow(1 + nominalRateAnnual / compoundingFreq, compoundingFreq) - 1;
}

export function flatToReducingApprox(flatRateAnnual: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  return (flatRateAnnual * 2 * tenorMonths) / (tenorMonths + 1);
}
