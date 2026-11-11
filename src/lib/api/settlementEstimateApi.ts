import { supabase } from '../supabase';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';
import { allPages } from './paging';

export interface CustomerLoanSource {
  contracts: LoanContract[];
  creditContracts: CreditContract[];
  schedules: RepaymentSchedule[];
}

export async function fetchCustomerLoanSourceStrictAPI(customerId: number): Promise<CustomerLoanSource> {
  const [contractsRes, creditRes] = await Promise.all([
    supabase.from('LoanContracts').select('*').eq('CustomerId', customerId).is('MovedToPledgeLoanId', null),
    supabase.from('CreditContracts').select('*').eq('CustomerId', customerId).is('MovedToPledgeLoanId', null),
  ]);
  if (contractsRes.error) throw new Error(contractsRes.error.message);
  if (creditRes.error) throw new Error(creditRes.error.message);

  const contracts = (contractsRes.data || []) as LoanContract[];
  const ids = contracts.filter(c => !c.IsSettled).map(c => c.Id);
  const schedules = ids.length === 0 ? [] : await allPages<RepaymentSchedule>((from, to) =>
    supabase.from('RepaymentSchedules').select('*').in('ContractId', ids)
      .order('ContractId', { ascending: true }).order('PeriodNumber', { ascending: true }).range(from, to));

  return { contracts, creditContracts: (creditRes.data || []) as CreditContract[], schedules };
}
