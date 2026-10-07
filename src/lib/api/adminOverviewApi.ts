import { supabase } from '../supabase';

export async function countCustomers(): Promise<number> {
  const { count, error } = await supabase.from('Customers').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Không đếm được khách hàng: ${error.message}`);
  return count ?? 0;
}
