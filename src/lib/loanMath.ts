import type { RepaymentSchedule, RateAdjustmentHistoryItem, LoanContract } from '../types';
import { todayIso } from './utils';
import {
  buildContractRateTimeline, buildRateTimeline, splitPeriodByRate, getEffectiveActiveRate,
} from './rateResolution';
import { calcOverduePenalty } from './stkPledge';

export function addMonthsToDate(dateStr?: string | null, months?: number | null): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    let targetYear = year;
    let targetMonth = month + Number(months);
    targetYear += Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;

    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    const d = new Date(targetYear, targetMonth, targetDay);
    if (isNaN(d.getTime())) return '';
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

export function addDaysToDate(dateStr?: string | null, days?: number | null): string {
  const parts = parseDateParts(dateStr);
  if (!parts || days === undefined || days === null || isNaN(days)) return '';
  const d = new Date(Date.UTC(parts.y, parts.m, parts.d + Number(days)));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function parseKunnTenorMonths(tenorStr?: string | null): number {
  if (!tenorStr) return 0;
  const match = tenorStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function parseDateParts(dStr?: string | null) {
  if (!dStr) return null;
  const parts = dStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { y, m, d };
}

export function getDaysBetween(d1Str: string, d2Str: string): number {
  const p1 = parseDateParts(d1Str);
  const p2 = parseDateParts(d2Str);
  if (!p1 || !p2) return 30;
  const utc1 = Date.UTC(p1.y, p1.m, p1.d);
  const utc2 = Date.UTC(p2.y, p2.m, p2.d);
  return Math.max(1, Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)));
}

export type PrincipalRoundMode = '1k' | '10k' | '50k' | 'exact';

export const PRINCIPAL_ROUND_MODE: PrincipalRoundMode = '10k';

export function roundPrincipalCore(
  rawPrincipal: number,
  roundMode: PrincipalRoundMode = PRINCIPAL_ROUND_MODE
): number {
  if (roundMode === 'exact' || !rawPrincipal || rawPrincipal <= 0) return Math.round(rawPrincipal);
  const step = roundMode === '50k' ? 50000 : roundMode === '10k' ? 10000 : 1000;
  return Math.ceil(rawPrincipal / step) * step;
}

export interface DueDateAnchor {
  year: number;
  monthIdx: number;
  day: number;
}

export function resolveFirstDueAnchor(
  repaymentStartDateStr?: string | null,
  disbursementDateStr?: string | null
): DueDateAnchor {
  const startParts = parseDateParts(repaymentStartDateStr);
  let year = startParts ? startParts.y : new Date().getFullYear();
  let monthIdx = startParts ? startParts.m : new Date().getMonth();
  const day = startParts ? startParts.d : new Date().getDate();

  const disburseParts = parseDateParts(disbursementDateStr || '');
  if (disburseParts) {
    const disburseUtc = Date.UTC(disburseParts.y, disburseParts.m, disburseParts.d);
    for (let guard = 0; guard < 600; guard++) {
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const d = Math.min(day, daysInMonth);
      if (Date.UTC(year, monthIdx, d) > disburseUtc) break;
      monthIdx += 1;
      if (monthIdx > 11) { monthIdx = 0; year += 1; }
    }
  }

  return { year, monthIdx, day };
}

