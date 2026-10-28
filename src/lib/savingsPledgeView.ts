import type { PledgeBundle, PledgeLoan, PledgeLoanLink, SavingsBook } from '../types';
import { fmtNumber } from './utils';
import { interestBetween, lastInterestDate, obligationAtDue, outstandingPrincipal, signedDays } from './pledgeLoanMath';
import { pledgeLoanStatus, pledgeLoanWarnings, type StatusTone } from './pledgeLoan';
import {
  allocateObligations, isSavingsBookIncomplete, savingsFreeCapacity, savingsMaturityDate,
  savingsPledgeCapacity, savingsPrincipalVnd, type BookAllocation,
} from './savingsBook';

export type RowTone = StatusTone | 'accent';

export interface BookRow {
  book: SavingsBook;
  maturity: string | null;
  capacity: number | null;
  free: number | null;
  allocations: BookAllocation[];
  incomplete: boolean;
  status: { tone: RowTone; label: string };
}

export interface LoanRow {
  loan: PledgeLoan;
  outstanding: number;
  accruedToday: number;
  obligationAtDue: number;
  termDays: number;
  books: Array<{ book: SavingsBook; principalCovered: number }>;
  status: { tone: RowTone; label: string };
  warnings: string[];
}

export interface BookKpis {
  activeTotal: number;
  activeCount: number;
  pledgedObligation: number;
  nextMaturity: string | null;
  daysToNextMaturity: number | null;
}

export interface LoanKpis {
  outstanding: number;
  activeCount: number;
  accruedToday: number;
  dueTotal: number;
  nextDue: string | null;
  daysToNextDue: number | null;
}

function bookStatus(book: SavingsBook, allocations: BookAllocation[]): BookRow['status'] {
  if (book.IsClosed) return { tone: 'mute', label: 'Đã tất toán' };
  if (allocations.length > 0) return { tone: 'accent', label: 'Đang cầm cố' };
  return { tone: 'pos', label: 'Chưa cầm cố' };
}

export function buildBookRows(bundle: PledgeBundle, _asOf: string): BookRow[] {
  const allocations = allocateObligations(bundle.loans, bundle.links, bundle.repayments);
  return bundle.books.map((book) => {
    const own = allocations.get(book.Id) ?? [];
    return {
      book,
      maturity: savingsMaturityDate(book),
      capacity: book.IsClosed ? null : savingsPledgeCapacity(book),
      free: book.IsClosed ? null : savingsFreeCapacity(book, own),
      allocations: own,
      incomplete: !book.IsClosed && isSavingsBookIncomplete(book),
      status: bookStatus(book, own),
    };
  });
}

export function buildLoanRows(bundle: PledgeBundle, asOf: string): LoanRow[] {
  return bundle.loans.map((loan) => {
    const outstanding = outstandingPrincipal(loan, bundle.repayments);
    const accrueUntil = asOf > loan.DueDate ? loan.DueDate : asOf;
    const books = bundle.links
      .filter((l) => l.PledgeLoanId === loan.Id && (loan.IsClosed || !l.ReleasedDate))
      .map((l) => ({ book: bundle.books.find((b) => b.Id === l.SavingsBookId), principalCovered: l.PrincipalCovered }))
      .filter((x): x is { book: SavingsBook; principalCovered: number } => x.book !== undefined);
    return {
      loan,
      outstanding,
      accruedToday: loan.IsClosed ? 0 : interestBetween(outstanding, loan.InterestRate, lastInterestDate(loan, bundle.repayments), accrueUntil),
      obligationAtDue: loan.IsClosed ? 0 : obligationAtDue(loan, bundle.repayments),
      termDays: signedDays(loan.DisbursementDate, loan.DueDate),
      books,
      status: pledgeLoanStatus(loan, bundle.repayments, asOf),
      warnings: loan.IsClosed ? [] : pledgeLoanWarnings(loan, bundle.links, bundle.books, bundle.loans, bundle.repayments),
    };
  });
}

function earliest(dates: string[]): string | null {
  return dates.length > 0 ? [...dates].sort()[0] : null;
}

export function bookKpis(rows: BookRow[], asOf: string): BookKpis {
  const open = rows.filter((r) => !r.book.IsClosed);
  const nextMaturity = earliest(open.map((r) => r.maturity).filter((d): d is string => d !== null && d >= asOf));
  return {
    activeTotal: open.reduce((s, r) => s + savingsPrincipalVnd(r.book), 0),
    activeCount: open.length,
    pledgedObligation: open.reduce((s, r) => s + r.allocations.reduce((a, x) => a + x.obligation, 0), 0),
    nextMaturity,
    daysToNextMaturity: nextMaturity ? signedDays(asOf, nextMaturity) : null,
  };
}

export function loanKpis(rows: LoanRow[], asOf: string): LoanKpis {
  const open = rows.filter((r) => !r.loan.IsClosed);
  const nextDue = earliest(open.map((r) => r.loan.DueDate));
  return {
    outstanding: open.reduce((s, r) => s + r.outstanding, 0),
    activeCount: open.length,
    accruedToday: open.reduce((s, r) => s + r.accruedToday, 0),
    dueTotal: open.reduce((s, r) => s + r.obligationAtDue, 0),
    nextDue,
    daysToNextDue: nextDue ? signedDays(asOf, nextDue) : null,
  };
}

export function validateBookForm(b: Partial<SavingsBook>): string | null {
  if (!(b.BookNumber || '').trim()) return 'Nhập số sổ.';
  if (!b.Amount || b.Amount <= 0) return 'Số tiền gửi phải lớn hơn 0.';
  if (b.DepositType === 'tg_foreign' && !(b.ExchangeRate && b.ExchangeRate > 0)) {
    return 'Nhập tỷ giá quy đổi cho tiền gửi ngoại tệ.';
  }
  return null;
}

export function validateLoanForm(
  loan: Partial<PledgeLoan>,
  links: Array<Pick<PledgeLoanLink, 'SavingsBookId' | 'PrincipalCovered'>>
): string | null {
  if (!(loan.ContractNumber || '').trim()) return 'Nhập số HĐ cầm cố.';
  if (!loan.Amount || loan.Amount <= 0) return 'Số tiền vay phải lớn hơn 0.';
  if (loan.InterestRate === undefined || loan.InterestRate === null || Number.isNaN(loan.InterestRate) || loan.InterestRate < 0) return 'Nhập lãi suất.';
  if (!loan.DisbursementDate || !loan.DueDate) return 'Nhập ngày giải ngân và ngày đến hạn.';
  if (loan.DueDate <= loan.DisbursementDate) return 'Ngày đến hạn phải sau ngày giải ngân.';
  if (links.length === 0) return 'Chọn ít nhất một sổ tiết kiệm bảo đảm.';
  if (new Set(links.map((l) => l.SavingsBookId)).size !== links.length) return 'Mỗi sổ chỉ chọn một lần.';
  const covered = links.reduce((s, l) => s + l.PrincipalCovered, 0);
  if (covered !== loan.Amount) {
    return `Tổng phần gốc bảo đảm ${fmtNumber(covered)} phải bằng số tiền vay ${fmtNumber(loan.Amount)}.`;
  }
  return null;
}
