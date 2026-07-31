import { supabase } from './supabase';
import type { Customer, Collateral, LoanContract, CreditCard, RepaymentSchedule } from '../types';
import { serializeContractRateHistory } from './utils';

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

  // Duplicate CIF validation check
  const { data: cifCheck } = await supabase
    .from('Customers')
    .select('Id, FullName, CifKh')
    .eq('CifKh', cif);

  const duplicateCif = (cifCheck || []).find(c => c.Id !== customer.Id);
  if (duplicateCif) {
    throw new Error(`Mã CIF "${cif}" đã tồn tại trên hệ thống (thuộc KH: ${duplicateCif.FullName})!`);
  }

  // Duplicate CCCD/CMND validation check
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
    try {
      const { data } = await supabase.from('Customers').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      customer.Id = maxId + 1;
    } catch {
      customer.Id = Date.now();
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

export async function deleteCustomerAPI(id: number): Promise<void> {
  const { error } = await supabase.from('Customers').delete().eq('Id', id);
  if (error) throw error;
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

  // Duplicate AssetCode check
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
    try {
      const { data } = await supabase.from('Collaterals').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      collateral.Id = maxId + 1;
    } catch {
      collateral.Id = Date.now();
    }
  }

  collateral.AssetCode = assetCode || null;
  collateral.LtvPercent = (collateral.LtvPercent && collateral.LtvPercent > 0) ? collateral.LtvPercent : 70;

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

  // Clean payload from non-database column fields
  const cleanContract: any = { ...contract };
  delete cleanContract.customer;
  delete cleanContract.collateral;
  delete cleanContract.contractCollaterals;

  // Sanitize HdtdDueDate to prevent PostgreSQL date format errors
  if (cleanContract.HdtdDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(cleanContract.HdtdDueDate)) {
    delete cleanContract.HdtdDueDate;
  }

  if (!isUpdate) {
    try {
      const { data } = await supabase.from('LoanContracts').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      cleanContract.Id = maxId + 1;
    } catch {
      cleanContract.Id = Date.now();
    }
  }

  cleanContract.ContractNumber = contractNumber;
  cleanContract.ContractType = cleanContract.ContractType ?? 0;
  cleanContract.IsSettled = cleanContract.IsSettled ?? false;
  cleanContract.IsRestructured = cleanContract.IsRestructured ?? false;

  if (isUpdate) {
    let { data, error } = await supabase
      .from('LoanContracts')
      .update(cleanContract)
      .eq('Id', cleanContract.Id)
      .select('*, customer:Customers(*)')
      .single();

    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      const fallbackContract = { ...cleanContract };
      delete fallbackContract.RateHistory;
      delete fallbackContract.PenaltySurcharge;
      delete fallbackContract.CollateralIds;

      let noteExtra = '';
      if (cleanContract.RateHistory && Array.isArray(cleanContract.RateHistory)) {
        noteExtra += `\n${serializeContractRateHistory(cleanContract.RateHistory)}`;
      }
      if (cleanContract.CollateralIds) {
        noteExtra += `\n[COLLATERAL_IDS:${cleanContract.CollateralIds}]`;
      }
      if (cleanContract.PenaltySurcharge) {
        noteExtra += `\n[PENALTY_SURCHARGE:${cleanContract.PenaltySurcharge}]`;
      }
      fallbackContract.Note = `${fallbackContract.Note || ''}${noteExtra}`.trim() || null;

      const res = await supabase
        .from('LoanContracts')
        .update(fallbackContract)
        .eq('Id', fallbackContract.Id)
        .select('*, customer:Customers(*)')
        .single();
      if (res.error) throw res.error;
      data = res.data;
    } else if (error) {
      throw error;
    }
    return data;
  } else {
    let { data, error } = await supabase
      .from('LoanContracts')
      .insert([cleanContract])
      .select('*, customer:Customers(*)')
      .single();

    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      const fallbackContract = { ...cleanContract };
      delete fallbackContract.RateHistory;
      delete fallbackContract.PenaltySurcharge;
      delete fallbackContract.CollateralIds;

      let noteExtra = '';
      if (cleanContract.RateHistory && Array.isArray(cleanContract.RateHistory)) {
        noteExtra += `\n${serializeContractRateHistory(cleanContract.RateHistory)}`;
      }
      if (cleanContract.CollateralIds) {
        noteExtra += `\n[COLLATERAL_IDS:${cleanContract.CollateralIds}]`;
      }
      if (cleanContract.PenaltySurcharge) {
        noteExtra += `\n[PENALTY_SURCHARGE:${cleanContract.PenaltySurcharge}]`;
      }
      fallbackContract.Note = `${fallbackContract.Note || ''}${noteExtra}`.trim() || null;

      const res = await supabase
        .from('LoanContracts')
        .insert([fallbackContract])
        .select('*, customer:Customers(*)')
        .single();
      if (res.error) throw res.error;
      data = res.data;
    } else if (error) {
      throw error;
    }
    return data;
  }
}

export async function fetchCreditCardsAPI(): Promise<CreditCard[]> {
  try {
    const { data, error } = await supabase.from('CreditCards').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));
  } catch (err) {
    console.error("fetchCreditCardsAPI error:", err);
    return [];
  }
}

