import { supabase } from '../supabase';
import { parseTransferCounts, type TransferCounts, type TransferCustomer } from '../customerTransfer';

const MISSING_CODES = ['PGRST202', 'PGRST205', '42883', '42P01'];

function failure(action: string, error: { code?: string; message: string }): Error {
  if (error.code && MISSING_CODES.includes(error.code)) {
    return new Error('Chưa áp migration 66_chuyen_giao_khach_hang.sql trên Supabase.');
  }
  return new Error(`${action}: ${error.message}`);
}

export interface TransferLogEntry {
  id: number;
  fromUserId: string | null;
  toUserId: string | null;
  customerCount: number;
  counts: TransferCounts;
  transferredBy: string | null;
  transferredAt: string;
}

export async function fetchCustomersOf(userId: string): Promise<TransferCustomer[]> {
  const { data, error } = await supabase
    .from('Customers')
    .select('Id, CifKh, FullName')
    .eq('OwnerId', userId)
    .order('FullName');
  if (error) throw failure('Không nạp được khách hàng của người chuyển', error);
  return (data ?? []).map((r) => ({ id: r.Id as number, cif: (r.CifKh as string | null) ?? '', name: (r.FullName as string | null) ?? '' }));
}

export async function previewTransfer(fromUserId: string, customerIds: readonly number[]): Promise<TransferCounts> {
  const { data, error } = await supabase.rpc('customer_transfer_preview', { p_from: fromUserId, p_customer_ids: [...customerIds] });
  if (error) throw failure('Không xem trước được chuyển giao', error);
  return parseTransferCounts(data);
}

export async function transferCustomers(fromUserId: string, toUserId: string, customerIds: readonly number[]): Promise<TransferCounts> {
  const { data, error } = await supabase.rpc('transfer_customers', { p_from: fromUserId, p_to: toUserId, p_customer_ids: [...customerIds] });
  if (error) throw failure('Không chuyển giao được', error);
  return parseTransferCounts(data);
}

export async function fetchTransferHistory(limit = 50): Promise<TransferLogEntry[]> {
  const { data, error } = await supabase
    .from('CustomerTransfers')
    .select('Id, FromUserId, ToUserId, CustomerIds, Counts, TransferredBy, TransferredAt')
    .order('TransferredAt', { ascending: false })
    .limit(limit);
  if (error) throw failure('Không nạp được nhật ký chuyển giao', error);
  return (data ?? []).map((r) => ({
    id: r.Id as number,
    fromUserId: r.FromUserId as string | null,
    toUserId: r.ToUserId as string | null,
    customerCount: (r.CustomerIds as number[]).length,
    counts: parseTransferCounts(r.Counts),
    transferredBy: r.TransferredBy as string | null,
    transferredAt: r.TransferredAt as string,
  }));
}
