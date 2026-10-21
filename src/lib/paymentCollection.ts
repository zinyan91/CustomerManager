import type { LoanContract, RepaymentSchedule } from '../types';
import {
  addDaysToDate, calculateOverdueDaysFromDates, computeSchedulePenalty,
  isScheduleFullySettled, schedulePaymentStatus,
} from './loanMath';
import { getEffectiveActiveRate } from './rateResolution';
import { formatMoneyInput, parseMoneyInput } from './utils';

export interface PaymentDraft {
  paymentDate: string;
  overdueDaysStr: string;
  overdueInterestStr: string;
  actualPaidPrincipalStr: string;
  actualPaidInterestStr: string;
  prepaidPrincipalStr: string;
  isPaid: boolean;
  note: string;
}

export function hasRecordedCollection(s: RepaymentSchedule): boolean {
  return s.IsPaid || Boolean(s.PaymentDate) || schedulePaymentStatus(s).collected > 0;
}

export function assessCollection(s: RepaymentSchedule, contract: LoanContract | null, date: string) {
  return computeSchedulePenalty(s, getEffectiveActiveRate(contract, s.DueDate), {
    overdueDays: calculateOverdueDaysFromDates(date, s.DueDate),
    principalPenaltyMultiplier: contract?.PrincipalPenaltyMultiplier,
  });
}

const money = (value: number) => formatMoneyInput(String(value));
const suggestedInterest = (s: RepaymentSchedule, penalty: number) => (s.InterestAmount ?? 0) + penalty;

export function initialPaymentDraft(s: RepaymentSchedule, contract: LoanContract, today: string): PaymentDraft {
  const paymentDate = s.PaymentDate || (s.IsPaid ? addDaysToDate(s.DueDate, s.OverdueDays ?? 0) : today);
  const recorded = hasRecordedCollection(s);
  const penalty = recorded && s.OverdueInterestAmount != null ? s.OverdueInterestAmount
    : isScheduleFullySettled(s) ? 0 : assessCollection(s, contract, paymentDate).total;
  const hasAmounts = (s.ActualPaidPrincipal ?? 0) > 0 || (s.ActualPaidInterest ?? 0) > 0 || (s.PrepaidPrincipalAmount ?? 0) > 0;
  const useStoredAmounts = recorded && hasAmounts;
  return {
    paymentDate,
    overdueDaysStr: String(calculateOverdueDaysFromDates(paymentDate, s.DueDate)),
    overdueInterestStr: money(penalty),
    actualPaidPrincipalStr: money(useStoredAmounts ? s.ActualPaidPrincipal ?? 0 : Math.max(0, s.PrincipalAmount - (s.PrepaidPrincipalAmount ?? 0))),
    actualPaidInterestStr: money(useStoredAmounts ? s.ActualPaidInterest ?? 0 : suggestedInterest(s, penalty)),
    prepaidPrincipalStr: money(s.PrepaidPrincipalAmount ?? 0),
    isPaid: s.IsPaid,
    note: s.Note ?? '',
  };
}

export function changePaymentDate(draft: PaymentDraft, paymentDate: string, s: RepaymentSchedule, contract: LoanContract): PaymentDraft {
  const penalty = assessCollection(s, contract, paymentDate);
  const followsSuggestion = parseMoneyInput(draft.actualPaidInterestStr) === suggestedInterest(s, parseMoneyInput(draft.overdueInterestStr));
  return {
    ...draft, paymentDate,
    overdueDaysStr: String(penalty.overdueDays),
    overdueInterestStr: money(penalty.total),
    actualPaidInterestStr: followsSuggestion ? money(suggestedInterest(s, penalty.total)) : draft.actualPaidInterestStr,
  };
}

export function changeOverdueDays(draft: PaymentDraft, value: string, s: RepaymentSchedule, contract: LoanContract): PaymentDraft {
  if (!/^\d+$/.test(value)) return { ...draft, overdueDaysStr: value };
  const days = Number(value);
  if (!Number.isSafeInteger(days)) return { ...draft, overdueDaysStr: value };
  const date = days === 0 && draft.paymentDate && draft.paymentDate <= s.DueDate
    ? draft.paymentDate : addDaysToDate(s.DueDate, days);
  return changePaymentDate(draft, date, s, contract);
}

export function buildPaymentUpdate(s: RepaymentSchedule, draft: PaymentDraft): RepaymentSchedule {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.paymentDate) || addDaysToDate(draft.paymentDate, 0) !== draft.paymentDate) {
    throw new Error('Ngày thực trả không hợp lệ.');
  }
  const days = Number(draft.overdueDaysStr);
  if (!/^\d+$/.test(draft.overdueDaysStr) || !Number.isSafeInteger(days) || days < 0) {
    throw new Error('Số ngày quá hạn phải là số nguyên không âm.');
  }
  if (days !== calculateOverdueDaysFromDates(draft.paymentDate, s.DueDate)) {
    throw new Error('Số ngày quá hạn không khớp ngày thực trả.');
  }
  const penalty = parseMoneyInput(draft.overdueInterestStr);
  const updated = {
    ...s,
    TotalAmount: s.PrincipalAmount + s.InterestAmount + penalty,
    IsPaid: draft.isPaid,
    PaymentDate: draft.isPaid ? draft.paymentDate : null,
    OverdueDays: days,
    OverdueInterestAmount: penalty,
    ActualPaidPrincipal: parseMoneyInput(draft.actualPaidPrincipalStr),
    ActualPaidInterest: parseMoneyInput(draft.actualPaidInterestStr),
    PrepaidPrincipalAmount: parseMoneyInput(draft.prepaidPrincipalStr),
    Note: draft.note || null,
  };
  const collected = updated.ActualPaidPrincipal + updated.PrepaidPrincipalAmount + updated.ActualPaidInterest;
  if (collected > 0) updated.PaymentDate = draft.paymentDate;
  if (draft.isPaid && collected < updated.TotalAmount) throw new Error('Kỳ này chưa thu đủ gốc, lãi và lãi phạt.');
  return updated;
}

export function quickCollectionPlan(schedules: RepaymentSchedule[], contract: LoanContract, delayDays: number, today: string): RepaymentSchedule[] {
  if (!Number.isInteger(delayDays) || delayDays < 0 || delayDays > 9) throw new Error('Thu nhanh chỉ áp dụng trễ từ 0 đến 9 ngày.');
  if (contract.IsSettled) return [];
  return schedules.flatMap(s => {
    if (!s.DueDate || hasRecordedCollection(s) || isScheduleFullySettled(s)) return [];
    const paymentDate = addDaysToDate(s.DueDate, delayDays);
    if (!paymentDate || paymentDate > today) return [];
    const penalty = assessCollection(s, contract, paymentDate).total;
    return [{
      ...s, IsPaid: true, PaymentDate: paymentDate, OverdueDays: delayDays, OverdueInterestAmount: penalty,
      ActualPaidPrincipal: s.PrincipalAmount, ActualPaidInterest: suggestedInterest(s, penalty),
      TotalAmount: s.PrincipalAmount + s.InterestAmount + penalty,
    }];
  });
}
