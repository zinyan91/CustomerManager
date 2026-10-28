import { supabase } from '../supabase';
import type { PledgeBundle, PledgeLoan, PledgeLoanLink, PledgeLoanRepayment } from '../../types';
import { chunk } from '../utils';
import { applyOwnerScope, customerEmbed, type OwnerScope } from '../ownerScope';
import { getActiveOwnerScope } from '../ownerScopeStore';
import { fetchAllSavingsBooksAPI } from './savingsBookApi';
import { allPages } from './paging';

export type PledgeLoanLinkInput = Pick<PledgeLoanLink, 'SavingsBookId' | 'PrincipalCovered'>;
export type PledgeRepaymentInput = Omit<PledgeLoanRepayment, 'Id' | 'PledgeLoanId' | 'CreatedAt'>;

function rpcError(err: { code?: string; message?: string }, contractNumber?: string): Error {
  if (err.code === '23505' && contractNumber !== undefined) {
    return new Error(`Số HĐ cầm cố "${contractNumber}" đã tồn tại trên hệ thống.`);
  }
  return new Error(err.message || 'Lỗi không xác định từ máy chủ.');
}

async function fetchChildren(loanIds: number[]): Promise<Pick<PledgeBundle, 'links' | 'repayments'>> {
  const links: PledgeLoanLink[] = [];
  const repayments: PledgeLoanRepayment[] = [];
  for (const ids of chunk(loanIds, 200)) {
    const [l, r] = await Promise.all([
      allPages<PledgeLoanLink>((from, to) =>
        supabase.from('PledgeLoanSavingsBooks').select('*').in('PledgeLoanId', ids).order('Id').range(from, to)),
      allPages<PledgeLoanRepayment>((from, to) =>
        supabase.from('PledgeLoanRepayments').select('*').in('PledgeLoanId', ids).order('Id').range(from, to)),
    ]);
    links.push(...l);
    repayments.push(...r);
  }
  return { links, repayments };
}

export async function fetchPledgeLoanBundleByCustomerAPI(
  customerId: number
): Promise<Pick<PledgeBundle, 'loans' | 'links' | 'repayments'>> {
  const { data, error } = await supabase
    .from('PledgeLoans')
    .select('*')
    .eq('CustomerId', customerId)
    .order('DisbursementDate', { ascending: false });
  if (error) throw new Error(error.message);
  const loans = (data || []) as PledgeLoan[];
  return { loans, ...(await fetchChildren(loans.map((l) => l.Id))) };
}

export async function fetchAllPledgeLoanBundlesAPI(scope: OwnerScope = getActiveOwnerScope()): Promise<PledgeBundle> {
  const [loans, books] = await Promise.all([
    allPages<PledgeLoan>((from, to) => applyOwnerScope(
      supabase.from('PledgeLoans').select(`*, ${customerEmbed(scope)}` as '*'),
      scope,
      'customer.OwnerId'
    ).order('Id').range(from, to)),
    fetchAllSavingsBooksAPI(scope),
  ]);
  return { loans, books, ...(await fetchChildren(loans.map((l) => l.Id))) };
}

export async function savePledgeLoanAPI(loan: Partial<PledgeLoan>, links: PledgeLoanLinkInput[]): Promise<number> {
  const { data, error } = await supabase.rpc('save_pledge_loan', { p_loan: loan, p_links: links });
  if (error) throw rpcError(error, (loan.ContractNumber || '').trim());
  return Number(data);
}

export async function recordPledgeRepaymentAPI(
  loanId: number,
  repayment: PledgeRepaymentInput,
  bookClosingInterest: number | null
): Promise<number> {
  const { data, error } = await supabase.rpc('record_pledge_repayment', {
    p_loan_id: loanId,
    p_repayment: repayment,
    p_book_closing_interest: bookClosingInterest,
  });
  if (error) throw rpcError(error);
  return Number(data);
}
