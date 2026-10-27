import { useCallback, useEffect, useRef, useState } from 'react';
import type { PledgeBundle, PledgeLoan, PledgeRepaymentKind, SavingsBook } from '../types';
import {
  fetchPledgeLoanBundleByCustomerAPI, fetchSavingsBooksByCustomerAPI, recordPledgeRepaymentAPI,
  savePledgeLoanAPI, saveSavingsBookAPI, type PledgeLoanLinkInput,
} from '../lib/api';
import type { RepaymentQuote } from '../lib/pledgeLoan';

const EMPTY: PledgeBundle = { loans: [], links: [], repayments: [], books: [] };

export interface RepaymentRequest {
  loanId: number;
  kind: PledgeRepaymentKind;
  date: string;
  quote: RepaymentQuote;
  offsetBookId: number | null;
}

export function useSavingsPledgeData(customerId: number | null) {
  const [bundle, setBundle] = useState<PledgeBundle>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    if (customerId === null) {
      setBundle(EMPTY);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [books, loans] = await Promise.all([
        fetchSavingsBooksByCustomerAPI(customerId),
        fetchPledgeLoanBundleByCustomerAPI(customerId),
      ]);
      if (request !== requestRef.current) return;
      setBundle({ ...loans, books });
      setError(null);
    } catch (err) {
      if (request !== requestRef.current) return;
      setBundle(EMPTY);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveBook = useCallback(async (book: Partial<SavingsBook>) => {
    const saved = await saveSavingsBookAPI({ ...book, CustomerId: customerId ?? book.CustomerId });
    await reload();
    return saved;
  }, [customerId, reload]);

  const saveLoan = useCallback(async (loan: Partial<PledgeLoan>, links: PledgeLoanLinkInput[]) => {
    const id = await savePledgeLoanAPI({ ...loan, CustomerId: customerId ?? loan.CustomerId }, links);
    await reload();
    return id;
  }, [customerId, reload]);

  const recordRepayment = useCallback(async (req: RepaymentRequest) => {
    const { quote } = req;
    await recordPledgeRepaymentAPI(
      req.loanId,
      {
        RepaymentDate: req.date,
        Kind: req.kind,
        PrincipalPaid: quote.principal,
        InterestPaid: quote.interest,
        PenaltyPaid: quote.principalPenalty + quote.interestPenalty,
        OffsetSavingsBookId: req.kind === 'offset' ? req.offsetBookId : null,
        Note: null,
      },
      req.kind === 'offset' ? quote.offset?.savingsInterest ?? null : null
    );
    await reload();
  }, [reload]);

  return { bundle, loading, error, reload, saveBook, saveLoan, recordRepayment };
}
