import type { RepaymentSchedule, RateAdjustmentHistoryItem, LoanContract } from '../types';
import { getEffectiveActiveRate } from './utils';

export
function addMonthsToDate(dateStr?: string | null, months?: number | null): string {
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

export
function parseKunnTenorMonths(tenorStr?: string | null): number {
  if (!tenorStr) return 0;
  const match = tenorStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export
function parseDateParts(dStr?: string | null) {
  if (!dStr) return null;
  const parts = dStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { y, m, d };
}

export
function getDaysBetween(d1Str: string, d2Str: string): number {
  const p1 = parseDateParts(d1Str);
  const p2 = parseDateParts(d2Str);
  if (!p1 || !p2) return 30;
  const utc1 = Date.UTC(p1.y, p1.m, p1.d);
  const utc2 = Date.UTC(p2.y, p2.m, p2.d);
  return Math.max(1, Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)));
}

export
function roundPrincipalCore(rawPrincipal: number, roundMode: '1k' | '10k' | '50k' | 'exact' = '1k'): number {
  if (roundMode === 'exact' || !rawPrincipal || rawPrincipal <= 0) return Math.round(rawPrincipal);
  const step = roundMode === '50k' ? 50000 : roundMode === '10k' ? 10000 : 1000;
  return Math.ceil(rawPrincipal / step) * step;
}

