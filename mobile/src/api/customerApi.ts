import { supabase } from '../lib/supabase';
import { Customer, LoanContract, CreditContract, Collateral, CardContract } from '../types';

export const customerApi = {
  async fetchCustomerDetails(customerId: number) {
    const [loansRes, creditsRes, collsRes, cardsRes] = await Promise.all([
      supabase.from('LoanContracts').select('*').eq('CustomerId', customerId),
      supabase.from('CreditContracts').select('*').eq('CustomerId', customerId),
      supabase.from('Collaterals').select('*').eq('CustomerId', customerId),
      supabase.from('CardContracts').select('*').eq('CustomerId', customerId),
    ]);

    return {
      loans: (loansRes.data || []) as LoanContract[],
      credits: (creditsRes.data || []) as CreditContract[],
      collaterals: (collsRes.data || []) as Collateral[],
      cards: (cardsRes.data || []) as CardContract[],
    };
  },
};
