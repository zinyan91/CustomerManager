import { supabase } from './supabase';
import type { Customer, Collateral, LoanContract, CreditCard } from '../types';

const API_BASE = '/api';

export async function fetchCustomersAPI(filters?: { cif?: string; name?: string; nationalId?: string }): Promise<Customer[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.cif) params.append('cif', filters.cif);
    if (filters?.name) params.append('name', filters.name);
    if (filters?.nationalId) params.append('nationalId', filters.nationalId);

    const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Supabase SDK if API endpoint is not present (e.g., local preview)
  }

  let query = supabase.from('Customers').select('*').order('Id', { ascending: false });
  if (filters?.cif) query = query.ilike('CifKh', `%${filters.cif}%`);
  if (filters?.name) query = query.ilike('FullName', `%${filters.name}%`);
  if (filters?.nationalId) query = query.ilike('NationalId', `%${filters.nationalId}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveCustomerAPI(customer: Partial<Customer>): Promise<Customer> {
  try {
    const isUpdate = !!customer.Id;
    const url = isUpdate ? `${API_BASE}/customers?id=${customer.Id}` : `${API_BASE}/customers`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Supabase SDK
  }

  if (customer.Id) {
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
  try {
    const res = await fetch(`${API_BASE}/customers?id=${id}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch {
    // Fallback to Supabase SDK
  }

  const { error } = await supabase.from('Customers').delete().eq('Id', id);
  if (error) throw error;
}

export async function fetchCollateralsAPI(): Promise<Collateral[]> {
  try {
    const res = await fetch(`${API_BASE}/collaterals`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const { data, error } = await supabase.from('Collaterals').select('*, customer:Customers(*)').order('Id', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveCollateralAPI(collateral: Partial<Collateral>): Promise<Collateral> {
  try {
    const isUpdate = !!collateral.Id;
    const url = isUpdate ? `${API_BASE}/collaterals?id=${collateral.Id}` : `${API_BASE}/collaterals`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collateral)
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  if (collateral.Id) {
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
    const res = await fetch(`${API_BASE}/contracts`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const { data, error } = await supabase.from('LoanContracts').select('*, customer:Customers(*), collateral:Collaterals(*)').order('Id', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveContractAPI(contract: Partial<LoanContract>): Promise<LoanContract> {
  try {
    const isUpdate = !!contract.Id;
    const url = isUpdate ? `${API_BASE}/contracts?id=${contract.Id}` : `${API_BASE}/contracts`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  if (contract.Id) {
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
    const res = await fetch(`${API_BASE}/credit-cards`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const { data, error } = await supabase.from('CreditCards').select('*, customer:Customers(*)').order('Id', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveCreditCardAPI(card: Partial<CreditCard>): Promise<CreditCard> {
  try {
    const res = await fetch(`${API_BASE}/credit-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const { data, error } = await supabase.from('CreditCards').insert([card]).select().single();
  if (error) throw error;
  return data;
}