export async function saveCreditCardAPI(card: Partial<CreditCard>): Promise<CreditCard> {
  const isUpdate = !!card.Id;
  const rawCardNumber = (card.CardNumber || '').trim();
  const autoMaskNumber = `4532••••${Math.floor(1000 + Math.random() * 9000)}`;
  const cardNumber = rawCardNumber || autoMaskNumber;

  if (!card.CustomerId) {
    throw new Error('Khách hàng sở hữu thẻ là bắt buộc!');
  }

  if (rawCardNumber) {
    const { data: cardCheck } = await supabase
      .from('CreditCards')
      .select('Id, CardNumber')
      .eq('CardNumber', rawCardNumber);

    const duplicateCard = (cardCheck || []).find(c => c.Id !== card.Id);
    if (duplicateCard) {
      throw new Error(`Số thẻ tín dụng "${rawCardNumber}" đã tồn tại trên hệ thống!`);
    }
  }

  const { customer, Limit, ...dbPayload } = card as any;

  let noteStr = dbPayload.Note || '';
  if (dbPayload.IssuanceType && !noteStr.includes('[IssuanceType:')) {
    noteStr = `[IssuanceType:${dbPayload.IssuanceType}] ${noteStr}`.trim();
  }
  if (dbPayload.CollateralId && !noteStr.includes('[CollateralId:')) {
    noteStr = `[CollateralId:${dbPayload.CollateralId}] ${noteStr}`.trim();
  }

  const cardData: any = {
    CustomerId: Number(dbPayload.CustomerId),
    CardNumber: cardNumber,
    CreditLimit: Number(dbPayload.CreditLimit || Limit || 0),
    CurrentBalance: Number(dbPayload.CurrentBalance || 0),
    Note: noteStr || null,
  };

  if (dbPayload.IssuanceType) {
    cardData.IssuanceType = String(dbPayload.IssuanceType);
  }
  if (dbPayload.CollateralId) {
    cardData.CollateralId = Number(dbPayload.CollateralId);
  }

  if (isUpdate) {
    cardData.Id = dbPayload.Id;
    const { data, error } = await supabase.from('CreditCards').update(cardData).eq('Id', cardData.Id).select().single();
    if (error) {
      delete cardData.IssuanceType;
      delete cardData.CollateralId;
      const { data: retryData, error: retryErr } = await supabase.from('CreditCards').update(cardData).eq('Id', cardData.Id).select().single();
      if (retryErr) throw retryErr;
      return retryData;
    }
    return data;
  } else {
    try {
      const { data } = await supabase.from('CreditCards').select('Id').order('Id', { ascending: false }).limit(1);
      const maxId = (data && data.length > 0 && data[0].Id) ? data[0].Id : 0;
      cardData.Id = maxId + 1;
    } catch {
      cardData.Id = Date.now();
    }

    const { data, error } = await supabase.from('CreditCards').insert([cardData]).select().single();
    if (error) {
      delete cardData.IssuanceType;
      delete cardData.CollateralId;
      const { data: retryData, error: retryErr } = await supabase.from('CreditCards').insert([cardData]).select().single();
      if (retryErr) throw retryErr;
      return retryData;
    }
    return data;
  }
}

export async function deleteCreditCardAPI(id: number): Promise<void> {
  const { error } = await supabase.from('CreditCards').delete().eq('Id', id);
  if (error) throw error;
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
  const { error } = await supabase.from('LoanContracts').delete().eq('Id', contractId);
  if (error) throw error;
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
        await supabase.from('RepaymentSchedules').update(s).eq('Id', s.Id);
      }
    }
  }

  if (withoutId.length > 0) {
    const cleanWithoutId = withoutId.map(s => {
      const { Id, ...rest } = s;
      return rest;
    });
    const { error: insertErr } = await supabase.from('RepaymentSchedules').insert(cleanWithoutId);
    if (insertErr) {
      const { data } = await supabase.from('RepaymentSchedules').select('Id').order('Id', { ascending: false }).limit(1);
      let startId = (data && data.length > 0 && data[0].Id) ? data[0].Id + 1 : 1;
      const withGeneratedId = withoutId.map(s => ({
        ...s,
        Id: startId++,
      }));
      await supabase.from('RepaymentSchedules').upsert(withGeneratedId, { onConflict: 'Id' });
    }
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

  if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
    const fallbackPayload = { ...cleanPayload };
    delete fallbackPayload.OverdueDays;
    delete fallbackPayload.OverdueInterestAmount;
    delete fallbackPayload.ActualPaidPrincipal;
    delete fallbackPayload.ActualPaidInterest;
    delete fallbackPayload.PrepaidPrincipalAmount;

    let noteExtras = [];
    if (cleanPayload.OverdueDays) noteExtras.push(`OverdueDays:${cleanPayload.OverdueDays}`);
    if (cleanPayload.OverdueInterestAmount) noteExtras.push(`OverdueInterest:${cleanPayload.OverdueInterestAmount}`);
    if (cleanPayload.ActualPaidPrincipal) noteExtras.push(`PaidP:${cleanPayload.ActualPaidPrincipal}`);
    if (cleanPayload.ActualPaidInterest) noteExtras.push(`PaidI:${cleanPayload.ActualPaidInterest}`);
    if (noteExtras.length > 0) {
      fallbackPayload.Note = `${fallbackPayload.Note || ''} [${noteExtras.join(';')}]`.trim();
    }

    const { data: retryData, error: retryErr } = await supabase
      .from('RepaymentSchedules')
      .update(fallbackPayload)
      .eq('Id', schedule.Id)
      .select()
      .single();
    if (retryErr) throw retryErr;
    return retryData;
  }
  if (error) throw error;
  return data;
}
