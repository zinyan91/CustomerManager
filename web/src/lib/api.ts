import { supabase } from './supabase';
import type { Customer, Collateral, LoanContract, CreditCard } from '../types';

export async function fetchCustomersAPI(filters?: { cif?: string; name?: string; nationalId?: string }): Promise<Customer[]> {
  try {
    let query = supabase.from('Customers').select('*');
    if (filters?.cif) query = query.ilike('CifKh', `%${filters.cif}%`);
    if (filters?.name) query = query.ilike('FullName', `%${filters.name}%`);
    if (filters?.nationalId) query = query.ilike('NationalId', `%${filters.nationalId}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err: any) {
    console.error("fetchCustomersAPI error:", err);
    return [];
  }
}

export async function saveCustomerAPI(customer: Partial<Customer>): Promise<Customer> {
  const isUpdate = !!customer.Id;

  if (!isUpdate) {
    try {
      const { data } = await supabase.from('Customers').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      customer.Id = maxId + 1;
    } catch {
      customer.Id = Date.now();
    }
  }

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
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
    console.error("fetchCollateralsAPI error:", err);
    return [];
  }
}

export async function saveCollateralAPI(collateral: Partial<Collateral>): Promise<Collateral> {
  const isUpdate = !!collateral.Id;

  if (!isUpdate) {
    try {
      const { data } = await supabase.from('Collaterals').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      collateral.Id = maxId + 1;
    } catch {
      collateral.Id = Date.now();
    }
  }

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
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
    console.error("fetchContractsAPI error:", err);
    return [];
  }
}

export async function saveContractAPI(contract: Partial<LoanContract>): Promise<LoanContract> {
  const isUpdate = !!contract.Id;

  if (!isUpdate) {
    try {
      const { data } = await supabase.from('LoanContracts').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      contract.Id = maxId + 1;
    } catch {
      contract.Id = Date.now();
    }
  }

  contract.IsSettled = contract.IsSettled ?? false;
  contract.IsRestructured = contract.IsRestructured ?? false;

  if (isUpdate) {
    const { data, error } = await supabase.from('LoanContracts').update(contract).eq('Id', contract.Id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('LoanContracts').insert([contract]).select().single();
    if (error) throw error;
    return data;
  }
}

export async function fetchCreditCardsAPI(): Promise<CreditCard[]> {
  try {
    const { data, error } = await supabase.from('CreditCards').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
    console.error("fetchCreditCardsAPI error:", err);
    return [];
  }
}

export async function saveCreditCardAPI(card: Partial<CreditCard>): Promise<CreditCard> {
  const isUpdate = !!card.Id;

  if (!isUpdate) {
    try {
      const { data } = await supabase.from('CreditCards').select('Id');
      const maxId = (data && data.length > 0) ? Math.max(...data.map(d => d.Id || 0)) : 0;
      card.Id = maxId + 1;
    } catch {
      card.Id = Date.now();
    }
  }

  if (isUpdate) {
    const { data, error } = await supabase.from('CreditCards').update(card).eq('Id', card.Id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('CreditCards').insert([card]).select().single();
    if (error) throw error;
    return data;
  }
}
