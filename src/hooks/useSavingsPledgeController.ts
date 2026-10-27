import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Customer, PledgeLoan, PledgeRepaymentKind, SavingsBook } from '../types';
import { fetchCustomersAPI, type PledgeLoanLinkInput } from '../lib/api';
import { quoteRepayment } from '../lib/pledgeLoan';
import { pledgeLoanWarnings } from '../lib/pledgeLoan';
import {
  bookKpis, buildBookRows, buildLoanRows, loanKpis, validateBookForm, validateLoanForm,
} from '../lib/savingsPledgeView';
import { useCurrentDate } from './useCurrentDate';
import { useCustomerNavigate, useSelectedCustomerId } from './useSelectedCustomerId';
import { useSavingsPledgeData } from './useSavingsPledgeData';

export type SavingsPledgeTab = 'savings' | 'loans';
type Notice = { type: 'success' | 'error'; message: string } | null;

const NEW_BOOK: Partial<SavingsBook> = {
  BookNumber: '', DepositType: 'tg_vnd', Currency: 'VND', ExchangeRate: null, Amount: 0,
  InterestRate: null, OpenDate: null, Tenor: null, TenorUnit: 'thang',
  InterestPaymentMethod: 'end_term', PaidInterest: 0, Note: null,
};

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useSavingsPledgeController() {
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
  const today = useCurrentDate();
  const data = useSavingsPledgeData(selectedCustomerId);
  const { bundle } = data;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notification, setNotification] = useState<Notice>(null);
  const [tab, setTab] = useState<SavingsPledgeTab>('savings');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI()
      .then((list) => setCustomers([...list].sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'))))
      .catch((err) => setNotification({ type: 'error', message: `Không nạp được danh sách khách hàng: ${errorText(err)}` }));
  }, []);

  const customer = useMemo(() => customers.find((c) => c.Id === selectedCustomerId) ?? null, [customers, selectedCustomerId]);

  const bookRows = useMemo(() => buildBookRows(bundle, today), [bundle, today]);
  const loanRows = useMemo(() => buildLoanRows(bundle, today), [bundle, today]);
  const bookKpiValues = useMemo(() => bookKpis(bookRows, today), [bookRows, today]);
  const loanKpiValues = useMemo(() => loanKpis(loanRows, today), [loanRows, today]);

  const bookDetail = bookRows.find((r) => r.book.Id === selectedBookId) ?? bookRows[0] ?? null;
  const loanDetail = loanRows.find((r) => r.loan.Id === selectedLoanId) ?? loanRows[0] ?? null;

  const goToBook = useCallback((id: number) => { setSelectedBookId(id); setTab('savings'); }, []);
  const goToLoan = useCallback((id: number) => { setSelectedLoanId(id); setTab('loans'); }, []);

  // ───── Form sổ ─────
  const [bookOpen, setBookOpen] = useState(false);
  const [bookValues, setBookValues] = useState<Partial<SavingsBook>>(NEW_BOOK);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSaving, setBookSaving] = useState(false);

  const bookForm = {
    open: bookOpen,
    values: bookValues,
    error: bookError,
    saving: bookSaving,
    openNew: () => { setBookValues(NEW_BOOK); setBookError(null); setBookOpen(true); },
    openEdit: (b: SavingsBook) => { setBookValues(b); setBookError(null); setBookOpen(true); },
    close: () => setBookOpen(false),
    setField: <K extends keyof SavingsBook>(key: K, value: SavingsBook[K]) =>
      setBookValues((v) => ({ ...v, [key]: value })),
    submit: async () => {
      const invalid = validateBookForm(bookValues);
      if (invalid) { setBookError(invalid); return; }
      setBookSaving(true);
      try {
        const saved = await data.saveBook(bookValues);
        setBookOpen(false);
        setSelectedBookId(saved.Id);
        setNotification({ type: 'success', message: `Đã lưu sổ ${saved.BookNumber}.` });
      } catch (err) {
        setBookError(errorText(err));
      } finally {
        setBookSaving(false);
      }
    },
  };

  // ───── Form khoản vay ─────
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanValues, setLoanValues] = useState<Partial<PledgeLoan>>({});
  const [loanLinks, setLoanLinks] = useState<PledgeLoanLinkInput[]>([]);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanSaving, setLoanSaving] = useState(false);

  const loanWarnings = useMemo(() => {
    if (!loanOpen || !loanValues.DueDate || !loanValues.Amount) return [];
    const draft = { ...(loanValues as PledgeLoan), Id: loanValues.Id ?? -1, IsClosed: false };
    const otherLinks = bundle.links.filter((l) => l.PledgeLoanId !== draft.Id);
    const draftLinks = loanLinks.map((l, i) => ({ ...l, Id: -1 - i, PledgeLoanId: draft.Id, ReleasedDate: null }));
    return pledgeLoanWarnings(draft, [...otherLinks, ...draftLinks], bundle.books, bundle.loans, bundle.repayments);
  }, [loanOpen, loanValues, loanLinks, bundle]);

  const loanForm = {
    open: loanOpen,
    values: loanValues,
    links: loanLinks,
    error: loanError,
    saving: loanSaving,
    warnings: loanWarnings,
    openNew: (bookId?: number) => {
      setLoanValues({ ContractNumber: '', Amount: 0, InterestRate: undefined, DisbursementDate: today, DueDate: '', LoanPurpose: null, Note: null });
      setLoanLinks(bookId ? [{ SavingsBookId: bookId, PrincipalCovered: 0 }] : []);
      setLoanError(null);
      setLoanOpen(true);
    },
    openEdit: (loan: PledgeLoan) => {
      setLoanValues(loan);
      setLoanLinks(bundle.links
        .filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate)
        .map((l) => ({ SavingsBookId: l.SavingsBookId, PrincipalCovered: l.PrincipalCovered })));
      setLoanError(null);
      setLoanOpen(true);
    },
    close: () => setLoanOpen(false),
    setField: <K extends keyof PledgeLoan>(key: K, value: PledgeLoan[K]) =>
      setLoanValues((v) => ({ ...v, [key]: value })),
    setLinks: setLoanLinks,
    submit: async () => {
      const invalid = validateLoanForm(loanValues, loanLinks);
      if (invalid) { setLoanError(invalid); return; }
      setLoanSaving(true);
      try {
        const id = await data.saveLoan(loanValues, loanLinks);
        setLoanOpen(false);
        goToLoan(id);
        setNotification({ type: 'success', message: `Đã lưu khoản vay ${(loanValues.ContractNumber || '').trim()}.` });
      } catch (err) {
        setLoanError(errorText(err));
      } finally {
        setLoanSaving(false);
      }
    },
  };

  // ───── Trả nợ ─────
  const [repayLoanId, setRepayLoanId] = useState<number | null>(null);
  const [kind, setKindState] = useState<PledgeRepaymentKind>('partial');
  const [date, setDate] = useState(today);
  const [principal, setPrincipal] = useState(0);
  const [offsetBookId, setOffsetBookId] = useState<number | null>(null);
  const [repayError, setRepayError] = useState<string | null>(null);
  const [repaySaving, setRepaySaving] = useState(false);

  const repayLoan = bundle.loans.find((l) => l.Id === repayLoanId) ?? null;

  const quote = useMemo(() => {
    if (!repayLoan) return null;
    const offsetBook = bundle.books.find((b) => b.Id === offsetBookId);
    const others = offsetBook
      ? bundle.links
          .filter((l) => l.SavingsBookId === offsetBook.Id && l.PledgeLoanId !== repayLoan.Id && !l.ReleasedDate)
          .map((l) => bundle.loans.find((x) => x.Id === l.PledgeLoanId))
          .filter((x): x is PledgeLoan => x !== undefined && !x.IsClosed)
          .map((x) => x.ContractNumber)
      : [];
    return quoteRepayment({
      loan: repayLoan, repayments: bundle.repayments, kind, date, principal,
      offsetBook, offsetBookOtherLoans: others,
    });
  }, [repayLoan, bundle, kind, date, principal, offsetBookId]);

  const repayDialog = {
    open: repayLoan !== null,
    loan: repayLoan,
    kind,
    date,
    principal,
    offsetBookId,
    quote,
    error: repayError,
    saving: repaySaving,
    linkedBooks: repayLoan
      ? bundle.links
          .filter((l) => l.PledgeLoanId === repayLoan.Id && !l.ReleasedDate)
          .map((l) => bundle.books.find((b) => b.Id === l.SavingsBookId))
          .filter((b): b is SavingsBook => b !== undefined)
      : [],
    openFor: (loanId: number) => {
      const firstBook = bundle.links.find((l) => l.PledgeLoanId === loanId && !l.ReleasedDate);
      setRepayLoanId(loanId);
      setKindState('partial');
      setDate(today);
      setPrincipal(0);
      setOffsetBookId(firstBook?.SavingsBookId ?? null);
      setRepayError(null);
    },
    close: () => setRepayLoanId(null),
    setKind: (k: PledgeRepaymentKind) => {
      setKindState(k);
      if (k === 'due' && repayLoan) setDate(repayLoan.DueDate);
    },
    setDate,
    setPrincipal,
    setOffsetBookId,
    submit: async () => {
      if (!repayLoan || !quote || !quote.ok) return;
      setRepaySaving(true);
      try {
        await data.recordRepayment({
          loanId: repayLoan.Id,
          kind,
          date: kind === 'due' ? repayLoan.DueDate : date,
          quote,
          offsetBookId,
        });
        setRepayLoanId(null);
        setNotification({ type: 'success', message: `Đã ghi nhận trả nợ ${repayLoan.ContractNumber}.` });
      } catch (err) {
        setRepayError(errorText(err));
      } finally {
        setRepaySaving(false);
      }
    },
  };

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    customer,
    today,
    tab,
    setTab,
    bookRows,
    loanRows,
    bookKpis: bookKpiValues,
    loanKpis: loanKpiValues,
    bookDetail,
    loanDetail,
    selectBook: setSelectedBookId,
    selectLoan: setSelectedLoanId,
    goToBook,
    goToLoan,
    bookForm,
    loanForm,
    repayDialog,
    notification,
    setNotification,
    loading: data.loading,
    error: data.error,
    reload: data.reload,
  };
}

export type SavingsPledgeController = ReturnType<typeof useSavingsPledgeController>;
