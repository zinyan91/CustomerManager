import type { LoanContract, RepaymentSchedule } from '../types';
import {
  computeSchedulePenalty,
  isScheduleFullySettled,
  overdueDaysOfSchedule,
  paidPrincipalOf,
  schedulePaymentStatus,
} from './loanMath';
import { getEffectiveActiveRate } from './rateResolution';

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
  if (s.OverdueInterestAmount !== undefined && s.OverdueInterestAmount !== null) {
    return s.OverdueInterestAmount;
  }
  if (isScheduleFullySettled(s)) return 0;
  return computeSchedulePenalty(
    s,
    getEffectiveActiveRate(contract, s.DueDate),
    { asOfDateStr, principalPenaltyMultiplier: contract?.PrincipalPenaltyMultiplier }
  ).principalPenalty;
}

export function periodObligation(
  s: RepaymentSchedule,
  contract: LoanContract | null,
  asOfDateStr?: string
): PeriodObligation {
  const isSettled = isScheduleFullySettled(s);
  const status = schedulePaymentStatus(s);

  const principalDue = s.PrincipalAmount || 0;
  const interestDue = s.InterestAmount || 0;
  const penaltyDue = resolvePenaltyDue(s, contract, asOfDateStr);

  const principal = line(principalDue, paidPrincipalOf(s));
  const interest = line(interestDue, isSettled ? interestDue : status.collectedInterest);
  const penalty = line(penaltyDue, isSettled ? penaltyDue : 0);

  const totalDue = principalDue + interestDue + penaltyDue;
  const totalPaid = principal.paid + interest.paid + penalty.paid;

  const overdueDays = isSettled ? (s.OverdueDays || 0) : overdueDaysOfSchedule(s, asOfDateStr);

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
