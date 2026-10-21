import { describe, expect, it } from 'vitest';
import { contractsForHdtd, masterHdtdFilterKey, NO_HDTD } from '../portfolioFilters';
import type { CreditContract, LoanContract } from '../../types';

describe('portfolio HĐTD filtering', () => {
  const credit = [{ Id: 10, HdtdNumber: ' HD-A ' }, { Id: 11, HdtdNumber: 'HD-B' }] as CreditContract[];
  const loans = [
    { Id: 1, CreditContractId: 10, ContractNumber: 'NUMBER-UNRELATED' },
    { Id: 2, CreditContractId: 11, ContractNumber: 'HD-A/GNN-01' },
    { Id: 3, ContractNumber: 'HD-B/GNN-03' },
  ] as LoanContract[];
  it('prioritizes linked HĐTD over the number prefix and normalizes whitespace/case', () => {
    expect(contractsForHdtd(loans, credit, 'hd-a').map(item => item.Id)).toEqual([1]);
    expect(contractsForHdtd(loans, credit, ' HD-B ').map(item => item.Id)).toEqual([2,3]);
    expect(contractsForHdtd(loans, credit, 'ALL')).toEqual(loans);
    expect(contractsForHdtd(loans, credit, 'MISSING')).toEqual([]);
  });
  it('uses the same sentinel for grouping and filtering an unlinked unnamed KUNN', () => {
    const unnamed = { Id: 9 } as LoanContract;
    expect(masterHdtdFilterKey(unnamed, credit)).toBe(NO_HDTD);
    expect(contractsForHdtd([...loans,unnamed], credit, NO_HDTD)).toEqual([unnamed]);
  });
});
