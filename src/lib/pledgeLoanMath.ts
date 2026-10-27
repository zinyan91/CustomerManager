import type { PledgeLoan, PledgeLoanRepayment } from '../types';
import { diffDays } from './calcMath';
import { accruedInterest } from './stkPledge';

export function signedDays(from: string, to: string): number {
  return from <= to ? diffDays(from, to) : -diffDays(to, from);
}

export function interestBetween(principal: number, ratePercent: number, from: string, to: string): number {
  return accruedInterest(principal, ratePercent / 100, signedDays(from, to));
}

function repaymentsOf(loan: PledgeLoan, repayments: PledgeLoanRepayment[]): PledgeLoanRepayment[] {
  return repayments.filter((r) => r.PledgeLoanId === loan.Id);
}

export function outstandingPrincipal(loan: PledgeLoan, repayments: PledgeLoanRepayment[]): number {
  return loan.Amount - repaymentsOf(loan, repayments).reduce((s, r) => s + r.PrincipalPaid, 0);
}

export function lastInterestDate(loan: PledgeLoan, repayments: PledgeLoanRepayment[]): string {
  return repaymentsOf(loan, repayments).reduce(
    (latest, r) => (r.RepaymentDate > latest ? r.RepaymentDate : latest),
    loan.DisbursementDate
  );
}

export function obligationAtDue(loan: PledgeLoan, repayments: PledgeLoanRepayment[]): number {
  const principal = outstandingPrincipal(loan, repayments);
  return principal + interestBetween(principal, loan.InterestRate, lastInterestDate(loan, repayments), loan.DueDate);
}
