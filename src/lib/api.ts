import { supabase } from './supabase';
import type { Customer, Collateral, LoanContract, CreditContract, CardContract, CardSupplementaryHolder, RepaymentSchedule, CollateralAppraisal, PostLoanControlRecord } from '../types';
import { CARD_TENOR_MONTHS } from './cardContract';
import { defaultLtvForAssetType } from './collateralMath';
import { toIsoDate } from './utils';
import { findKunnNumberClash } from './creditContract';
import {
  customerDeleteBlockers, customerDeleteBlockedMessage, type CustomerLinkCounts,
} from './customerStatus';
import type {
  RateProgram, RateProgramTier, RateProgramPrepaymentFee,
  RateProgramFbeCode, DepositRateAuthority,
  RateProgramFeeOption, RateProgramCondition,
} from './rateQuote';
import type { CofProgram, CofStandardRate, CofRateItem, CofRateColumnKey } from './cof';
import type { QuizQuestion, QuizOption } from './quizBank';

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

export async function fetchCollateralsAPI(): Promise<Collateral[]> {
  try {
    const { data, error } = await supabase.from('Collaterals').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));
  } catch (err) {
    console.error("fetchCollateralsAPI error:", err);
    return [];
  }
}

export async function fetchCollateralsByCustomerAPI(customerId: number): Promise<Collateral[]> {
  try {
    const { data, error } = await supabase
      .from('Collaterals')
      .select('*')
      .eq('CustomerId', customerId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchCollateralsByCustomerAPI error:", err);
    return [];
  }
}

export async function saveCollateralAPI(collateral: Partial<Collateral>): Promise<Collateral> {
  const isUpdate = !!collateral.Id;
  const assetCode = (collateral.AssetCode || '').trim();

  if (!collateral.CustomerId) {
    throw new Error('Khách hàng chủ sở hữu là bắt buộc!');
  }

  if (assetCode) {
    const { data: codeCheck } = await supabase
      .from('Collaterals')
      .select('Id, AssetCode')
      .eq('AssetCode', assetCode);

    const duplicateCode = (codeCheck || []).find(c => c.Id !== collateral.Id);
    if (duplicateCode) {
      throw new Error(`Mã chứng thư TSĐB "${assetCode}" đã tồn tại trên hệ thống!`);
    }
  }

  if (!isUpdate) {
    delete collateral.Id;
  }

  collateral.AssetCode = assetCode || null;

  collateral.LtvPercent =
    (collateral.LtvPercent !== undefined && collateral.LtvPercent !== null && !isNaN(collateral.LtvPercent))
      ? collateral.LtvPercent
      : defaultLtvForAssetType(collateral.AssetType);

  if (isUpdate) {
    const { data, error } = await supabase.from('Collaterals').update(collateral).eq('Id', collateral.Id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('Collaterals').insert([collateral]).select().single();
    if (error) throw error;
    return data;
  }
}

export async function findContractsUsingCollateralAPI(collateralId: number): Promise<LoanContract[]> {
  const { data, error } = await supabase
    .from('LoanContracts')
    .select('Id, ContractNumber, CollateralId, CollateralIds')
    .or(`CollateralId.eq.${collateralId},CollateralIds.not.is.null`);
  if (error) throw error;

  return (data || []).filter((c: any) => {
    if (c.CollateralId === collateralId) return true;
    if (!c.CollateralIds) return false;

    return String(c.CollateralIds)
      .split(',')
      .map((s: string) => s.trim())
      .includes(String(collateralId));
  }) as LoanContract[];
}

export async function deleteCollateralAPI(id: number): Promise<void> {
  const linked = await findContractsUsingCollateralAPI(id);
  if (linked.length > 0) {
    const names = linked.map(c => c.ContractNumber || `HĐ #${c.Id}`).join(', ');
    throw new Error(
      `Không thể xoá: TSĐB đang được thế chấp cho ${linked.length} hợp đồng (${names}). Vui lòng gỡ liên kết khỏi hợp đồng trước.`
    );
  }

  const { data, error } = await supabase.from('Collaterals').delete().eq('Id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Xoá thất bại: bạn không có quyền xoá TSĐB này, hoặc bản ghi đã bị xoá trước đó.');
  }
}

export async function fetchContractsAPI(): Promise<LoanContract[]> {
  try {
    const { data, error } = await supabase.from('LoanContracts').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));
  } catch (err) {
    console.error("fetchContractsAPI error:", err);
    return [];
  }
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

  if ('HdtdDueDate' in cleanContract) {
    cleanContract.HdtdDueDate = toIsoDate(cleanContract.HdtdDueDate);
  }

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

async function unarchiveCustomer(customerId?: number | null): Promise<void> {
  if (!customerId) return;
  await supabase
    .from('Customers')
    .update({ ArchivedAt: null })
    .eq('Id', customerId)
    .not('ArchivedAt', 'is', null);
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
  await unarchiveCustomer(data?.CustomerId);
  return data;
}