function dueDateAtCycle(anchor: DueDateAnchor, n: number): string {
  const totalMonths = anchor.monthIdx + (n - 1);
  const y = anchor.year + Math.floor(totalMonths / 12);
  const mIdx = totalMonths % 12;
  const d = Math.min(anchor.day, new Date(y, mIdx + 1, 0).getDate());
  return `${y}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function maturityDateOf(c?: LoanContract | null): string | null {
  if (!c) return null;
  const declared = (c.KunnDueDate || '').trim();
  if (parseDateParts(declared)) return declared;
  const months = parseKunnTenorMonths(c.KunnTenor) || c.LoanTenorMonths || 0;
  const derived = addMonthsToDate(c.DisbursementDate, months);
  return parseDateParts(derived) ? derived : null;
}

export function applyMaturityToDueDates(dates: string[], maturityIso?: string | null): string[] {
  const cutoff = (maturityIso || '').trim();
  if (!parseDateParts(cutoff) || dates.length === 0) return dates;
  const kept = dates.filter(d => d <= cutoff);
  if (kept[kept.length - 1] !== cutoff) kept.push(cutoff);
  return kept;
}

export function buildDueDateSequence(
  repaymentStartDateStr?: string | null,
  periods?: number | null,
  disbursementDateStr?: string | null,
  maturityIso?: string | null
): string[] {
  const count = Math.max(0, Math.floor(periods || 0));
  if (count === 0) return [];

  const anchor = resolveFirstDueAnchor(repaymentStartDateStr, disbursementDateStr);
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) dates.push(dueDateAtCycle(anchor, i));
  return applyMaturityToDueDates(dates, maturityIso);
}

export function redateSchedules(
  schedules: RepaymentSchedule[],
  repaymentStartDateStr?: string | null,
  disbursementDateStr?: string | null,
  maturityIso?: string | null
): RepaymentSchedule[] {
  if (!schedules || schedules.length === 0) return [];
  const dueDates = buildDueDateSequence(
    repaymentStartDateStr, schedules.length, disbursementDateStr, maturityIso
  );
  return schedules.map((s, idx) => s.IsPaid
    ? { ...s }
    : { ...s, DueDate: dueDates[idx] ?? s.DueDate });
}

export function generateSchedule(
  contractId: number,
  loanAmount: number,
  interestRate: number,
  repaymentStartDateStr: string,
  periods: number,
  isBulletPrincipal: boolean = true,
  disbursementDateStr?: string,
  customMonthlyPrincipal?: number,
  principalGraceMonths: number = 0,
  prepaymentAmount: number = 0,
  prepaymentPeriod: number = 0,
  prepaymentMode: 'reduce_monthly' | 'shorten_tenor' = 'reduce_monthly',
  rateHistory?: RateAdjustmentHistoryItem[],
  prefInfo?: { prefRate: number; prefMonths: number; postPrefRate: number },
  maturityIso?: string | null
): Partial<RepaymentSchedule>[] {
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;

  const dueDates = buildDueDateSequence(
    repaymentStartDateStr, periods, disbursementDateStr, maturityIso
  );
  const totalPeriods = dueDates.length;

  const defaultAnnualRate = interestRate > 1 ? interestRate / 100 : interestRate;

  let prevDateStr = disbursementDateStr || repaymentStartDateStr;

  const remainingRepayPeriods = Math.max(1, periods - principalGraceMonths);
  let defaultMonthlyPrincipal = isBulletPrincipal
    ? 0
    : (customMonthlyPrincipal && customMonthlyPrincipal > 0
        ? customMonthlyPrincipal
        : roundPrincipalCore(loanAmount / remainingRepayPeriods));

  const rateTimeline = buildRateTimeline({
    startDate: disbursementDateStr || repaymentStartDateStr,
    preferentialRate: prefInfo && prefInfo.prefMonths > 0 ? prefInfo.prefRate : 0,
    preferentialPeriodMonths: prefInfo ? prefInfo.prefMonths : 0,
    postPreferentialRate: prefInfo && prefInfo.prefMonths > 0 ? prefInfo.postPrefRate : 0,
    interestRate,
    rateHistory,
  });

  for (let i = 1; i <= totalPeriods; i++) {
    if (balance <= 0) break;

    const dueDateStr = dueDates[i - 1];

    const days = getDaysBetween(prevDateStr, dueDateStr);

    const rateSegments = rateTimeline.length > 0
      ? splitPeriodByRate(rateTimeline, prevDateStr, dueDateStr, days)
      : [];

    let normalPrincipal = 0;
    if (isBulletPrincipal) {
      normalPrincipal = (i === totalPeriods) ? balance : 0;
    } else {
      if (i <= principalGraceMonths) {
        normalPrincipal = 0;
      } else if (i === totalPeriods) {
        normalPrincipal = balance;
      } else {
        normalPrincipal = Math.min(balance, defaultMonthlyPrincipal);
      }
    }

    let periodPrepay = 0;
    if (prepaymentAmount > 0 && i === prepaymentPeriod) {
      const remainingAfterNormal = Math.max(0, balance - normalPrincipal);
      periodPrepay = Math.min(remainingAfterNormal, prepaymentAmount);
    }

    const totalPrincipalInPeriod = Math.min(balance, normalPrincipal + periodPrepay);

    const interest = rateSegments.length > 0
      ? Math.round(rateSegments.reduce(
          (sum, seg) => sum + balance * (seg.ratePercent / 100) * (seg.days / 365), 0))
      : Math.round(balance * defaultAnnualRate * (days / 365));

    schedules.push({
      ContractId: contractId,
      PeriodNumber: i,
      DueDate: dueDateStr,
      PrincipalAmount: totalPrincipalInPeriod,
      InterestAmount: interest,
      TotalAmount: totalPrincipalInPeriod + interest,
      PrepaidPrincipalAmount: periodPrepay,
      IsPaid: false,
    });

    const endingBal = Math.max(0, balance - totalPrincipalInPeriod);

    if (periodPrepay > 0 && prepaymentMode === 'reduce_monthly' && !isBulletPrincipal) {
      const remainingPeriods = totalPeriods - i;
      if (remainingPeriods > 0 && endingBal > 0) {
        defaultMonthlyPrincipal = roundPrincipalCore(endingBal / remainingPeriods);
      }
    }

    balance = endingBal;
    prevDateStr = dueDateStr;
  }

  return schedules;
}

export function calculateOverdueDaysFromDates(
  paymentDateStr?: string | null,
  dueDateStr?: string | null
): number {
  const pay = parseDateParts(paymentDateStr);
  const due = parseDateParts(dueDateStr);
  if (!pay || !due) return 0;
  const diff = Date.UTC(pay.y, pay.m, pay.d) - Date.UTC(due.y, due.m, due.d);
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

export function overdueDaysOfSchedule(
  s: Pick<RepaymentSchedule, 'OverdueDays' | 'DueDate'>,
  asOfDateStr?: string
): number {
  if (s.OverdueDays !== undefined && s.OverdueDays !== null && s.OverdueDays > 0) {
    return s.OverdueDays;
  }
  return calculateOverdueDaysFromDates(asOfDateStr || todayIso(), s.DueDate);
}

export interface SchedulePenalty {
  overdueDays: number;
  principalPenaltyRate: number;
  principalPenalty: number;
  interestPenalty: number;
  total: number;
}

export function computeSchedulePenalty(
  s: Pick<RepaymentSchedule, 'OverdueDays' | 'DueDate' | 'PrincipalAmount' | 'InterestAmount'>,
  annualRate: number,
  options?: { asOfDateStr?: string; overdueDays?: number; principalPenaltyMultiplier?: number | null }
): SchedulePenalty {
  const overdueDays = options?.overdueDays !== undefined && options.overdueDays !== null
    ? Math.max(0, options.overdueDays)
    : overdueDaysOfSchedule(s, options?.asOfDateStr);

  if (overdueDays <= 0) {
    return {
      overdueDays: 0,
      principalPenaltyRate: 0,
      principalPenalty: 0,
      interestPenalty: 0,
      total: 0,
    };
  }

  const r = calcOverduePenalty({
    overduePrincipal: s.PrincipalAmount || 0,
    normalRateAnnual: annualRate,
    principalOverdueDays: overdueDays,
    unpaidInterest: s.InterestAmount || 0,
    interestOverdueDays: overdueDays,
    principalPenaltyMultiplier: options?.principalPenaltyMultiplier,
  });

  return {
    overdueDays,
    principalPenaltyRate: r.principalPenaltyRate,
    principalPenalty: r.principalPenalty,
    interestPenalty: r.interestPenalty,
    total: r.principalPenalty + r.interestPenalty,
  };
}

// Ngưỡng phân nhóm nợ theo số ngày quá hạn lớn nhất (chuẩn Thông tư 11/2021):
// Nhóm 1 < 10 ngày, Nhóm 2: 10–90, Nhóm 3: 91–180, Nhóm 4: 181–360, Nhóm 5: > 360.
// Tách riêng để dashboard và portfolio dùng CHUNG một nguồn ngưỡng, không lệch nhau.
export function debtGroupFromOverdueDays(maxOverdueDays: number): number {
  if (maxOverdueDays >= 10 && maxOverdueDays <= 90) return 2;
  if (maxOverdueDays >= 91 && maxOverdueDays <= 180) return 3;
  if (maxOverdueDays >= 181 && maxOverdueDays <= 360) return 4;
  if (maxOverdueDays > 360) return 5;
  return 1;
}

export interface AutoDebtGroupInfo {
  debtGroup: number;
  maxOverdueDays: number;
  worstDueDate?: string;
}

export function getAutoDebtGroupInfo(
  schedules?: RepaymentSchedule[],
  todayStr?: string
): AutoDebtGroupInfo {
  if (!schedules || schedules.length === 0) {
    return { debtGroup: 1, maxOverdueDays: 0 };
  }

  const today = parseDateParts(todayStr) ?? (() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  })();
  const todayUtc = Date.UTC(today.y, today.m, today.d);

  let maxOverdueDays = 0;
  let worstDueDate: string | undefined;

  for (const s of schedules) {
    if (!s.DueDate || isScheduleFullySettled(s)) continue;
    const due = parseDateParts(s.DueDate);
    if (!due) continue;
    const diff = todayUtc - Date.UTC(due.y, due.m, due.d);
    if (diff <= 0) continue;
    const overdueDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (overdueDays > maxOverdueDays) {
      maxOverdueDays = overdueDays;
      worstDueDate = s.DueDate;
    }
  }

  return { debtGroup: debtGroupFromOverdueDays(maxOverdueDays), maxOverdueDays, worstDueDate };
}

export function isBulletPrincipal(
  contract: Pick<LoanContract, 'PrincipalRepaymentMethod'>
): boolean {
  return (contract.PrincipalRepaymentMethod ?? 'Gốc trả cuối kỳ') === 'Gốc trả cuối kỳ';
}

export type MonthlyPrincipalContract = Pick<
  LoanContract,
  'MonthlyPrincipalAmount' | 'LoanAmount' | 'CurrentBalance' | 'PrincipalGracePeriodMonths'
>;

export function kunnPrincipal(
  contract: Pick<LoanContract, 'LoanAmount' | 'CurrentBalance'>
): number {
  const declared = contract.LoanAmount;
  if (Number.isFinite(declared as number) && (declared as number) > 0) return declared as number;

  const balance = contract.CurrentBalance;
  if (Number.isFinite(balance as number) && (balance as number) > 0) return balance as number;

  return 0;
}

export function monthlyPrincipalQuotient(
  contract: MonthlyPrincipalContract,
  totalPeriods: number
): number {
  const loanAmt = kunnPrincipal(contract);
  const graceMonths = contract.PrincipalGracePeriodMonths || 0;
  return loanAmt / Math.max(1, totalPeriods - graceMonths);
}

export function resolveMonthlyPrincipal(
  contract: MonthlyPrincipalContract,
  totalPeriods: number
): number {
  const declared = contract.MonthlyPrincipalAmount;
  if (declared !== null && declared !== undefined && declared > 0) return declared;
  return roundPrincipalCore(monthlyPrincipalQuotient(contract, totalPeriods));
}

export function recalculateSchedules(
  schedList: RepaymentSchedule[],
  contract: LoanContract,
  todayStr?: string
): RepaymentSchedule[] {
  const loanAmt = kunnPrincipal(contract);
  const graceMonths = contract.PrincipalGracePeriodMonths || 0;
  const isBullet = isBulletPrincipal(contract);

  const totalPeriods = schedList.length;
  let baseMonthlyPrincipal = isBullet ? 0 : resolveMonthlyPrincipal(contract, totalPeriods);

  let planBalance = loanAmt;
  let actualBalance = loanAmt;
  let prevDateStr: string =
    contract.DisbursementDate ||
    contract.ContractStartDate ||
    todayStr ||
    todayIso();

  const rateTimeline = buildContractRateTimeline(contract, { today: todayStr });

  const result: RepaymentSchedule[] = [];

  for (let i = 0; i < totalPeriods; i++) {
    const s = schedList[i];
    const periodNum = i + 1;
    const dueDateStr = s.DueDate;

    const days = getDaysBetween(prevDateStr, dueDateStr);
    const periodStartStr = prevDateStr;
    prevDateStr = dueDateStr;

    const rateSegments = rateTimeline.length > 0
      ? splitPeriodByRate(rateTimeline, periodStartStr, dueDateStr, days)
      : [];
    const derivedInterest = rateSegments.length > 0
      ? Math.round(rateSegments.reduce(
          (sum, seg) => sum + actualBalance * (seg.ratePercent / 100) * (seg.days / 365), 0))
      : Math.round(actualBalance * getEffectiveActiveRate(contract, dueDateStr) * (days / 365));
    const calculatedInterest = s.IsPaid && s.InterestAmount !== undefined && s.InterestAmount !== null
      ? s.InterestAmount
      : derivedInterest;

    const prepaid = s.PrepaidPrincipalAmount ?? 0;

    let scheduledPrincipal = 0;
    if (isBullet) {
      scheduledPrincipal = periodNum === totalPeriods ? planBalance : 0;
    } else if (periodNum <= graceMonths) {
      scheduledPrincipal = 0;
    } else if (periodNum === totalPeriods) {
      scheduledPrincipal = planBalance;
    } else {
      scheduledPrincipal = Math.min(planBalance, baseMonthlyPrincipal);
    }

    const principalInPeriod = Math.min(planBalance, scheduledPrincipal + prepaid);

    if (prepaid > 0 && !isBullet) {
      const remainingPeriods = totalPeriods - Math.max(periodNum, graceMonths);
      if (remainingPeriods > 0) {
        const balAfterPrepay = Math.max(0, planBalance - principalInPeriod);
        baseMonthlyPrincipal = roundPrincipalCore(balAfterPrepay / remainingPeriods);
      }
    }

    const collectedPrincipal = s.IsPaid
      ? (s.ActualPaidPrincipal !== undefined && s.ActualPaidPrincipal !== null && s.ActualPaidPrincipal > 0
          ? s.ActualPaidPrincipal + prepaid
          : principalInPeriod)
      : (s.ActualPaidPrincipal ?? 0) + prepaid;

    const overduePen = s.OverdueInterestAmount ?? 0;
    const totalObligation =
      principalInPeriod +
      calculatedInterest +
      overduePen;

    result.push({
      ...s,
      PrincipalAmount: principalInPeriod,
      InterestAmount: calculatedInterest,
      TotalAmount: totalObligation,
    });

    planBalance = Math.max(0, planBalance - principalInPeriod);
    actualBalance = Math.max(0, actualBalance - Math.min(actualBalance, collectedPrincipal));
  }

  return result;
}

export function paidPrincipalOf(s: RepaymentSchedule): number {
  const paid = s.ActualPaidPrincipal ?? 0;
  const prepaid = s.PrepaidPrincipalAmount ?? 0;
  if (paid > 0) return paid + prepaid;
  if (s.IsPaid) return s.PrincipalAmount || 0;
  return prepaid;
}

export interface QuickSettleCheck {
  ok: boolean;
  reason?: string;
}

type QuickSettleInput = Pick<RepaymentSchedule, 'IsPaid' | 'DueDate'>
  & Partial<Pick<RepaymentSchedule,
      'PrepaidPrincipalAmount' | 'ActualPaidPrincipal' | 'ActualPaidInterest'>>;

export function canQuickSettle(s: QuickSettleInput, todayIsoStr: string): QuickSettleCheck {
  if (s.IsPaid) return { ok: false, reason: 'Kỳ này đã ghi nhận thu.' };

  if (s.DueDate && todayIsoStr > s.DueDate) {
    return { ok: false, reason: 'Kỳ này đã quá hạn, lãi phạt phải do người quyết.' };
  }
  if ((s.PrepaidPrincipalAmount ?? 0) > 0) {
    return { ok: false, reason: 'Kỳ này có khai trả trước hạn.' };
  }
  if ((s.ActualPaidPrincipal ?? 0) !== 0 || (s.ActualPaidInterest ?? 0) !== 0) {
    return { ok: false, reason: 'Kỳ này đã khai số thu thật.' };
  }
  return { ok: true };
}

export function markSchedulePaidOnTime(
  s: RepaymentSchedule,
  paymentDateIso: string
): RepaymentSchedule {
  return {
    ...s,
    IsPaid: true,
    PaymentDate: paymentDateIso,
    OverdueDays: 0,
    OverdueInterestAmount: 0,
    TotalAmount: (s.PrincipalAmount || 0) + (s.InterestAmount || 0),
  };
}

export const PENALTY_COUNTS_TOWARD_SETTLEMENT = true;

export type SchedulePaymentState = 'chua_thu' | 'thu_mot_phan' | 'da_thu_du';

export interface SchedulePaymentStatus {
  obligation: number;
  collectedPrincipal: number;
  collectedInterest: number;
  collected: number;
  shortfall: number;
  status: SchedulePaymentState;
}

export function schedulePaymentStatus(
  s: Pick<RepaymentSchedule,
    'IsPaid' | 'PrincipalAmount' | 'InterestAmount' | 'OverdueInterestAmount'
    | 'ActualPaidPrincipal' | 'ActualPaidInterest' | 'PrepaidPrincipalAmount'>
): SchedulePaymentStatus {
  const principalDue = s.PrincipalAmount || 0;
  const interestDue = s.InterestAmount || 0;
  const penaltyDue = PENALTY_COUNTS_TOWARD_SETTLEMENT ? (s.OverdueInterestAmount || 0) : 0;
  const obligation = principalDue + interestDue + penaltyDue;

  const paidPrincipal = s.ActualPaidPrincipal ?? 0;
  const paidInterest = s.ActualPaidInterest ?? 0;
  const prepaid = s.PrepaidPrincipalAmount ?? 0;
  const declaredNothing = paidPrincipal <= 0 && paidInterest <= 0;

  if (s.IsPaid && declaredNothing) {
    return {
      obligation,
      collectedPrincipal: principalDue,
      collectedInterest: interestDue + penaltyDue,
      collected: obligation,
      shortfall: 0,
      status: 'da_thu_du',
    };
  }

  const collectedPrincipal = paidPrincipal > 0 ? paidPrincipal + prepaid : prepaid;
  const collectedInterest = paidInterest;
  const collected = collectedPrincipal + collectedInterest;
  const shortfall = Math.max(0, obligation - collected);

  const status: SchedulePaymentState = collected <= 0
    ? 'chua_thu'
    : (shortfall > 0 ? 'thu_mot_phan' : 'da_thu_du');

  return { obligation, collectedPrincipal, collectedInterest, collected, shortfall, status };
}

export function isScheduleFullySettled(
  s: Pick<RepaymentSchedule,
    'IsPaid' | 'PrincipalAmount' | 'InterestAmount' | 'OverdueInterestAmount'
    | 'ActualPaidPrincipal' | 'ActualPaidInterest' | 'PrepaidPrincipalAmount'>
): boolean {
  return schedulePaymentStatus(s).status === 'da_thu_du';
}

export function outstandingOf(
  contract: LoanContract,
  paidPrincipal: number | null | undefined
): number {
  if (contract.IsSettled === true) return 0;

  const loanAmt = kunnPrincipal(contract);
  if (paidPrincipal === null || paidPrincipal === undefined || Number.isNaN(paidPrincipal)) {
    return contract.CurrentBalance ?? loanAmt;
  }

  return Math.max(0, loanAmt - paidPrincipal);
}

export function computeOutstandingBalance(
  schedules: RepaymentSchedule[] | undefined,
  contract: LoanContract
): number {
  if (!schedules || schedules.length === 0) return outstandingOf(contract, null);

  let repaid = 0;
  for (const s of schedules) repaid += paidPrincipalOf(s);

  return outstandingOf(contract, repaid);
}
