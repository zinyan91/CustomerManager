import { supabase } from '../supabase';
import type { Customer } from '../../types';
import {
  customerDeleteBlockers, customerDeleteBlockedMessage, type CustomerLinkCounts,
} from '../customerStatus';

export async function fetchCustomersAPI(filters?: { cif?: string; name?: string; nationalId?: string }): Promise<Customer[]> {
  try {
    let query = supabase.from('Customers').select('*').limit(1000);
    if (filters?.cif) query = query.ilike('CifKh', `%${filters.cif}%`);
    if (filters?.name) query = query.ilike('FullName', `%${filters.name}%`);
    if (filters?.nationalId) query = query.ilike('NationalId', `%${filters.nationalId}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
  } catch (err: any) {
    console.error("fetchCustomersAPI error:", err);
    return [];
  }
}

export async function saveCustomerAPI(customer: Partial<Customer>): Promise<Customer> {
  const isUpdate = !!customer.Id;
  const cif = (customer.CifKh || '').trim();
  const name = (customer.FullName || '').trim();
  const nationalId = (customer.NationalId || '').trim();

  if (!cif) {
    throw new Error('Mã CIF Khách hàng là bắt buộc!');
  }
  if (!name) {
    throw new Error('Họ tên Khách hàng là bắt buộc!');
  }

  const { data: cifCheck } = await supabase
    .from('Customers')
    .select('Id, FullName, CifKh')
    .eq('CifKh', cif);

  const duplicateCif = (cifCheck || []).find(c => c.Id !== customer.Id);
  if (duplicateCif) {
    throw new Error(`Mã CIF "${cif}" đã tồn tại trên hệ thống (thuộc KH: ${duplicateCif.FullName})!`);
  }

  if (nationalId) {
    const { data: idCheck } = await supabase
      .from('Customers')
      .select('Id, FullName, NationalId')
      .eq('NationalId', nationalId);

    const duplicateId = (idCheck || []).find(c => c.Id !== customer.Id);
    if (duplicateId) {
      throw new Error(`Số CCCD/CMND "${nationalId}" đã tồn tại trên hệ thống (thuộc KH: ${duplicateId.FullName})!`);
    }
  }

  if (!isUpdate) {
    delete customer.Id;

    if (!customer.OwnerId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        customer.OwnerId = session.user.id;
      }
    }
  }

  customer.CifKh = cif;
  customer.FullName = name;
  customer.NationalId = nationalId || null;

  if (isUpdate) {
    const { data, error } = await supabase.from('Customers').update(customer).eq('Id', customer.Id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('Customers').insert([customer]).select().single();
    if (error) throw error;
    return data;
  }
}

async function countRowsFor(table: string, customerId: number): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('Id', { count: 'exact', head: true })
    .eq('CustomerId', customerId);
  if (error) throw error;
  return count || 0;
}

export async function fetchCustomerLinkCountsAPI(customerId: number): Promise<CustomerLinkCounts> {
  const [kunn, hdtd, collaterals, cards] = await Promise.all([
    countRowsFor('LoanContracts', customerId),
    countRowsFor('CreditContracts', customerId),
    countRowsFor('Collaterals', customerId),
    countRowsFor('CardContracts', customerId),
  ]);
  return { kunn, hdtd, collaterals, cards };
}

export async function deleteCustomerAPI(id: number): Promise<void> {
  if (!id) throw new Error('Thiếu khách hàng!');

  const blocked = customerDeleteBlockedMessage(
    customerDeleteBlockers(await fetchCustomerLinkCountsAPI(id))
  );
  if (blocked) throw new Error(blocked);

  const { data, error } = await supabase.from('Customers').delete().eq('Id', id).select();
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Không xoá được hồ sơ: vẫn còn bản ghi tín dụng gắn với khách hàng này. Nạp lại danh sách rồi thử lại.'
      );
    }
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Xoá thất bại: bạn không có quyền xoá hồ sơ này, hoặc hồ sơ đã bị xoá trước đó.');
  }
}

export async function setCustomerArchivedAPI(
  customerId: number, archived: boolean
): Promise<Customer> {
  if (!customerId) throw new Error('Thiếu khách hàng!');

  const { data, error } = await supabase
    .from('Customers')
    .update({ ArchivedAt: archived ? new Date().toISOString() : null })
    .eq('Id', customerId)
    .select()
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error(archived
      ? 'Không lưu trữ được hồ sơ: không có dòng nào bị tác động.'
      : 'Không bỏ lưu trữ được hồ sơ: không có dòng nào bị tác động.');
  }
  return data;
}

export async function unarchiveCustomer(customerId?: number | null): Promise<void> {
  if (!customerId) return;
  await supabase
    .from('Customers')
    .update({ ArchivedAt: null })
    .eq('Id', customerId)
    .not('ArchivedAt', 'is', null);
}
