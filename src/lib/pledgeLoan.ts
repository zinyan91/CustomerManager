import type { PledgeLoan, PledgeLoanLink, PledgeLoanRepayment, PledgeRepaymentKind, SavingsBook } from '../types';
import { calcOverduePenalty, DEFAULT_NON_TERM_RATE_ANNUAL } from './stkPledge';
import { debtGroupFromOverdueDays } from './loanMath';
import { fmtDate, fmtNumber } from './utils';
import { interestBetween, lastInterestDate, outstandingPrincipal, signedDays } from './pledgeLoanMath';
import {
  allocateObligations, savingsFreeCapacity, savingsMaturityDate, savingsPrincipalVnd,
} from './savingsBook';

export { interestBetween, lastInterestDate, obligationAtDue, outstandingPrincipal } from './pledgeLoanMath';

export const DUE_SOON_DAYS = 30;
const NON_TERM_RATE_PERCENT = DEFAULT_NON_TERM_RATE_ANNUAL * 100;

export type StatusTone = 'pos' | 'warn' | 'neg' | 'mute';

export interface RepaymentQuoteInput {
  loan: PledgeLoan;
  repayments: PledgeLoanRepayment[];
  kind: PledgeRepaymentKind;
  date: string;
  principal?: number;
  offsetBook?: SavingsBook;
  offsetBookOtherLoans?: string[];
}

export interface RepaymentOffset {
  early: boolean;
  savingsRatePercent: number;
  savingsInterest: number;
  savingsTotal: number;
  balance: number;
}

export interface RepaymentQuote {
  ok: boolean;
  error?: string;
  interest: number;
  principal: number;
  principalPenalty: number;
  interestPenalty: number;
  total: number;
  remainingPrincipal: number;
  nextInterestFrom: string | null;
  offset?: RepaymentOffset;
  warnings: string[];
}

export function overdueDays(loan: PledgeLoan, repayments: PledgeLoanRepayment[], asOf: string): number {
  if (loan.IsClosed || outstandingPrincipal(loan, repayments) <= 0) return 0;
  return Math.max(0, signedDays(loan.DueDate, asOf));
}

export function pledgeLoanDebtGroup(loan: PledgeLoan, repayments: PledgeLoanRepayment[], asOf: string): number {
  return debtGroupFromOverdueDays(overdueDays(loan, repayments, asOf));
}

export function pledgeLoanStatus(
  loan: PledgeLoan,
  _repayments: PledgeLoanRepayment[],
  asOf: string
): { tone: StatusTone; label: string } {
  if (loan.IsClosed) return { tone: 'mute', label: 'Đã tất toán' };
  const left = signedDays(asOf, loan.DueDate);
  if (left < 0) return { tone: 'neg', label: `Quá hạn ${-left} ngày` };
  if (left <= DUE_SOON_DAYS) return { tone: 'warn', label: `Đến hạn sau ${left} ngày` };
  return { tone: 'pos', label: 'Trong hạn' };
}

function failed(error: string): RepaymentQuote {
  return {
    ok: false, error, interest: 0, principal: 0, principalPenalty: 0, interestPenalty: 0,
    total: 0, remainingPrincipal: 0, nextInterestFrom: null, warnings: [],
  };
}

function offsetOf(book: SavingsBook, date: string): RepaymentOffset {
  const maturity = savingsMaturityDate(book);
  const early = !maturity || date < maturity;
  const savingsRatePercent = early ? NON_TERM_RATE_PERCENT : book.InterestRate ?? 0;
  const principal = savingsPrincipalVnd(book);
  const savingsInterest = book.OpenDate
    ? interestBetween(principal, savingsRatePercent, book.OpenDate, early ? date : maturity)
    : 0;
  const savingsTotal = principal + savingsInterest - book.PaidInterest;
  return { early, savingsRatePercent, savingsInterest, savingsTotal, balance: 0 };
}

