import type { PledgeLoan, PledgeLoanLink, PledgeLoanRepayment, SavingsBook } from '../types';
import { addTenor } from './stkPledge';
import { interestBetween, obligationAtDue } from './pledgeLoanMath';

export const FOREIGN_DEPOSIT_LTV_PERCENT = 90;

export interface BookAllocation {
  pledgeLoanId: number;
  contractNumber: string;
  principalCovered: number;
  obligation: number;
  dueDate: string;
}

export function savingsMaturityDate(b: SavingsBook): string | null {
  if (b.MaturityDate) return b.MaturityDate;
  if (!b.OpenDate || b.Tenor === null || !b.TenorUnit) return null;
  return addTenor(b.OpenDate, b.Tenor, b.TenorUnit) || null;
}

export function savingsPrincipalVnd(b: SavingsBook): number {
  const rate = b.DepositType === 'tg_foreign' && b.ExchangeRate !== null && b.ExchangeRate > 0 ? b.ExchangeRate : 1;
  return Math.round(b.Amount * rate);
}

export function savingsInterestToMaturity(b: SavingsBook): number | null {
  const maturity = savingsMaturityDate(b);
  if (!maturity || !b.OpenDate || b.InterestRate === null) return null;
  return interestBetween(savingsPrincipalVnd(b), b.InterestRate, b.OpenDate, maturity);
}

export function savingsPledgeCapacity(b: SavingsBook): number | null {
  const principal = savingsPrincipalVnd(b);
  if (b.DepositType === 'tg_foreign') return Math.round(principal * FOREIGN_DEPOSIT_LTV_PERCENT / 100);
  const interest = savingsInterestToMaturity(b);
  if (interest === null) return null;
  if (b.InterestPaymentMethod === 'end_term') return principal + interest;
  return principal - b.PaidInterest;
}

export function allocateObligations(
  loans: PledgeLoan[],
  links: PledgeLoanLink[],
  repayments: PledgeLoanRepayment[]
): Map<number, BookAllocation[]> {
  const result = new Map<number, BookAllocation[]>();
  for (const loan of loans) {
    if (loan.IsClosed) continue;
    const active = links.filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate);
    const covered = active.reduce((s, l) => s + l.PrincipalCovered, 0);
    if (covered <= 0) continue;
    const obligation = obligationAtDue(loan, repayments);
    for (const l of active) {
      const rows = result.get(l.SavingsBookId) ?? [];
      rows.push({
        pledgeLoanId: loan.Id,
        contractNumber: loan.ContractNumber,
        principalCovered: l.PrincipalCovered,
        obligation: Math.round(obligation * l.PrincipalCovered / covered),
        dueDate: loan.DueDate,
      });
      result.set(l.SavingsBookId, rows);
    }
  }
  return result;
}

export function savingsFreeCapacity(b: SavingsBook, allocations: BookAllocation[]): number | null {
  const capacity = savingsPledgeCapacity(b);
  if (capacity === null) return null;
  return capacity - allocations.reduce((s, a) => s + a.obligation, 0);
}

export function isSavingsBookIncomplete(b: SavingsBook): boolean {
  return b.DepositType !== 'tg_foreign' && savingsPledgeCapacity(b) === null;
}
