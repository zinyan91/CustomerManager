import { supabase } from '../supabase';
import type { CreditContract } from '../../types';
import { unarchiveCustomer, fetchCustomerIdsInScopeAPI } from './customerApi';
import { fetchByCustomerScope, type OwnerScope } from '../ownerScope';
import { getActiveOwnerScope } from '../ownerScopeStore';
import { mortgageLinkErrorMessage } from '../mortgageContract';

export async function fetchCreditContractsByCustomerAPI(customerId: number): Promise<CreditContract[]> {
  try {
    const { data, error } = await supabase
      .from('CreditContracts')
      .select('*')
      .eq('CustomerId', customerId)
      .order('HdtdNumber', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchCreditContractsByCustomerAPI error:', err);
    return [];
  }
}

export async function fetchAllCreditContractsAPI(scope: OwnerScope = getActiveOwnerScope()): Promise<CreditContract[]> {
  const ids = await fetchCustomerIdsInScopeAPI(scope);
  return fetchByCustomerScope<CreditContract>(
    ids,
    async (part) => {
      let query = supabase.from('CreditContracts').select('*').order('HdtdNumber', { ascending: true });
      if (part) query = query.in('CustomerId', part);
      const { data, error } = await query;
      if (error) throw new Error(`Không nạp được danh sách HĐTD: ${error.message}`);
      return data || [];
    },
    (a, b) => (a.HdtdNumber || '').localeCompare(b.HdtdNumber || '')
  );
}

export async function saveCreditContractAPI(cc: Partial<CreditContract>): Promise<CreditContract> {
  const isUpdate = !!cc.Id;
  const hdtdNumber = (cc.HdtdNumber || '').trim();

  if (!cc.CustomerId) throw new Error('Khách hàng vay là bắt buộc!');
  if (!hdtdNumber) throw new Error('Số Hợp đồng tín dụng là bắt buộc!');

  const clean: any = { ...cc, HdtdNumber: hdtdNumber };
  delete clean.customer;
  if (!isUpdate) delete clean.Id;

  clean.IsClosed = clean.IsClosed ?? false;

  const q = isUpdate
    ? supabase.from('CreditContracts').update(clean).eq('Id', clean.Id).select('*').single()
    : supabase.from('CreditContracts').insert([clean]).select('*').single();

  const { data, error } = await q;
  if (error) {
    if (error.code === '23505' || /uq_credit_contract_number|duplicate key/i.test(error.message)) {
      throw new Error(`Số HĐTD "${hdtdNumber}" đã tồn tại cho khách hàng này!`);
    }
    throw error;
  }
  if (!isUpdate && !data.IsClosed) await unarchiveCustomer(data.CustomerId);
  return data;
}

export async function deleteCreditContractAPI(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('CreditContracts')
    .delete()
    .eq('Id', id)
    .select('Id');
  if (error) {
    const mortgageMessage = mortgageLinkErrorMessage(error, 'credit_contract');
    if (mortgageMessage) throw new Error(mortgageMessage);
    if (error.code === '23503') {
      const n = await countKunnOfCreditContractAPI(id);
      throw new Error(`Không xoá được HĐTD: còn ${n} KUNN đang gắn với hợp đồng này. Xoá KUNN trước.`);
    }
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Không xoá được HĐTD: không có quyền hoặc hợp đồng đã bị xoá.');
  }
}

export async function countKunnOfCreditContractAPI(creditContractId: number): Promise<number> {
  const { count, error } = await supabase
    .from('LoanContracts')
    .select('Id', { count: 'exact', head: true })
    .eq('CreditContractId', creditContractId);
  if (error) throw error;
  return count || 0;
}
