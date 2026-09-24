import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMortgageContractsAPI, fetchCollateralsByCustomerAPI, fetchCreditContractsByCustomerAPI,
  saveMortgageContractAPI, deleteMortgageContractAPI, MortgageLinkSaveError,
} from '../lib/api';
import {
  emptyMortgageDraft, filterMortgageContracts, paginate, validateMortgageContract,
  type MortgageContractDraft, type MortgageStatusFilter,
} from '../lib/mortgageContract';
import { useSelectedCustomerId } from './useSelectedCustomerId';
import { useConfirm } from '../context/ConfirmContext';
import type { Collateral, CreditContract, MortgageContract } from '../types';

export const MORTGAGE_PAGE_SIZE = 10;

type Notice = { type: 'success' | 'error'; message: string };

export function useMortgageContractController() {
  const customerId = useSelectedCustomerId();
  const confirm = useConfirm();

  const [mortgages, setMortgages] = useState<MortgageContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatusState] = useState<MortgageStatusFilter>('active');
  const [query, setQueryState] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MortgageContract | null>(null);
  const [draft, setDraft] = useState<MortgageContractDraft | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<Notice | null>(null);
  const tokenRef = useRef(0);

  const load = useCallback(async (id: number | null): Promise<MortgageContract[]> => {
    const token = ++tokenRef.current;
    if (id === null) {
      setMortgages([]); setCollaterals([]); setCreditContracts([]);
      return [];
    }
    setLoading(true);
    try {
      const [list, cols, ccs] = await Promise.all([
        fetchMortgageContractsAPI(id),
        fetchCollateralsByCustomerAPI(id),
        fetchCreditContractsByCustomerAPI(id),
      ]);
      if (tokenRef.current !== token) return [];
      setMortgages(list); setCollaterals(cols); setCreditContracts(ccs);
      return list;
    } catch (err) {
      if (tokenRef.current === token) setNotification({ type: 'error', message: (err as Error).message });
      return [];
    } finally {
      if (tokenRef.current === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDraft(null); setEditing(null); setFormErrors([]); setPage(1);
    load(customerId);
  }, [customerId, load]);

  const setStatus = useCallback((s: MortgageStatusFilter) => { setStatusState(s); setPage(1); }, []);
  const setQuery = useCallback((q: string) => { setQueryState(q); setPage(1); }, []);

  const filtered = useMemo(() => filterMortgageContracts(mortgages, { status, query }), [mortgages, status, query]);
  const paged = useMemo(() => paginate(filtered, page, MORTGAGE_PAGE_SIZE), [filtered, page]);

  const openNew = useCallback(() => {
    if (customerId === null) return;
    setEditing(null); setDraft(emptyMortgageDraft(customerId)); setFormErrors([]);
  }, [customerId]);

  const openEdit = useCallback((m: MortgageContract) => {
    setEditing(m);
    setDraft({ ...m, CollateralIds: [...m.CollateralIds], CreditContractIds: [...m.CreditContractIds] });
    setFormErrors([]);
  }, []);

  const closeForm = useCallback(() => { setDraft(null); setEditing(null); setFormErrors([]); }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    const errors = validateMortgageContract(draft, mortgages);
    setFormErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      await saveMortgageContractAPI(draft, editing);
      setNotification({ type: 'success', message: `Đã lưu HĐTC "${draft.MortgageNumber.trim()}".` });
      closeForm();
      await load(customerId);
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
      if (err instanceof MortgageLinkSaveError) {
        const list = await load(customerId);
        const saved = list.find(m => m.Id === err.mortgageId) ?? null;
        setEditing(saved);
        setDraft(d => (d ? { ...d, Id: err.mortgageId } : d));
      }
    } finally {
      setSaving(false);
    }
  }, [draft, editing, mortgages, closeForm, load, customerId]);

  const remove = useCallback(async (m: MortgageContract) => {
    if (!m.IsReleased) {
      setNotification({ type: 'error', message: 'HĐTC chưa giải chấp nên chưa xoá được. Ghi nhận giải chấp trước.' });
      return;
    }
    const ok = await confirm({
      title: 'Xoá hợp đồng thế chấp',
      message: `XOÁ VĨNH VIỄN HĐTC "${m.MortgageNumber}"?\n\nHành động này KHÔNG THỂ hoàn tác.`,
      confirmText: 'Xoá HĐTC',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMortgageContractAPI(m.Id);
      setNotification({ type: 'success', message: `Đã xoá HĐTC "${m.MortgageNumber}".` });
      if (draft?.Id === m.Id) closeForm();
      await load(customerId);
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
    }
  }, [confirm, draft, closeForm, load, customerId]);

  return {
    customerId, loading, mortgages, collaterals, creditContracts,
    status, setStatus, query, setQuery, filtered, paged, setPage,
    draft, setDraft, formErrors, saving,
    openNew, openEdit, closeForm, save, remove,
    notification, setNotification,
  };
}
