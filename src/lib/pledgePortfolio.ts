import type { Collateral, Customer, LoanContract, PledgeBundle, PledgeLoan, PledgeLoanRepayment, SavingsBook } from '../types';
import type { DueSheetRow } from './reports/builders/dueSheet';
import type { PortfolioKunnRowData } from './customerPortfolioExport';
import { interestBetween, lastInterestDate, outstandingPrincipal, signedDays } from './pledgeLoanMath';
import { pledgeLoanDebtGroup } from './pledgeLoan';
import { savingsPrincipalVnd } from './savingsBook';

export const PLEDGE_LOAN_METHOD = 'Cầm cố sổ tiết kiệm';

type DebtGroup = 1 | 2 | 3 | 4 | 5;

export interface PledgePortfolioSummary {
  count: number;
  outstanding: number;
  granted: number;
  collateralValue: number;
  collateralCount: number;
  customerIds: Set<number>;
  byDebtGroup: Record<DebtGroup, { count: number; amount: number }>;
}

function openLoans(bundle: Pick<PledgeBundle, 'loans' | 'repayments'>): PledgeLoan[] {
  return bundle.loans.filter((l) => !l.IsClosed && outstandingPrincipal(l, bundle.repayments) > 0);
}

function booksOfLoan(loan: PledgeLoan, bundle: PledgeBundle): SavingsBook[] {
  return bundle.links
    .filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate)
    .map((l) => bundle.books.find((b) => b.Id === l.SavingsBookId))
    .filter((b): b is SavingsBook => b !== undefined);
}

export function summarizePledgePortfolio(bundle: PledgeBundle, asOf: string): PledgePortfolioSummary {
  const byDebtGroup = {
    1: { count: 0, amount: 0 }, 2: { count: 0, amount: 0 }, 3: { count: 0, amount: 0 },
    4: { count: 0, amount: 0 }, 5: { count: 0, amount: 0 },
  } as Record<DebtGroup, { count: number; amount: number }>;
  const customerIds = new Set<number>();
  const pledgedBooks = new Map<number, SavingsBook>();
  let outstanding = 0;

  const loans = openLoans(bundle);
  for (const loan of loans) {
    const amount = outstandingPrincipal(loan, bundle.repayments);
    outstanding += amount;
    customerIds.add(loan.CustomerId);
    const group = pledgeLoanDebtGroup(loan, bundle.repayments, asOf) as DebtGroup;
    byDebtGroup[group].count += 1;
    byDebtGroup[group].amount += amount;
    for (const b of booksOfLoan(loan, bundle)) if (!b.IsClosed) pledgedBooks.set(b.Id, b);
  }

  const collateralValue = [...pledgedBooks.values()].reduce((s, b) => s + savingsPrincipalVnd(b), 0);
  const granted = loans.reduce((s, l) => s + l.Amount, 0);
  return { count: loans.length, outstanding, granted, collateralValue, collateralCount: pledgedBooks.size, customerIds, byDebtGroup };
}

export function pledgeLoanDueRow(
  loan: PledgeLoan,
  repayments: PledgeLoanRepayment[],
  customer: Pick<Customer, 'CifKh' | 'FullName'> | undefined,
  asOf: string
): DueSheetRow {
  const principal = outstandingPrincipal(loan, repayments);
  const interest = interestBetween(principal, loan.InterestRate, lastInterestDate(loan, repayments), loan.DueDate);
  return {
    cif: customer?.CifKh ?? '',
    customerName: customer?.FullName ?? '',
    kunnNumber: loan.ContractNumber,
    periodNumber: 1,
    dueDate: loan.DueDate,
    principal,
    interest,
    total: principal + interest,
    outstanding: principal,
    storedDebtGroup: pledgeLoanDebtGroup(loan, repayments, asOf),
    overdueSchedules: [],
  };
}

export function pledgeLoanDueRows(bundle: PledgeBundle, customers: Customer[], asOf: string): DueSheetRow[] {
  const byId = new Map(customers.map((c) => [c.Id, c]));
  return openLoans(bundle).map((l) => pledgeLoanDueRow(l, bundle.repayments, byId.get(l.CustomerId), asOf));
}

function bookAsCollateral(b: SavingsBook): Collateral {
  const value = savingsPrincipalVnd(b);
  return {
    Id: -b.Id,
    CustomerId: b.CustomerId,
    AssetCode: b.BookNumber,
    AssetType: 'Tiền gửi / STK',
    Value: value,
    AppraisedValue: value,
    LtvPercent: b.DepositType === 'tg_foreign' ? 90 : 100,
    AppraisalDate: b.OpenDate,
    Note: b.Note,
  };
}

function loanAsKunn(loan: PledgeLoan, outstanding: number): LoanContract {
  return {
    Id: -loan.Id,
    CustomerId: loan.CustomerId,
    ContractNumber: loan.ContractNumber,
    ContractType: 1,
    LoanMethod: PLEDGE_LOAN_METHOD,
    ContractAmount: loan.Amount,
    ContractStartDate: loan.DisbursementDate,
    ContractEndDate: loan.DueDate,
    DisbursementDate: loan.DisbursementDate,
    CurrentBalance: outstanding,
  } as LoanContract;
}

export function pledgePortfolioRows(bundle: PledgeBundle, customers: Customer[]): PortfolioKunnRowData[] {
  const byId = new Map(customers.map((c) => [c.Id, c]));
  const rows: PortfolioKunnRowData[] = [];
  for (const loan of openLoans(bundle)) {
    const customer = byId.get(loan.CustomerId);
    if (!customer) continue;
    const outstanding = outstandingPrincipal(loan, bundle.repayments);
    const term = `${signedDays(loan.DisbursementDate, loan.DueDate)} ngày`;
    rows.push({
      customer,
      kunn: loanAsKunn(loan, outstanding),
      creditContract: null,
      matchedCollaterals: booksOfLoan(loan, bundle).map(bookAsCollateral),
      masterHdtdNumber: loan.ContractNumber,
      grantedLimit: loan.Amount,
      principalAmount: loan.Amount,
      currentBalance: outstanding,
      interestRatePercent: loan.InterestRate,
      disbursementDate: loan.DisbursementDate,
      kunnTenor: term,
      kunnDueDate: loan.DueDate,
      hdtdStartDate: loan.DisbursementDate,
      hdtdTenor: term,
      hdtdEndDate: loan.DueDate,
    });
  }
  return rows;
}
