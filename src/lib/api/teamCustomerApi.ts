import { supabase } from '../supabase';
import type { CardContract, Collateral, Customer, LoanContract } from '../../types';

export async function fetchTeamCustomers(userId: string): Promise<Customer[]> {
  const customers: Customer[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('Customers').select('*')
      .eq('OwnerId', userId).order('Id').range(offset, offset + 499).setHeader('x-team-read', '1');
    if (error) throw new Error(error.message);
    customers.push(...data as Customer[]);
    if (data.length < 500) return customers;
  }
}

async function customerRecords<T>(table: string, customerId: number): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select('*')
      .eq('CustomerId', customerId).order('Id').range(offset, offset + 499).setHeader('x-team-read', '1');
    if (error) throw new Error(error.message);
    result.push(...data as T[]);
    if (data.length < 500) return result;
  }
}

export async function fetchTeamCustomerDossier(customerId: number) {
  const [customer, loans, collaterals, cards] = await Promise.all([
    supabase.from('Customers').select('*').eq('Id', customerId).single().setHeader('x-team-read', '1'),
    customerRecords<LoanContract>('LoanContracts', customerId),
    customerRecords<Collateral>('Collaterals', customerId),
    customerRecords<CardContract>('CardContracts', customerId),
  ]);
  if (customer.error) throw new Error(customer.error.message);
  return { customer: customer.data as Customer, loans, collaterals, cards };
}
