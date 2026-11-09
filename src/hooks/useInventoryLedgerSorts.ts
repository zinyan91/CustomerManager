import { useCallback, useEffect, useState } from 'react';
import { nextSortState, parseSortState, type SortState } from '../lib/tableSort';
import { DEBT_SORT_KEYS, INVENTORY_SORT_KEYS, type DebtSortKey, type InventorySortKey } from '../lib/inventoryLedgerSort';

const STORAGE_KEY = 'customer_manager_inventory_sorts_v1';

interface LedgerSorts {
  inventory: SortState<InventorySortKey> | null;
  receivables: SortState<DebtSortKey> | null;
  payables: SortState<DebtSortKey> | null;
}

function readStoredSorts(): LedgerSorts {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? {};
    return {
      inventory: parseSortState(raw.inventory, INVENTORY_SORT_KEYS),
      receivables: parseSortState(raw.receivables, DEBT_SORT_KEYS),
      payables: parseSortState(raw.payables, DEBT_SORT_KEYS),
    };
  } catch {
    return { inventory: null, receivables: null, payables: null };
  }
}

export function useInventoryLedgerSorts() {
  const [sorts, setSorts] = useState<LedgerSorts>(readStoredSorts);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorts));
    } catch {
      // Trình duyệt chặn lưu trữ (chế độ riêng tư): vẫn sắp xếp được, chỉ không nhớ sau khi tải lại.
    }
  }, [sorts]);

  const toggleInventorySort = useCallback((key: InventorySortKey) =>
    setSorts(prev => ({ ...prev, inventory: nextSortState(prev.inventory, key) })), []);
  const toggleReceivableSort = useCallback((key: DebtSortKey) =>
    setSorts(prev => ({ ...prev, receivables: nextSortState(prev.receivables, key) })), []);
  const togglePayableSort = useCallback((key: DebtSortKey) =>
    setSorts(prev => ({ ...prev, payables: nextSortState(prev.payables, key) })), []);

  return {
    inventorySort: sorts.inventory,
    receivableSort: sorts.receivables,
    payableSort: sorts.payables,
    toggleInventorySort,
    toggleReceivableSort,
    togglePayableSort,
  };
}
