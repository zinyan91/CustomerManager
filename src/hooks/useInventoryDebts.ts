import { useCallback, useEffect, useState } from 'react';
import type { ReceivableItem } from '../lib/debt';
import {
  deleteInventoryDebtDb, fetchInventoryDebtsDb, saveInventoryDebtDb, type InventoryDebtKind,
} from '../lib/inventoryDebtDb';

type Notify = (type: 'success' | 'error', message: string) => void;

export function useInventoryDebts(categoryName: string, showNotify: Notify) {
  const [lists, setLists] = useState<Record<InventoryDebtKind, ReceivableItem[]>>({ receivable: [], payable: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchInventoryDebtsDb(categoryName)
      .then(next => { if (active) setLists(next); })
      .catch((err: Error) => {
        if (!active) return;
        setLists({ receivable: [], payable: [] });
        setError(err.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryName, revision]);

  const reload = useCallback(() => setRevision(r => r + 1), []);

  const persist = useCallback((kind: InventoryDebtKind, item: ReceivableItem) => {
    saveInventoryDebtDb(item, kind, categoryName)
      .catch((err: Error) => showNotify('error', `Chưa lưu được "${item.name}": ${err.message}`));
  }, [categoryName, showNotify]);

  const addDebt = useCallback((kind: InventoryDebtKind, item: ReceivableItem) => {
    setLists(prev => ({ ...prev, [kind]: [item, ...prev[kind]] }));
    persist(kind, item);
  }, [persist]);

  const updateDebt = useCallback((kind: InventoryDebtKind, id: string, patch: Partial<ReceivableItem>) => {
    const current = lists[kind].find(it => it.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setLists(prev => ({ ...prev, [kind]: prev[kind].map(it => (it.id === id ? updated : it)) }));
    persist(kind, updated);
  }, [lists, persist]);

  const removeDebt = useCallback((kind: InventoryDebtKind, id: string) => {
    setLists(prev => ({ ...prev, [kind]: prev[kind].filter(it => it.id !== id) }));
    deleteInventoryDebtDb(id).catch((err: Error) => showNotify('error', `Chưa xóa được trên CSDL: ${err.message}`));
  }, [showNotify]);

  return {
    receivables: lists.receivable,
    payables: lists.payable,
    loading,
    error,
    reload,
    addDebt,
    updateDebt,
    removeDebt,
  };
}
