import { supabase } from '../supabase';
import type { SavingsBook } from '../../types';
import { savingsMaturityDate } from '../savingsBook';
import { applyOwnerScope, customerEmbed, type OwnerScope } from '../ownerScope';
import { getActiveOwnerScope } from '../ownerScopeStore';

function savingsBookDbError(err: { code?: string; message?: string } | null, bookNumber: string): Error {
  if (err?.code === '23505') return new Error(`Số sổ "${bookNumber}" đã tồn tại trên hệ thống.`);
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
  const { Id, CreatedAt: _createdAt, ...fields } = book;
  const row = {
    ...fields,
    BookNumber: bookNumber,
    MaturityDate: savingsMaturityDate({ ...(book as SavingsBook), MaturityDate: null }),
  };
  const query = Id
    ? supabase.from('SavingsBooks').update(row).eq('Id', Id)
    : supabase.from('SavingsBooks').insert(row);
  const { data, error } = await query.select().single();
  if (error) throw savingsBookDbError(error, bookNumber);
  return data as SavingsBook;
}
