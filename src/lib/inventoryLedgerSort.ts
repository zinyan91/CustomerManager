import { computeItemRow, type InventoryItem } from './inventory';
import { computeReceivableItemRow, type ReceivableItem } from './debt';
import type { SortAccessors } from './tableSort';

export type InventorySortKey =
  | 'code' | 'name' | 'unit' | 'unitPrice' | 'beginningQty' | 'importQty' | 'exportQty' | 'endingQty' | 'endingValue';

export type DebtSortKey =
  | 'code' | 'name' | 'beginningDebit' | 'beginningCredit' | 'occurredDebit' | 'occurredCredit' | 'endingDebit' | 'endingCredit';

export const INVENTORY_SORT_ACCESSORS: SortAccessors<InventoryItem, InventorySortKey> = {
  code: item => item.code,
  name: item => item.name,
  unit: item => item.unit,
  unitPrice: item => item.unitPrice,
  beginningQty: item => item.beginningQty,
  importQty: item => item.importQty,
  exportQty: item => item.exportQty,
  endingQty: item => computeItemRow(item).endingQty,
  endingValue: item => computeItemRow(item).endingValue,
};

export const DEBT_SORT_ACCESSORS: SortAccessors<ReceivableItem, DebtSortKey> = {
  code: item => item.code,
  name: item => item.name,
  beginningDebit: item => item.beginningDebit,
  beginningCredit: item => item.beginningCredit,
  occurredDebit: item => item.occurredDebit,
  occurredCredit: item => item.occurredCredit,
  endingDebit: item => computeReceivableItemRow(item).endingDebit,
  endingCredit: item => computeReceivableItemRow(item).endingCredit,
};

export const INVENTORY_SORT_KEYS = Object.keys(INVENTORY_SORT_ACCESSORS) as InventorySortKey[];
export const DEBT_SORT_KEYS = Object.keys(DEBT_SORT_ACCESSORS) as DebtSortKey[];
