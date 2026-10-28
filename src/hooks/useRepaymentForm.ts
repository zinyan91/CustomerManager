import { useMemo, useState } from 'react';
import type { PledgeBundle, PledgeLoan, PledgeRepaymentKind, SavingsBook } from '../types';
import { quoteRepayment } from '../lib/pledgeLoan';
import type { RepaymentRequest } from './useSavingsPledgeData';

interface Options {
  loan: PledgeLoan;
  bundle: PledgeBundle;
  today: string;
  onSubmit: (req: RepaymentRequest) => Promise<void>;
}

export function useRepaymentForm({ loan, bundle, today, onSubmit }: Options) {
  const linkedBooks = useMemo(() => bundle.links
    .filter((l) => l.PledgeLoanId === loan.Id && !l.ReleasedDate)
    .map((l) => bundle.books.find((b) => b.Id === l.SavingsBookId))
    .filter((b): b is SavingsBook => b !== undefined), [bundle, loan.Id]);

  const [kind, setKindState] = useState<PledgeRepaymentKind>('partial');
  const [date, setDate] = useState(today);
  const [principal, setPrincipal] = useState(0);
  const [offsetBookId, setOffsetBookId] = useState<number | null>(linkedBooks[0]?.Id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const quote = useMemo(() => {
    const offsetBook = bundle.books.find((b) => b.Id === offsetBookId);
    const others = offsetBook
      ? bundle.links
          .filter((l) => l.SavingsBookId === offsetBook.Id && l.PledgeLoanId !== loan.Id && !l.ReleasedDate)
          .map((l) => bundle.loans.find((x) => x.Id === l.PledgeLoanId))
          .filter((x): x is PledgeLoan => x !== undefined && !x.IsClosed)
          .map((x) => x.ContractNumber)
      : [];
    return quoteRepayment({ loan, repayments: bundle.repayments, kind, date, principal, offsetBook, offsetBookOtherLoans: others });
  }, [loan, bundle, kind, date, principal, offsetBookId]);

  const setKind = (k: PledgeRepaymentKind) => {
    setKindState(k);
    if (k === 'due') setDate(loan.DueDate);
  };

  const submit = async () => {
    if (!quote.ok) return;
    setSaving(true);
    try {
      await onSubmit({ loanId: loan.Id, kind, date: kind === 'due' ? loan.DueDate : date, quote, offsetBookId });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return { kind, setKind, date, setDate, principal, setPrincipal, offsetBookId, setOffsetBookId, quote, linkedBooks, error, saving, submit };
}
