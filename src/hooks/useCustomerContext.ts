import { useCallback, useEffect, useState } from 'react';
import type { Customer } from '../types';
import {
  fetchContractsByCustomerAPI, fetchCreditContractsByCustomerAPI,
  fetchCustomerByIdAPI, fetchOverdueSchedulesAPI, fetchPaidPrincipalForContractsAPI,
} from '../lib/api';
import { buildCustomerContext, type CustomerContextSummary } from '../lib/customerContext';
import { todayIso } from '../lib/utils';

export interface CustomerContextState {
  customer: Customer | null;
  summary: CustomerContextSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useCustomerContext(customerId: number | null): CustomerContextState {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerContextSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lanNap, setLanNap] = useState(0);

  const reload = useCallback(() => setLanNap(n => n + 1), []);

  useEffect(() => {
    if (customerId === null) {
      setCustomer(null);
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    let huy = false;
    const today = todayIso();

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [khach, hdtds, kunns] = await Promise.all([
          fetchCustomerByIdAPI(customerId),
          fetchCreditContractsByCustomerAPI(customerId),
          fetchContractsByCustomerAPI(customerId),
        ]);
        if (huy) return;

        if (!khach) {
          setCustomer(null);
          setSummary(null);
          setError('Không tìm thấy khách hàng hoặc bạn không có quyền truy cập.');
          return;
        }

        const kunnIds = kunns.map(k => k.Id);
        const [paidPrincipal, overdueSchedules] = kunnIds.length === 0
          ? [{}, []]
          : await Promise.all([
              fetchPaidPrincipalForContractsAPI(kunnIds),
              fetchOverdueSchedulesAPI(kunnIds, today),
            ]);
        if (huy) return;

        setCustomer(khach);
        setSummary(buildCustomerContext({
          creditContracts: hdtds, kunns, paidPrincipal, overdueSchedules, today,
        }));
      } catch (err) {
        if (huy) return;
        setCustomer(null);
        setSummary(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!huy) setLoading(false);
      }
    })();

    return () => { huy = true; };
  }, [customerId, lanNap]);

  return { customer, summary, loading, error, reload };
}
