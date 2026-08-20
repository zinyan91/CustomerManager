import type { CreditContract, LoanContract, RepaymentSchedule } from '../types';
import { summarizeCreditContracts, totalsOfCreditContracts } from './creditContract';
import { getAutoDebtGroupInfo, outstandingOf } from './loanMath';

export interface CustomerContextSummary {
  granted: number;
  outstanding: number;
  available: number;
  debtGroup: number;
  maxOverdueDays: number;
  activeKunnCount: number;
}

export interface BuildCustomerContextInput {
  creditContracts: CreditContract[];
  kunns: LoanContract[];
  paidPrincipal: Record<number, number>;
  overdueSchedules: RepaymentSchedule[];
  today: string;
}

export function buildCustomerContext(
  { creditContracts, kunns, paidPrincipal, overdueSchedules, today }: BuildCustomerContextInput
): CustomerContextSummary {
  const summaries = summarizeCreditContracts(creditContracts, kunns, {
    getOutstanding: (k) => outstandingOf(k, paidPrincipal[k.Id] ?? null),
    today,
  });

  const { granted, outstanding, available } = totalsOfCreditContracts(summaries);
  const { debtGroup, maxOverdueDays } = getAutoDebtGroupInfo(overdueSchedules, today);

  return {
    granted,
    outstanding,
    available,
    debtGroup,
    maxOverdueDays,
    activeKunnCount: summaries.reduce((s, x) => s + x.activeKunnCount, 0),
  };
}
