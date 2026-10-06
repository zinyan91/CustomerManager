import { supabase } from '../supabase';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { chunk } from '../utils';
import type { DuePeriodRow } from '../duePeriod';
import { findKunnNumberClash } from '../creditContract';
import { unarchiveCustomer } from './customerApi';
import { applyOwnerScope, customerEmbed, type OwnerScope } from '../ownerScope';
import { getActiveOwnerScope } from '../ownerScopeStore';

export async function fetchContractsStrictAPI(scope: OwnerScope = getActiveOwnerScope()): Promise<LoanContract[]> {
  const { data, error } = await applyOwnerScope(
    supabase.from('LoanContracts').select(`*, ${customerEmbed(scope)}` as '*'),
    scope,
    'customer.OwnerId'
  );
  if (error) throw error;
  return (data || []).sort((a: any, b: any) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));
}

export async function fetchContractsAPI(scope: OwnerScope = getActiveOwnerScope()): Promise<LoanContract[]> {
  try {
    return await fetchContractsStrictAPI(scope);
  } catch (err) {
    console.error("fetchContractsAPI error:", err);
    return [];
  }
}

export async function fetchContractsByCustomerAPI(customerId: number): Promise<LoanContract[]> {
  try {
    const { data, error } = await supabase
      .from('LoanContracts')
      .select('*, customer:Customers(*)')
      .eq('CustomerId', customerId)
      .order('Id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchContractsByCustomerAPI error:', err);
    return [];
  }
}

async function assertKunnNumberFree(contractNumber: string, selfId?: number | null): Promise<void> {
  if (!contractNumber) return;

  const { data, error } = await supabase
    .from('LoanContracts')
    .select('Id, ContractNumber')
    .ilike('ContractNumber', `%${contractNumber}%`);

  if (error) return;

  const clashId = findKunnNumberClash(contractNumber, data || [], selfId ?? null);
  if (clashId !== null) {
    throw new Error(
      `Số KUNN "${contractNumber}" đã được dùng cho khoản vay Id ${clashId}. `
      + 'Số KUNN là số chứng từ, không được trùng — đối chiếu GNN giấy rồi nhập số khác.'
    );
  }
}

function kunnNumberError(error: any, contractNumber: string): Error {
  if (error?.code === '23505') {
    return new Error(
      `Số KUNN "${contractNumber}" đã tồn tại trong hệ thống. `
      + 'Có thể khoản vay đó thuộc khách hàng của banker khác nên không hiện ra ở đây. '
      + 'Đối chiếu GNN giấy rồi nhập số khác.'
    );
  }
  return error;
}

export async function saveContractAPI(contract: Partial<LoanContract>): Promise<LoanContract> {
  const isUpdate = !!contract.Id;
  const contractNumber = (contract.ContractNumber || '').trim();

  if (!isUpdate) {
    if (!contract.CustomerId) {
      throw new Error('Khách hàng vay là bắt buộc!');
    }
    if (!contractNumber) {
      throw new Error('Số Hợp đồng tín dụng là bắt buộc!');
    }
  }

  const cleanContract: any = { ...contract };
  delete cleanContract.customer;
  delete cleanContract.collateral;
  delete cleanContract.contractCollaterals;


  if (!isUpdate) {
    delete cleanContract.Id;
  }

  cleanContract.ContractNumber = contractNumber;
  cleanContract.ContractType = cleanContract.ContractType ?? 0;
  cleanContract.IsSettled = cleanContract.IsSettled ?? false;
  cleanContract.IsRestructured = cleanContract.IsRestructured ?? false;

  await assertKunnNumberFree(contractNumber, isUpdate ? cleanContract.Id : null);

  if (isUpdate) {
    const { data, error } = await supabase
      .from('LoanContracts')
      .update(cleanContract)
      .eq('Id', cleanContract.Id)
      .select('*, customer:Customers(*)')
      .single();
    if (error) throw kunnNumberError(error, contractNumber);
    await unarchiveCustomer(data?.CustomerId);
    return data;
  } else {
    const { data, error } = await supabase
      .from('LoanContracts')
      .insert([cleanContract])
      .select('*, customer:Customers(*)')
      .single();
    if (error) throw kunnNumberError(error, contractNumber);
    await unarchiveCustomer(data?.CustomerId);
    return data;
  }
}

export async function deleteContractAPI(contractId: number): Promise<void> {
  if (!contractId) throw new Error('Thiếu khoản vay!');

  const { data, error } = await supabase
    .from('LoanContracts')
    .delete()
    .eq('Id', contractId)
    .select('Id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Xoá thất bại: bạn không có quyền xoá KUNN này, hoặc khoản vay đã bị xoá trước đó.');
  }
}

export async function fetchRepaymentSchedulesAPI(contractId: number): Promise<RepaymentSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('RepaymentSchedules')
      .select('*')
      .eq('ContractId', contractId)
      .order('PeriodNumber', { ascending: true })
      .limit(1000);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchRepaymentSchedulesAPI error:', err);
    return [];
  }
}

const SCHEDULE_COLUMNS = 'Id, ContractId, PeriodNumber, DueDate, TotalAmount, IsPaid';
const SCHEDULE_PAGE = 1000;
const CONTRACT_LOT = 200;