export function quoteRepayment(input: RepaymentQuoteInput): RepaymentQuote {
  const { loan, repayments, kind } = input;
  if (loan.IsClosed) return failed('Khoản vay đã tất toán.');

  const outstanding = outstandingPrincipal(loan, repayments);
  const from = lastInterestDate(loan, repayments);
  const date = kind === 'due' ? loan.DueDate : input.date;
  if (!date || date < from) return failed(`Ngày trả phải từ ngày ${fmtDate(from, 'dd/mm/yyyy')} trở đi.`);

  const principal = kind === 'partial' ? Math.round(input.principal ?? 0) : outstanding;
  if (kind === 'partial' && (principal <= 0 || principal >= outstanding)) {
    return failed(`Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ ${fmtNumber(outstanding)}.`);
  }
  if (kind === 'offset' && !input.offsetBook) return failed('Chọn sổ tiết kiệm để tất toán.');

  const interestUntil = date > loan.DueDate ? loan.DueDate : date;
  const interest = interestBetween(outstanding, loan.InterestRate, from, interestUntil);
  const lateDays = Math.max(0, signedDays(loan.DueDate, date));
  const penalty = lateDays > 0
    ? calcOverduePenalty({
        overduePrincipal: principal,
        normalRateAnnual: loan.InterestRate / 100,
        principalOverdueDays: lateDays,
        unpaidInterest: interest,
        interestOverdueDays: lateDays,
      })
    : { principalPenalty: 0, interestPenalty: 0 };

  const total = principal + interest + penalty.principalPenalty + penalty.interestPenalty;
  const remainingPrincipal = outstanding - principal;
  const warnings: string[] = [];

  let offset: RepaymentOffset | undefined;
  if (kind === 'offset' && input.offsetBook) {
    const book = input.offsetBook;
    offset = offsetOf(book, date);
    offset.balance = offset.savingsTotal - total;
    const others = input.offsetBookOtherLoans ?? [];
    if (others.length > 0) {
      warnings.push(`Sổ ${book.BookNumber} còn bảo đảm cho ${others.join(', ')}. Tất toán sổ phải xử lý cả khoản đó.`);
    }
    const maturity = savingsMaturityDate(book);
    if (offset.early && maturity) {
      warnings.push(`Tất toán trước ngày đáo hạn ${fmtDate(maturity, 'dd/mm/yyyy')}: lãi sổ tính theo lãi suất không kỳ hạn.`);
    }
  }

  return {
    ok: true,
    interest,
    principal,
    principalPenalty: penalty.principalPenalty,
    interestPenalty: penalty.interestPenalty,
    total,
    remainingPrincipal,
    nextInterestFrom: remainingPrincipal > 0 ? date : null,
    offset,
    warnings,
  };
}

export function pledgeLoanWarnings(
  loan: PledgeLoan,
  links: PledgeLoanLink[],
  books: SavingsBook[],
  allLoans: PledgeLoan[],
  repayments: PledgeLoanRepayment[]
): string[] {
  const warnings: string[] = [];
  const own = links.filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate);
  const ownBooks = own
    .map((l) => books.find((b) => b.Id === l.SavingsBookId))
    .filter((b): b is SavingsBook => b !== undefined);

  const maturities = ownBooks.map(savingsMaturityDate).filter((d): d is string => d !== null).sort();
  if (maturities.length > 0 && loan.DueDate > maturities[0]) {
    warnings.push('Ngày đến hạn vượt ngày đáo hạn sớm nhất của sổ bảo đảm.');
  }

  const loans = allLoans.some((l) => l.Id === loan.Id)
    ? allLoans.map((l) => (l.Id === loan.Id ? loan : l))
    : [...allLoans, loan];
  const allocations = allocateObligations(loans, links, repayments);
  for (const b of ownBooks) {
    const free = savingsFreeCapacity(b, allocations.get(b.Id) ?? []);
    if (free !== null && free < 0) warnings.push(`Nghĩa vụ vượt khả năng bảo đảm của sổ ${b.BookNumber}.`);
  }
  return warnings;
}