export async function deleteCreditContractAPI(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('CreditContracts')
    .delete()
    .eq('Id', id)
    .select('Id');
  if (error) {
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

export async function fetchCollateralAppraisalsAPI(collateralId?: number): Promise<CollateralAppraisal[]> {
  let query = supabase
    .from('CollateralAppraisals')
    .select('*')
    .order('AppraisalDate', { ascending: false })
    .limit(2000);
  if (collateralId) query = query.eq('CollateralId', collateralId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveCollateralAppraisalAPI(
  appraisal: Partial<CollateralAppraisal>
): Promise<CollateralAppraisal> {
  if (!appraisal.CollateralId) throw new Error('Thiếu tài sản bảo đảm!');
  if (!appraisal.AppraisalDate) throw new Error('Vui lòng nhập ngày định giá!');
  if (!appraisal.AppraisedValue || appraisal.AppraisedValue <= 0) {
    throw new Error('Vui lòng nhập giá trị định giá!');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const payload = {
    CollateralId: appraisal.CollateralId,
    AppraisalDate: appraisal.AppraisalDate,
    TenorMonths: appraisal.TenorMonths ?? 12,
    AppraisedValue: appraisal.AppraisedValue,
    AssetType: appraisal.AssetType ?? null,
    LtvPercent: appraisal.LtvPercent ?? 0,
    PerformedBy: session?.user?.id ?? null,
    Note: appraisal.Note ?? null,
  };

  const { data, error } = await supabase
    .from('CollateralAppraisals')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPostLoanControlRecordsAPI(): Promise<PostLoanControlRecord[]> {
  const { data, error } = await supabase
    .from('PostLoanControlRecords')
    .select('*')
    .order('PerformedDate', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data || [];
}

export async function savePostLoanControlRecordAPI(
  record: Partial<PostLoanControlRecord>
): Promise<PostLoanControlRecord> {
  if (!record.ControlKey) throw new Error('Thiếu khoá đợt kiểm tra!');
  if (!record.CustomerId) throw new Error('Thiếu khách hàng!');
  if (!record.PerformedDate) throw new Error('Vui lòng nhập ngày thực hiện!');
  if (!record.Result) throw new Error('Vui lòng chọn kết quả kiểm tra!');

  const { data: { session } } = await supabase.auth.getSession();
  const payload = {
    ControlType: record.ControlType,
    ControlKey: record.ControlKey,
    CustomerId: record.CustomerId,
    ContractId: record.ContractId ?? null,
    MasterHdtd: record.MasterHdtd ?? null,
    CollateralId: record.CollateralId ?? null,
    PeriodIndex: record.PeriodIndex ?? 1,
    DueDate: record.DueDate,
    PerformedDate: record.PerformedDate,
    PerformedBy: session?.user?.id ?? null,
    Result: record.Result,
    Findings: record.Findings ?? null,
    AppraisalId: record.AppraisalId ?? null,
  };

  const { data, error } = await supabase
    .from('PostLoanControlRecords')
    .upsert([payload], { onConflict: 'ControlKey' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRateProgramsAPI(): Promise<RateProgram[]> {
  const { data, error } = await supabase
    .from('RatePrograms')
    .select('*')
    .order('EffectiveFrom', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramTiersAPI(programIds: number[]): Promise<RateProgramTier[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramTiers')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramPrepaymentFeesAPI(programIds: number[]): Promise<RateProgramPrepaymentFee[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramPrepaymentFees')
    .select('*')
    .in('ProgramId', programIds)
    .order('YearFrom', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramFbeCodesAPI(programIds: number[]): Promise<RateProgramFbeCode[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramFbeCodes')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchDepositRateAuthoritiesAPI(programIds: number[]): Promise<DepositRateAuthority[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('DepositRateAuthorities')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateRateProgramTierAPI(
  id: number,
  patch: { RateAnnual?: number | null; MinFeeRatio?: number | null; MinTenorMonths?: number | null }
): Promise<RateProgramTier> {
  const { data, error } = await supabase
    .from('RateProgramTiers')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được dòng lãi suất. Chỉ admin có quyền sửa thông số chương trình.');
  }
  return data[0];
}

export async function updateRateProgramAPI(
  id: number,
  patch: Partial<RateProgram>
): Promise<RateProgram> {
  const { data, error } = await supabase
    .from('RatePrograms')
    .update({ ...patch, UpdatedAt: new Date().toISOString() })
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được chương trình. Chỉ admin có quyền sửa thông số chương trình.');
  }
  return data[0];
}

export async function fetchRateProgramFeeOptionsAPI(programIds: number[]): Promise<RateProgramFeeOption[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramFeeOptions')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramConditionsAPI(programIds: number[]): Promise<RateProgramCondition[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramConditions')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCofProgramsAPI(): Promise<CofProgram[]> {
  const { data, error } = await supabase
    .from('CofPrograms')
    .select('*')
    .order('EffectiveFrom', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchCofStandardRatesAPI(programId: number): Promise<CofStandardRate[]> {
  const { data, error } = await supabase
    .from('CofStandardRates')
    .select('*')
    .eq('ProgramId', programId)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCofRateItemsAPI(programId: number): Promise<CofRateItem[]> {
  const { data, error } = await supabase
    .from('CofRateItems')
    .select('*')
    .eq('ProgramId', programId)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateCofStandardRateAPI(
  id: number,
  patch: Partial<Record<CofRateColumnKey, number | null>>
): Promise<CofStandardRate> {
  const { data, error } = await supabase
    .from('CofStandardRates')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được. Chỉ admin có quyền sửa bảng giá mua bán vốn nội bộ.');
  }
  return data[0];
}

export async function updateCofRateItemAPI(
  id: number,
  patch: { RateAnnual?: number | null }
): Promise<CofRateItem> {
  const { data, error } = await supabase
    .from('CofRateItems')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được. Chỉ admin có quyền sửa bảng giá mua bán vốn nội bộ.');
  }
  return data[0];
}

export async function fetchQuizQuestionsAPI(): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('QuizQuestions')
    .select('*')
    .order('Id', { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    Options: Array.isArray(row.Options) ? row.Options : [],
    CorrectAnswers: row.CorrectAnswers || [],
    Sources: row.Sources || [],
  }));
}

function quizDbError(err: any): Error {
  const msg = String(err?.message || '');
  const already = /đã có trong ngân hàng \(Id=(\d+)\)/.exec(msg);
  if (already) {
    return new Error(`Câu hỏi này đã có trong ngân hàng (số ${already[1]}).`);
  }
  if (/không nằm trong danh sách lựa chọn/.test(msg)
    || /Mã lựa chọn bị lặp/.test(msg)
    || /phải có mã/.test(msg)) {
    return new Error(msg);
  }
  if (err?.code === '42501' || /row-level security/i.test(msg)) {
    return new Error('Không có quyền ghi vào ngân hàng câu hỏi.');
  }
  return new Error(msg || 'Không lưu được câu hỏi.');
}

export async function createQuizQuestionAPI(
  payload: {
    QuestionText: string;
    Options: QuizOption[];
    CorrectAnswers: string[];
    Sources: string[];
    Topic: string | null;
  }
): Promise<QuizQuestion> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('QuizQuestions')
    .insert({ ...payload, CreatedBy: auth?.user?.id ?? null })
    .select();
  if (error) throw quizDbError(error);
  if (!data || data.length === 0) throw new Error('Không lưu được câu hỏi.');
  return data[0];
}

export async function deleteQuizQuestionAPI(id: number): Promise<void> {
  const { error, count } = await supabase
    .from('QuizQuestions')
    .delete({ count: 'exact' })
    .eq('Id', id);
  if (error) throw quizDbError(error);
  if (count === 0) {
    throw new Error('Không xoá được. Chỉ admin hoặc người đã thêm câu hỏi mới xoá được.');
  }
}

export async function seedQuizBankAPI(questions: unknown[]): Promise<number> {
  const { data, error } = await supabase.rpc('seed_quiz_bank', { p_questions: questions });
  if (error) throw quizDbError(error);
  return Number(data) || 0;
}

export interface QuizImportReport {
  da_nap: number;
  trung_trong_ngan_hang: { cau: string; id_co_san: number }[];
  trung_trong_file: { cau: string }[];
  khong_hop_le: { cau: string; ly_do: string }[];
  lech_dap_an: {
    cau: string;
    id_co_san: number;
    dap_an_co_san: string[];
    dap_an_trong_file: string[];
  }[];
}

export async function importQuizQuestionsAPI(rows: unknown[]): Promise<QuizImportReport> {
  const { data, error } = await supabase.rpc('import_quiz_questions', { p_questions: rows });
  if (error) throw quizDbError(error);
  return data as QuizImportReport;
}

export async function updateQuizQuestionAPI(
  id: number,
  payload: {
    QuestionText: string;
    Options: QuizOption[];
    CorrectAnswers: string[];
    Sources: string[];
    Topic: string | null;
  }
): Promise<QuizQuestion> {
  const { data, error } = await supabase
    .from('QuizQuestions')
    .update(payload)
    .eq('Id', id)
    .select();
  if (error) throw quizDbError(error);
  if (!data || data.length === 0) {
    throw new Error('Không sửa được. Chỉ admin hoặc người đã thêm câu hỏi mới sửa được.');
  }
  return data[0];
}
