import type { LoanContract, RepaymentSchedule } from '../types';
import {
  isScheduleFullySettled,
  calculateOverdueDaysFromDates,
  paidPrincipalOf,
  schedulePaymentStatus,
} from './loanMath';
import { assessCollection, hasRecordedCollection } from './paymentCollection';
import { todayIso } from './utils';

export interface ObligationLine {
  due: number;
  paid: number;
  unpaid: number;
}

export interface PeriodObligation {
  overdueDays: number;
  isSettled: boolean;
  isOverdue: boolean;
  principal: ObligationLine;
  interest: ObligationLine;
  penalty: ObligationLine;
  total: ObligationLine;
}

const line = (due: number, paid: number): ObligationLine => ({
  due,
  paid,
  unpaid: Math.max(0, due - paid),
});

export function resolvePenaltyDue(
  s: RepaymentSchedule,
  contract: LoanContract | null,
  asOfDateStr?: string
): number {
  if (hasRecordedCollection(s) && s.OverdueInterestAmount != null) {
    return s.OverdueInterestAmount;
  }
  if (contract?.IsSettled === true || isScheduleFullySettled(s)) return 0;
  return assessCollection(s, contract, asOfDateStr ?? todayIso()).total;
}

export function periodObligation(
  s: RepaymentSchedule,
  contract: LoanContract | null,
  asOfDateStr?: string
): PeriodObligation {
  const isSettled = (contract?.IsSettled === true) || isScheduleFullySettled(s);
  const status = schedulePaymentStatus(s);

  const principalDue = s.PrincipalAmount || 0;
  const interestDue = s.InterestAmount || 0;
  const penaltyDue = resolvePenaltyDue(s, contract, asOfDateStr);

  const principal = line(principalDue, paidPrincipalOf(s));
  const interest = line(interestDue, isSettled ? interestDue : Math.min(interestDue, status.collectedInterest));
  const penalty = line(penaltyDue, isSettled ? penaltyDue : Math.min(penaltyDue, Math.max(0, status.collectedInterest - interestDue)));

  const totalDue = principalDue + interestDue + penaltyDue;
  const totalPaid = principal.paid + interest.paid + penalty.paid;

  const overdueDays = isSettled ? (s.OverdueDays || 0) : calculateOverdueDaysFromDates(asOfDateStr ?? todayIso(), s.DueDate);

  return {
    overdueDays,
    isSettled,
    isOverdue: !isSettled && overdueDays > 0,
    principal,
    interest,
    penalty,
    total: line(totalDue, totalPaid),
  };
}

export function sumObligations(obligations: PeriodObligation[]): ObligationLine {
  return obligations.reduce<ObligationLine>(
    (acc, o) => ({
      due: acc.due + o.total.due,
      paid: acc.paid + o.total.paid,
      unpaid: acc.unpaid + o.total.unpaid,
    }),
    { due: 0, paid: 0, unpaid: 0 }
  );
}
