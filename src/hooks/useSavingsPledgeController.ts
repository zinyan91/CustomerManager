import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Customer, PledgeLoan, SavingsBook } from '../types';
import { fetchCustomersAPI, type PledgeLoanLinkInput } from '../lib/api';
import {
  bookKpis, buildBookRows, buildLoanRows, loanKpis, validateBookForm, validateLoanForm,
} from '../lib/savingsPledgeView';
import { useCurrentDate } from './useCurrentDate';
import { useCustomerNavigate, useSelectedCustomerId } from './useSelectedCustomerId';
import { useSavingsPledgeData, type RepaymentRequest } from './useSavingsPledgeData';

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
  const [formKey, setFormKey] = useState(0);

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

  // ───── Form sổ: giá trị đang nhập nằm trong useBookFormState của form ─────
  const [bookOpen, setBookOpen] = useState(false);
  const [bookInitial, setBookInitial] = useState<Partial<SavingsBook>>(NEW_BOOK);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSaving, setBookSaving] = useState(false);

  const openBook = (initial: Partial<SavingsBook>) => {
    setBookInitial(initial);
    setBookError(null);
    setFormKey((k) => k + 1);
    setBookOpen(true);
  };

  const bookForm = {
    open: bookOpen,
    formKey,
    initial: bookInitial,
    error: bookError,
    saving: bookSaving,
    openNew: () => openBook(NEW_BOOK),
    openEdit: (b: SavingsBook) => openBook(b),
    close: () => setBookOpen(false),
    submit: async (values: Partial<SavingsBook>) => {
      const invalid = validateBookForm(values);
      if (invalid) { setBookError(invalid); return; }
      setBookSaving(true);
      try {
        const saved = await data.saveBook(values);
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

  // ───── Form khoản vay: giá trị đang nhập nằm trong useLoanFormState của form ─────
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanInitial, setLoanInitial] = useState<Partial<PledgeLoan>>({});
  const [loanInitialLinks, setLoanInitialLinks] = useState<PledgeLoanLinkInput[]>([]);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanSaving, setLoanSaving] = useState(false);

  const openLoan = (initial: Partial<PledgeLoan>, links: PledgeLoanLinkInput[]) => {
    setLoanInitial(initial);
    setLoanInitialLinks(links);
    setLoanError(null);
    setFormKey((k) => k + 1);
    setLoanOpen(true);
  };

  const loanForm = {
    open: loanOpen,
    formKey,
    initial: loanInitial,
    initialLinks: loanInitialLinks,
    error: loanError,
    saving: loanSaving,
    openNew: (bookId?: number) => openLoan(
      { ContractNumber: '', Amount: 0, InterestRate: undefined, DisbursementDate: today, DueDate: '', LoanPurpose: null, Note: null },
      bookId ? [{ SavingsBookId: bookId, PrincipalCovered: 0 }] : []
    ),
    openEdit: (loan: PledgeLoan) => openLoan(
      loan,
      bundle.links
        .filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate)
        .map((l) => ({ SavingsBookId: l.SavingsBookId, PrincipalCovered: l.PrincipalCovered }))
    ),
    close: () => setLoanOpen(false),
    submit: async (values: Partial<PledgeLoan>, links: PledgeLoanLinkInput[]) => {
      const invalid = validateLoanForm(values, links);
      if (invalid) { setLoanError(invalid); return; }
      setLoanSaving(true);
      try {
        const id = await data.saveLoan(values, links);
        setLoanOpen(false);
        goToLoan(id);
        setNotification({ type: 'success', message: `Đã lưu khoản vay ${(values.ContractNumber || '').trim()}.` });
      } catch (err) {
        setLoanError(errorText(err));
      } finally {
        setLoanSaving(false);
      }
    },
  };

  // ───── Trả nợ: lựa chọn và báo giá nằm trong useRepaymentForm của hộp thoại ─────
  const [repayLoanId, setRepayLoanId] = useState<number | null>(null);
  const repayLoan = bundle.loans.find((l) => l.Id === repayLoanId) ?? null;

  const repayDialog = {
    loan: repayLoan,
    openFor: (loanId: number) => setRepayLoanId(loanId),
    close: () => setRepayLoanId(null),
    record: async (req: RepaymentRequest) => {
      await data.recordRepayment(req);
      setRepayLoanId(null);
      setNotification({ type: 'success', message: `Đã ghi nhận trả nợ ${repayLoan?.ContractNumber ?? ''}.` });
    },
  };

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    customer,
    today,
    bundle,
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
