import { supabase } from '../lib/supabase';
import {
  Customer,
  CreditContract,
  LoanContract,
  Collateral,
  CardContract,
  PostLoanControlRecord,
} from '../types';

export const portfolioApi = {
  async fetchAllPortfolio() {
    const [
      custRes,
      creditRes,
      loanRes,
      colRes,
      cardRes,
      plRes,
    ] = await Promise.all([
      supabase.from('Customers').select('*').limit(5000).order('FullName', { ascending: true }),
      supabase.from('CreditContracts').select('*').limit(5000).order('Id', { ascending: false }),
      supabase.from('LoanContracts').select('*').limit(5000).order('Id', { ascending: false }),
      supabase.from('Collaterals').select('*').limit(5000).order('Id', { ascending: false }),
      supabase.from('CardContracts').select('*').limit(5000).order('Id', { ascending: false }),
      supabase.from('PostLoanControlRecords').select('*').limit(5000).order('DueDate', { ascending: false }),
    ]);

    const rawCustomers = (custRes.data || []) as Customer[];
    const custMap = new Map<string | number, Customer>();
    rawCustomers.forEach((c) => {
      custMap.set(c.Id, c);
      custMap.set(String(c.Id), c);
      custMap.set(Number(c.Id), c);
    });

    const enrichedCredits = ((creditRes.data || []) as CreditContract[]).map((c) => ({
      ...c,
      customer: custMap.get(c.CustomerId) || custMap.get(String(c.CustomerId)),
    }));

    const enrichedLoans = ((loanRes.data || []) as LoanContract[]).map((l) => ({
      ...l,
      customer: custMap.get(l.CustomerId) || custMap.get(String(l.CustomerId)),
    }));

    const enrichedCollaterals = ((colRes.data || []) as Collateral[]).map((col) => ({
      ...col,
      customer: custMap.get(col.CustomerId) || custMap.get(String(col.CustomerId)),
    }));

    const enrichedCards = ((cardRes.data || []) as CardContract[]).map((card) => ({
      ...card,
      customer: custMap.get(card.CustomerId) || custMap.get(String(card.CustomerId)),
    }));

    const enrichedPL = ((plRes.data || []) as PostLoanControlRecord[]).map((pl) => ({
      ...pl,
      customer: custMap.get(pl.CustomerId) || custMap.get(String(pl.CustomerId)),
    }));

    return {
      customers: rawCustomers,
      creditContracts: enrichedCredits,
      loanContracts: enrichedLoans,
      collaterals: enrichedCollaterals,
      cardContracts: enrichedCards,
      postLoanRecords: enrichedPL,
      customerMap: custMap,
    };
  },
};