async function fetchOutstandingLot(lot: number[], cutoffIso: string): Promise<DuePeriodRow[]> {
  const all: DuePeriodRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('RepaymentSchedules')
      .select(SCHEDULE_COLUMNS)
      .in('ContractId', lot)
      .or('IsPaid.is.null,IsPaid.eq.false')
      .lte('DueDate', cutoffIso)
      .order('Id', { ascending: true })
      .range(from, from + SCHEDULE_PAGE - 1);

    if (error) {
      throw new Error(`Không nạp được lịch trả nợ: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    all.push(...(data as unknown as DuePeriodRow[]));
    if (data.length < SCHEDULE_PAGE) break;
    from += SCHEDULE_PAGE;
  }

  return all;
}

export async function fetchOutstandingSchedulesAPI(
  contractIds: number[],
  cutoffIso: string
): Promise<DuePeriodRow[]> {
  if (contractIds.length === 0) return [];

  const theoLo = await Promise.all(
    chunk(contractIds, CONTRACT_LOT).map(lot => fetchOutstandingLot(lot, cutoffIso))
  );

  return theoLo.flat();
}

async function fetchOutstandingDetailLot(lot: number[], cutoffIso: string): Promise<RepaymentSchedule[]> {
  const all: RepaymentSchedule[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('RepaymentSchedules')
      .select('*')
      .in('ContractId', lot)
      .or('IsPaid.is.null,IsPaid.eq.false')
      .lte('DueDate', cutoffIso)
      .order('Id', { ascending: true })
      .range(from, from + SCHEDULE_PAGE - 1);

    if (error) {
      throw new Error(`Không nạp được lịch trả nợ: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    all.push(...(data as RepaymentSchedule[]));
    if (data.length < SCHEDULE_PAGE) break;
    from += SCHEDULE_PAGE;
  }

  return all;
}

export async function fetchOutstandingScheduleDetailsAPI(
  contractIds: number[],
  cutoffIso: string
): Promise<RepaymentSchedule[]> {
  if (contractIds.length === 0) return [];

  const theoLo = await Promise.all(
    chunk(contractIds, CONTRACT_LOT).map(lot => fetchOutstandingDetailLot(lot, cutoffIso))
  );

  return theoLo.flat();
}

export async function fetchPaidPrincipalMapAPI(): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from('ContractPaidPrincipal')
    .select('ContractId, PaidPrincipal');
  if (error) throw error;

  const map: Record<number, number> = {};
  for (const row of data || []) {
    const paid = Number(row.PaidPrincipal);
    if (Number.isFinite(paid)) map[row.ContractId] = paid;
  }
  return map;
}

export const OVERDUE_COLUMNS =
  'ContractId, DueDate, IsPaid, PrincipalAmount, InterestAmount, OverdueInterestAmount, ActualPaidPrincipal, ActualPaidInterest, PrepaidPrincipalAmount';

export async function fetchPaidPrincipalForContractsAPI(
  contractIds: number[]
): Promise<Record<number, number>> {
  if (contractIds.length === 0) return {};

  const map: Record<number, number> = {};
  for (const lot of chunk(contractIds, CONTRACT_LOT)) {
    const { data, error } = await supabase
      .from('ContractPaidPrincipal')
      .select('ContractId, PaidPrincipal')
      .in('ContractId', lot);
    if (error) throw new Error(error.message);

    for (const row of data || []) {
      const paid = Number(row.PaidPrincipal);
      if (Number.isFinite(paid)) map[row.ContractId] = paid;
    }
  }
  return map;
}

export async function fetchOverdueSchedulesAPI(
  contractIds: number[],
  todayIso: string
): Promise<RepaymentSchedule[]> {
  if (contractIds.length === 0) return [];

  const all: RepaymentSchedule[] = [];
  for (const lot of chunk(contractIds, CONTRACT_LOT)) {
    const { data, error } = await supabase
      .from('RepaymentSchedules')
      .select(OVERDUE_COLUMNS)
      .in('ContractId', lot)
      .or('IsPaid.is.null,IsPaid.eq.false')
      .lt('DueDate', todayIso);
    if (error) throw new Error(error.message);
    all.push(...((data || []) as unknown as RepaymentSchedule[]));
  }
  return all;
}

export async function bulkSaveRepaymentSchedulesAPI(schedules: Partial<RepaymentSchedule>[]): Promise<void> {
  if (schedules.length === 0) return;

  const withId = schedules.filter(s => s.Id && s.Id > 0);
  const withoutId = schedules.filter(s => !s.Id || s.Id <= 0);

  if (withId.length > 0) {
    const { error: upsertErr } = await supabase.from('RepaymentSchedules').upsert(withId, { onConflict: 'Id' });
    if (upsertErr) {
      console.error('bulkSaveRepaymentSchedulesAPI upsert error:', upsertErr);

      for (const s of withId) {
        const { error } = await supabase.from('RepaymentSchedules').update(s).eq('Id', s.Id);
        if (error) throw error;
      }
    }
  }

  if (withoutId.length > 0) {
    const cleanWithoutId = withoutId.map(({ Id: _Id, ...rest }) => rest);
    const { error: insertErr } = await supabase.from('RepaymentSchedules').insert(cleanWithoutId);
    if (insertErr) throw insertErr;
  }
}

export async function deleteRepaymentSchedulesByIdsAPI(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('RepaymentSchedules').delete().in('Id', ids);
  if (error) throw error;
}

export async function deleteRepaymentSchedulesByContractAPI(contractId: number): Promise<void> {
  const { error } = await supabase.from('RepaymentSchedules').delete().eq('ContractId', contractId);
  if (error) throw error;
}

export async function updateRepaymentScheduleAPI(schedule: Partial<RepaymentSchedule>): Promise<RepaymentSchedule> {
  if (!schedule.Id) throw new Error('Cần có Id kỳ trả nợ để cập nhật!');

  const cleanPayload: any = { ...schedule };

  const { data, error } = await supabase
    .from('RepaymentSchedules')
    .update(cleanPayload)
    .eq('Id', schedule.Id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
