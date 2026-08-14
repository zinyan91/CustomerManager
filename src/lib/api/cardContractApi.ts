import { supabase } from '../supabase';
import type { CardContract, CardSupplementaryHolder } from '../../types';
import { CARD_TENOR_MONTHS } from '../cardContract';
import { unarchiveCustomer } from './customerApi';

export async function fetchCardContractsAPI(): Promise<CardContract[]> {
  try {
    const { data, error } = await supabase.from('CardContracts').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) =>
      (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));
  } catch (err) {
    console.error('fetchCardContractsAPI error:', err);
    return [];
  }
}

export async function fetchCardContractsByCustomerAPI(customerId: number): Promise<CardContract[]> {
  const { data, error } = await supabase
    .from('CardContracts')
    .select('*')
    .eq('CustomerId', customerId)
    .order('CardContractNumber', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCardSupplementaryHoldersAPI(
  cardContractId: number
): Promise<CardSupplementaryHolder[]> {
  const { data, error } = await supabase
    .from('CardSupplementaryHolders')
    .select('*')
    .eq('CardContractId', cardContractId)
    .order('Id', { ascending: true });
  if (error) throw error;
  return data || [];
}

function cardContractDbError(err: any, contractNumber: string): Error {
  const msg = String(err?.message || '');
  if (err?.code === '23505' || err?.code === '23000' || /duplicate key/i.test(msg)) {
    return new Error(`Số hợp đồng thẻ "${contractNumber}" đã tồn tại trên hệ thống.`);
  }
  if (/CardContracts_CoTSBD_phai_gan_tai_san/.test(msg)) {
    return new Error('Khoản cấp tín dụng có TSBĐ phải gán tài sản bảo đảm.');
  }
  if (/CardContracts_ChuThe_hop_le/.test(msg)) {
    return new Error('Chủ thẻ chỉ nhận giá trị KH hoặc KHLQ.');
  }
  if (/CardContracts_LoaiTSBD_hop_le/.test(msg)) {
    return new Error('Loại TSBĐ không hợp lệ.');
  }
  if (err?.code === '23503') {
    return new Error('Không lưu được: khách hàng hoặc tài sản bảo đảm được tham chiếu không còn tồn tại.');
  }
  return err instanceof Error ? err : new Error(msg || 'Không lưu được hợp đồng thẻ.');
}

export async function saveCardContractAPI(
  contract: Partial<CardContract>
): Promise<CardContract> {
  const isUpdate = !!contract.Id;
  const contractNumber = (contract.CardContractNumber || '').trim();

  if (!contract.CustomerId) throw new Error('Khách hàng của hợp đồng thẻ là bắt buộc!');
  if (!contractNumber) throw new Error('Số hợp đồng thẻ là bắt buộc!');

  const { customer: _customer, ...raw } = contract as any;

  const payload: any = {
    CustomerId: Number(raw.CustomerId),
    CardContractNumber: contractNumber,
    CardHolderSide: raw.CardHolderSide || 'KH',
    CardHolderName: raw.CardHolderName || null,
    CardProducts: raw.CardProducts || null,
    GrantedLimit: raw.GrantedLimit === null || raw.GrantedLimit === undefined
      ? null
      : Number(raw.GrantedLimit),
    PolicyCode: raw.PolicyCode || null,
    CollateralKind: raw.CollateralKind || null,
    CollateralId: raw.CollateralId ? Number(raw.CollateralId) : null,
    TenorMonths: Number(raw.TenorMonths ?? CARD_TENOR_MONTHS),
    IssueDate: raw.IssueDate || null,
    ExpiryDate: raw.ExpiryDate || null,
    IsClosed: !!raw.IsClosed,
    Note: raw.Note || null,
  };

  const q = isUpdate
    ? supabase.from('CardContracts').update(payload).eq('Id', raw.Id).select('*, customer:Customers(*)').single()
    : supabase.from('CardContracts').insert([payload]).select('*, customer:Customers(*)').single();

  const { data, error } = await q;
  if (error) throw cardContractDbError(error, contractNumber);
  await unarchiveCustomer(data?.CustomerId);
  return data;
}

export async function replaceCardSupplementaryHoldersAPI(
  cardContractId: number,
  holders: Pick<CardSupplementaryHolder, 'FullName' | 'Relation' | 'RelationNote' | 'NationalId'>[]
): Promise<CardSupplementaryHolder[]> {
  const { error: delErr } = await supabase
    .from('CardSupplementaryHolders')
    .delete()
    .eq('CardContractId', cardContractId);
  if (delErr) throw delErr;

  if (holders.length === 0) return [];

  const rows = holders.map(h => ({
    CardContractId: cardContractId,
    FullName: (h.FullName || '').trim(),
    Relation: (h.Relation || '').trim(),
    RelationNote: h.RelationNote || null,
    NationalId: h.NationalId || null,
  }));

  const { data, error } = await supabase
    .from('CardSupplementaryHolders')
    .insert(rows)
    .select();
  if (error) {
    if (/chi co toi da 2 the phu|tối đa 2 thẻ phụ/i.test(String(error.message))) {
      throw new Error('Một thẻ chính chỉ có tối đa 2 thẻ phụ.');
    }
    throw error;
  }
  return data || [];
}

export async function deleteCardContractAPI(id: number): Promise<void> {
  const { data, error } = await supabase.from('CardContracts').delete().eq('Id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Xoá thất bại: bạn không có quyền xoá hợp đồng thẻ này, hoặc bản ghi đã bị xoá trước đó.');
  }
}
