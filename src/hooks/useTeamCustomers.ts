import { useEffect, useState } from 'react';
import { fetchTeamCustomerDossier, fetchTeamCustomers } from '../lib/api/teamCustomerApi';
import type { Customer } from '../types';

export function useTeamCustomers(userId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, selectCustomer] = useState<number | null>(null);
  const [dossier, setDossier] = useState<Awaited<ReturnType<typeof fetchTeamCustomerDossier>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setCustomers([]);
    setDossier(null);
    selectCustomer(null);
    setError(null);
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    void fetchTeamCustomers(userId).then(rows => {
      if (!cancelled) { setCustomers(rows); setLoading(false); }
    }).catch(cause => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);
  useEffect(() => {
    let cancelled = false;
    setDossier(null);
    if (customerId === null) return;
    setError(null);
    setLoading(true);
    void fetchTeamCustomerDossier(customerId).then(value => {
      if (!cancelled) { setDossier(value); setLoading(false); }
    }).catch(cause => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [customerId, userId]);
  return { customers, dossier, customerId, selectCustomer, error, loading };
}
