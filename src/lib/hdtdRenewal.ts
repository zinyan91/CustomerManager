import type { CreditContract } from '../types';

export function renewalCandidates(contracts: CreditContract[], editingId: number | null | undefined): CreditContract[] {
  const renewedByOther = new Set(
    contracts
      .filter(c => c.Id !== editingId && !c.IsClosed && c.RenewsCreditContractId)
      .map(c => c.RenewsCreditContractId as number),
  );
  return contracts
    .filter(c => c.Id !== editingId)
    .filter(c => !c.IsClosed)
    .filter(c => !renewedByOther.has(c.Id))
    .filter(c => editingId === null || editingId === undefined || c.RenewsCreditContractId !== editingId)
    .sort((a, b) => (b.ContractEndDate || '').localeCompare(a.ContractEndDate || ''));
}
