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
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("API fetch failed, falling back to Supabase SDK:", err);
  }

  try {
    let query = supabase.from('Customers').select('*');
    if (filters?.cif) query = query.ilike('CifKh', `%${filters.cif}%`);
    if (filters?.name) query = query.ilike('FullName', `%${filters.name}%`);
    if (filters?.nationalId) query = query.ilike('NationalId', `%${filters.nationalId}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err: any) {
    console.error("Supabase SDK fallback error:", err);
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

  try {
    const url = isUpdate ? `${API_BASE}/customers?id=${customer.Id}` : `${API_BASE}/customers`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API save failed, falling back to Supabase SDK:", err);
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
  try {
    const res = await fetch(`${API_BASE}/customers?id=${id}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (err) {
    console.warn("API delete failed, falling back to Supabase SDK:", err);
  }

  const { error } = await supabase.from('Customers').delete().eq('Id', id);
  if (error) throw error;
}

export async function fetchCollateralsAPI(): Promise<Collateral[]> {
  try {
    const res = await fetch(`${API_BASE}/collaterals`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("API collaterals fetch failed:", err);
  }

  try {
    const { data, error } = await supabase.from('Collaterals').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
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

  try {
    const url = isUpdate ? `${API_BASE}/collaterals?id=${collateral.Id}` : `${API_BASE}/collaterals`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collateral)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API saveCollateral failed:", err);
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
    const res = await fetch(`${API_BASE}/contracts`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("API contracts fetch failed:", err);
  }

  try {
    const { data, error } = await supabase.from('LoanContracts').select('*, customer:Customers(*), collateral:Collaterals(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
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

  // Ensure default boolean fields for LoanContracts
  contract.IsSettled = contract.IsSettled ?? false;
  contract.IsRestructured = contract.IsRestructured ?? false;

  try {
    const url = isUpdate ? `${API_BASE}/contracts?id=${contract.Id}` : `${API_BASE}/contracts`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API saveContract failed:", err);
  }

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
    const res = await fetch(`${API_BASE}/credit-cards`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("API credit-cards fetch failed:", err);
  }

  try {
    const { data, error } = await supabase.from('CreditCards').select('*, customer:Customers(*)');
    if (error) throw error;
    return (data || []).sort((a: any, b: any) => (b.Id || 0) - (a.Id || 0));
  } catch (err) {
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

  try {
    const res = await fetch(`${API_BASE}/credit-cards`, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API saveCreditCard failed:", err);
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
