import { supabase } from './supabase';
import type { ReceivableItem } from './debt';

export type InventoryDebtKind = 'receivable' | 'payable';

export interface InventoryDebtRow {
  Id: string;
  Kind: InventoryDebtKind;
  CategoryName: string;
  Code: string;
  Name: string;
  BeginningDebit: number | string;
  BeginningCredit: number | string;
  OccurredDebit: number | string;
  OccurredCredit: number | string;
}

const TABLE = 'InventoryDebtItems';
const PAGE_SIZE = 1000;

export function debtFromRow(row: InventoryDebtRow): ReceivableItem {
  return {
    id: row.Id,
    code: row.Code,
    name: row.Name,
    beginningDebit: Number(row.BeginningDebit) || 0,
    beginningCredit: Number(row.BeginningCredit) || 0,
    occurredDebit: Number(row.OccurredDebit) || 0,
    occurredCredit: Number(row.OccurredCredit) || 0,
  };
}

export function debtToRow(item: ReceivableItem, kind: InventoryDebtKind, categoryName: string): InventoryDebtRow & { UpdatedAt: string } {
  return {
    Id: item.id,
    Kind: kind,
    CategoryName: categoryName,
    Code: item.code,
    Name: item.name,
    BeginningDebit: item.beginningDebit,
    BeginningCredit: item.beginningCredit,
    OccurredDebit: item.occurredDebit,
    OccurredCredit: item.occurredCredit,
    UpdatedAt: new Date().toISOString(),
  };
}

export function splitDebtRows(rows: InventoryDebtRow[]): Record<InventoryDebtKind, ReceivableItem[]> {
  return {
    receivable: rows.filter(r => r.Kind === 'receivable').map(debtFromRow),
    payable: rows.filter(r => r.Kind === 'payable').map(debtFromRow),
  };
}

export async function fetchInventoryDebtsDb(categoryName: string): Promise<Record<InventoryDebtKind, ReceivableItem[]>> {
  const rows: InventoryDebtRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('Id,Kind,CategoryName,Code,Name,BeginningDebit,BeginningCredit,OccurredDebit,OccurredCredit')
      .eq('CategoryName', categoryName)
      .order('CreatedAt', { ascending: false })
      .order('Id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as InventoryDebtRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return splitDebtRows(rows);
}

export async function saveInventoryDebtDb(item: ReceivableItem, kind: InventoryDebtKind, categoryName: string): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(debtToRow(item, kind, categoryName));
  if (error) throw new Error(error.message);
}

export async function deleteInventoryDebtDb(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('Id', id);
  if (error) throw new Error(error.message);
}
