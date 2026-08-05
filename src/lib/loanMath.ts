import type { RepaymentSchedule, RateAdjustmentHistoryItem, LoanContract } from '../types';
import { getEffectiveActiveRate, todayIso } from './utils';
import { buildContractRateTimeline, buildRateTimeline, splitPeriodByRate } from './rateResolution';
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

export function buildDueDateSequence(
  repaymentStartDateStr?: string | null,
  periods?: number | null,
  disbursementDateStr?: string | null,
  maturityDateStr?: string | null
): string[] {
  const count = Math.max(0, Math.floor(periods || 0));
  if (count === 0) return [];

  const anchor = resolveFirstDueAnchor(repaymentStartDateStr, disbursementDateStr);
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) dates.push(dueDateAtCycle(anchor, i));

  const daoHan = (maturityDateStr || '').trim();
  if (daoHan) {
    const kyTruoc = count === 1
      ? (disbursementDateStr || repaymentStartDateStr || '')
      : dates[count - 2];
    if (kyTruoc && getDaysBetween(kyTruoc, daoHan) > 1) dates[count - 1] = daoHan;
  }

  return dates;
}

export function redateSchedules(
  schedules: RepaymentSchedule[],
  repaymentStartDateStr?: string | null,
  disbursementDateStr?: string | null,
  maturityDateStr?: string | null
): RepaymentSchedule[] {
  if (!schedules || schedules.length === 0) return [];
  const dueDates = buildDueDateSequence(
    repaymentStartDateStr, schedules.length, disbursementDateStr, maturityDateStr
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
  maturityDateStr?: string
): Partial<RepaymentSchedule>[] {
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;

  const dueDates = buildDueDateSequence(
    repaymentStartDateStr, periods, disbursementDateStr, maturityDateStr
  );

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

  for (let i = 1; i <= periods; i++) {
    if (balance <= 0) break;

    const dueDateStr = dueDates[i - 1];

    const days = getDaysBetween(prevDateStr, dueDateStr);

    const rateSegments = rateTimeline.length > 0
      ? splitPeriodByRate(rateTimeline, prevDateStr, dueDateStr, days)
      : [];

    let normalPrincipal = 0;
    if (isBulletPrincipal) {
      normalPrincipal = (i === periods) ? balance : 0;
    } else {
      if (i <= principalGraceMonths) {
        normalPrincipal = 0;
      } else if (i === periods) {
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
      const remainingPeriods = periods - i;
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
  options?: { asOfDateStr?: string; overdueDays?: number }
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
  });

  return {
    overdueDays,
    principalPenaltyRate: r.principalPenaltyRate,
    principalPenalty: r.principalPenalty,
    interestPenalty: r.interestPenalty,
    total: r.principalPenalty + r.interestPenalty,
  };
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
    if (s.IsPaid || !s.DueDate) continue;
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

  let debtGroup = 1;
  if (maxOverdueDays >= 10 && maxOverdueDays <= 90) debtGroup = 2;
  else if (maxOverdueDays >= 91 && maxOverdueDays <= 180) debtGroup = 3;
  else if (maxOverdueDays >= 181 && maxOverdueDays <= 360) debtGroup = 4;
  else if (maxOverdueDays > 360) debtGroup = 5;

  return { debtGroup, maxOverdueDays, worstDueDate };
}

export function isBulletPrincipal(
  contract: Pick<LoanContract, 'PrincipalRepaymentMethod'>
): boolean {
  return (contract.PrincipalRepaymentMethod ?? 'Gốc trả cuối kỳ') === 'Gốc trả cuối kỳ';
}

export function recalculateSchedules(
  schedList: RepaymentSchedule[],
  contract: LoanContract,
  todayStr?: string
): RepaymentSchedule[] {
  const loanAmt = contract.LoanAmount || contract.ContractAmount || 0;
  const graceMonths = contract.PrincipalGracePeriodMonths || 0;
  const isBullet = isBulletPrincipal(contract);

  const totalPeriods = schedList.length;
  const remainingRepayPeriods = Math.max(1, totalPeriods - graceMonths);
  let baseMonthlyPrincipal = isBullet ? 0 : roundPrincipalCore(loanAmt / remainingRepayPeriods);

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
      (s.IsPaid
        ? (s.ActualPaidInterest !== undefined && s.ActualPaidInterest !== null && s.ActualPaidInterest > 0
            ? s.ActualPaidInterest
            : calculatedInterest)
        : calculatedInterest) +
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

export function computeOutstandingBalance(
  schedules: RepaymentSchedule[] | undefined,
  contract: LoanContract
): number {
  if (contract.IsSettled === true) return 0;

  const loanAmt = contract.LoanAmount || contract.ContractAmount || 0;
  if (!schedules || schedules.length === 0) {
    return contract.CurrentBalance ?? loanAmt;
  }

  let repaid = 0;
  for (const s of schedules) repaid += paidPrincipalOf(s);

  return Math.max(0, loanAmt - repaid);
}
