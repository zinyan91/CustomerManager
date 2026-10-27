import { supabase } from '../supabase';
import type { SavingsBook } from '../../types';
import { savingsMaturityDate } from '../savingsBook';
import { applyOwnerScope, customerEmbed, type OwnerScope } from '../ownerScope';
import { getActiveOwnerScope } from '../ownerScopeStore';

const EDITABLE_COLUMNS = [
  'BookNumber', 'DepositType', 'Currency', 'ExchangeRate', 'Amount', 'InterestRate', 'OpenDate',
  'Tenor', 'TenorUnit', 'InterestPaymentMethod', 'PaidInterest', 'Note',
] as const satisfies ReadonlyArray<keyof SavingsBook>;

function savingsBookDbError(err: { code?: string; message?: string } | null, bookNumber: string, isUpdate: boolean): Error {
  if (err?.code === '23505') return new Error(`Số sổ "${bookNumber}" đã tồn tại trên hệ thống.`);
  if (isUpdate && err?.code === 'PGRST116') return new Error(`Sổ ${bookNumber} đã tất toán hoặc bạn không còn quyền sửa.`);
  return new Error(err?.message || 'Không lưu được sổ tiết kiệm.');
}

export async function fetchSavingsBooksByCustomerAPI(customerId: number): Promise<SavingsBook[]> {
  const { data, error } = await supabase
    .from('SavingsBooks')
    .select('*')
    .eq('CustomerId', customerId)
    .order('OpenDate', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as SavingsBook[];
}

export async function fetchAllSavingsBooksAPI(scope: OwnerScope = getActiveOwnerScope()): Promise<SavingsBook[]> {
  const { data, error } = await applyOwnerScope(
    supabase.from('SavingsBooks').select(`*, ${customerEmbed(scope)}` as '*'),
    scope,
    'customer.OwnerId'
  );
  if (error) throw new Error(error.message);
  return (data || []) as SavingsBook[];
}

export async function saveSavingsBookAPI(book: Partial<SavingsBook>): Promise<SavingsBook> {
  const bookNumber = (book.BookNumber || '').trim();
  const row: Record<string, unknown> = Object.fromEntries(
    EDITABLE_COLUMNS.filter((k) => k in book).map((k) => [k, book[k]])
  );
  row.BookNumber = bookNumber;
  row.MaturityDate = savingsMaturityDate({ ...(book as SavingsBook), MaturityDate: null });
  const query = book.Id
    ? supabase.from('SavingsBooks').update(row).eq('Id', book.Id).eq('IsClosed', false)
    : supabase.from('SavingsBooks').insert({ ...row, CustomerId: book.CustomerId });
  const { data, error } = await query.select().single();
  if (error) throw savingsBookDbError(error, bookNumber, Boolean(book.Id));
  return data as SavingsBook;
}