export
function generateSchedule(
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
  prefInfo?: { prefRate: number; prefMonths: number; postPrefRate: number }
): Partial<RepaymentSchedule>[] {
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;

  const startParts = parseDateParts(repaymentStartDateStr);
  const startYear = startParts ? startParts.y : new Date().getFullYear();
  const startMonth = startParts ? startParts.m : new Date().getMonth();
  const startDay = startParts ? startParts.d : new Date().getDate();

  const defaultAnnualRate = interestRate > 1 ? interestRate / 100 : interestRate;

  let prevDateStr = disbursementDateStr || repaymentStartDateStr;

  const remainingRepayPeriods = Math.max(1, periods - principalGraceMonths);
  let defaultMonthlyPrincipal = isBulletPrincipal
    ? 0
    : (customMonthlyPrincipal && customMonthlyPrincipal > 0
        ? customMonthlyPrincipal
        : roundPrincipalCore(loanAmount / remainingRepayPeriods, '1k'));

  const sortedHistory = (rateHistory && rateHistory.length > 0)
    ? [...rateHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    : [];

  for (let i = 1; i <= periods; i++) {
    if (balance <= 0) break;

    let dueTotalMonths = startMonth + (i - 1);
    let dueYear = startYear + Math.floor(dueTotalMonths / 12);
    let dueMonthIdx = dueTotalMonths % 12;
    const daysInDueMonth = new Date(dueYear, dueMonthIdx + 1, 0).getDate();
    const dueDay = Math.min(startDay, daysInDueMonth);
    const dueDateStr = `${dueYear}-${String(dueMonthIdx + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    const days = getDaysBetween(prevDateStr, dueDateStr);

    let activeAnnualRate = defaultAnnualRate;

    if (sortedHistory.length > 0) {
      let activeItem: RateAdjustmentHistoryItem | null = null;
      for (const item of sortedHistory) {
        if (item.effectiveDate <= dueDateStr) {
          activeItem = item;
        } else {
          break;
        }
      }
      if (activeItem && activeItem.ratePercent > 0) {
        activeAnnualRate = activeItem.ratePercent / 100;
      }
    } else if (prefInfo && prefInfo.prefRate > 0) {
      if (i <= prefInfo.prefMonths) {
        activeAnnualRate = prefInfo.prefRate > 1 ? prefInfo.prefRate / 100 : prefInfo.prefRate;
      } else {
        activeAnnualRate = prefInfo.postPrefRate > 1 ? prefInfo.postPrefRate / 100 : prefInfo.postPrefRate;
      }
    }

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

    const interest = Math.round(balance * activeAnnualRate * (days / 365));

    let noteText: string | undefined = undefined;
    if (periodPrepay > 0) {
      noteText = `[TRẢ TRƯỚC HẠN: +${periodPrepay.toLocaleString('vi-VN')}đ]`;
    }

    schedules.push({
      ContractId: contractId,
      PeriodNumber: i,
      DueDate: dueDateStr,
      PrincipalAmount: totalPrincipalInPeriod,
      InterestAmount: interest,
      TotalAmount: totalPrincipalInPeriod + interest,
      IsPaid: false,
      Note: noteText,
    });

    const endingBal = Math.max(0, balance - totalPrincipalInPeriod);

    if (periodPrepay > 0 && prepaymentMode === 'reduce_monthly' && !isBulletPrincipal) {
      const remainingPeriods = periods - i;
      if (remainingPeriods > 0 && endingBal > 0) {
        defaultMonthlyPrincipal = roundPrincipalCore(endingBal / remainingPeriods, '1k');
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
  let baseMonthlyPrincipal = isBullet ? 0 : roundPrincipalCore(loanAmt / remainingRepayPeriods, '1k');

  let currentBalance = loanAmt;
  let prevDateStr: string =
    contract.DisbursementDate ||
    contract.ContractStartDate ||
    todayStr ||
    new Date().toISOString().split('T')[0];

  const result: RepaymentSchedule[] = [];

  for (let i = 0; i < totalPeriods; i++) {
    const s = schedList[i];
    const periodNum = i + 1;
    const dueDateStr = s.DueDate;

    const days = getDaysBetween(prevDateStr, dueDateStr);
    prevDateStr = dueDateStr;

    const activeAnnualRate = getEffectiveActiveRate(contract, dueDateStr);
    const calculatedInterest = Math.round(currentBalance * activeAnnualRate * (days / 365));

    let expectedNormalPrincipal = 0;
    if (isBullet) {
      expectedNormalPrincipal = periodNum === totalPeriods ? currentBalance : 0;
    } else if (periodNum <= graceMonths) {
      expectedNormalPrincipal = 0;
    } else if (periodNum === totalPeriods) {
      expectedNormalPrincipal = currentBalance;
    } else {
      expectedNormalPrincipal = Math.min(currentBalance, baseMonthlyPrincipal);
    }

    let principalInPeriod = 0;

    if (s.IsPaid) {

      const base =
        s.ActualPaidPrincipal !== undefined && s.ActualPaidPrincipal !== null && s.ActualPaidPrincipal > 0
          ? s.ActualPaidPrincipal
          : expectedNormalPrincipal;
      const recordedP = base + (s.PrepaidPrincipalAmount ?? 0);
      principalInPeriod = Math.min(currentBalance, recordedP);

      if ((s.PrepaidPrincipalAmount ?? 0) > 0 && !isBullet) {
        const remainingPeriods = totalPeriods - periodNum;
        if (remainingPeriods > 0) {
          const balAfterPrepay = Math.max(0, currentBalance - principalInPeriod);
          baseMonthlyPrincipal = roundPrincipalCore(balAfterPrepay / remainingPeriods, '1k');
        }
      }
    } else if (s.ActualPaidPrincipal && s.ActualPaidPrincipal > 0) {
      const recordedP = s.ActualPaidPrincipal + (s.PrepaidPrincipalAmount ?? 0);
      principalInPeriod = Math.min(currentBalance, recordedP);
    } else if (s.PrepaidPrincipalAmount && s.PrepaidPrincipalAmount > 0) {
      const recordedP = expectedNormalPrincipal + s.PrepaidPrincipalAmount;
      principalInPeriod = Math.min(currentBalance, recordedP);

      const remainingUnpaidNonGrace = totalPeriods - periodNum;
      if (remainingUnpaidNonGrace > 0) {
        const balAfterPrepay = Math.max(0, currentBalance - recordedP);
        baseMonthlyPrincipal = roundPrincipalCore(balAfterPrepay / remainingUnpaidNonGrace, '1k');
      }
    } else {
      principalInPeriod = expectedNormalPrincipal;
    }

    const overduePen = s.OverdueInterestAmount ?? 0;
    const totalObligation =
      principalInPeriod +
      (s.IsPaid ? (s.ActualPaidInterest ?? calculatedInterest) : calculatedInterest) +
      overduePen;

    result.push({
      ...s,
      PrincipalAmount: principalInPeriod,
      InterestAmount: calculatedInterest,
      TotalAmount: totalObligation,
    });

    currentBalance = Math.max(0, currentBalance - principalInPeriod);
  }

  return result;
}

export function computeOutstandingBalance(
  schedules: RepaymentSchedule[] | undefined,
  contract: LoanContract
): number {
  const loanAmt = contract.LoanAmount || contract.ContractAmount || 0;
  if (!schedules || schedules.length === 0) {
    return contract.CurrentBalance ?? loanAmt;
  }

  let repaid = 0;
  for (const s of schedules) {
    if (s.IsPaid) {
      repaid += s.PrincipalAmount || 0;
    } else {
      repaid += (s.ActualPaidPrincipal ?? 0) + (s.PrepaidPrincipalAmount ?? 0);
    }
  }
  return Math.max(0, loanAmt - repaid);
}
