import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer } from '../types';
import { fetchCustomersStrictAPI } from '../lib/api/customerApi';
import { fetchCustomerLoanSourceStrictAPI, type CustomerLoanSource } from '../lib/api/settlementEstimateApi';
import { filterActiveCustomers } from '../lib/customerStatus';
import { openLoansForEstimate } from '../lib/settlementEstimateSource';
import { reportErrorMessage } from '../lib/reports/errorMessage';

export function useSettlementEstimateImport(settlementDate: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [source, setSource] = useState<CustomerLoanSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    fetchCustomersStrictAPI()
      .then(list => { if (alive) setCustomers(filterActiveCustomers(list)); })
      .catch(err => { if (alive) setError(reportErrorMessage(err)); });
    return () => { alive = false; };
  }, []);

  const selectCustomer = async (id: number | null) => {
    const current = ++seq.current;
    setCustomerId(id);
    setSource(null);
    setError(null);
    if (id === null) return;
    setLoading(true);
    try {
      const data = await fetchCustomerLoanSourceStrictAPI(id);
      if (current === seq.current) setSource(data);
    } catch (err) {
      if (current === seq.current) setError(reportErrorMessage(err));
    } finally {
      if (current === seq.current) setLoading(false);
    }
  };

  const result = useMemo(
    () => (source ? openLoansForEstimate(source, settlementDate) : null),
    [source, settlementDate],
  );

  return { customers, customerId, selectCustomer, loading, error, loans: result?.loans ?? null, skipped: result?.skipped ?? [] };
}

export type SettlementEstimateImport = ReturnType<typeof useSettlementEstimateImport>;
