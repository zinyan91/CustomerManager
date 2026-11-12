import type { CreditContract } from '../types';
import { toIsoDate } from './utils';

export function renewalCandidates(
  contracts: CreditContract[],
  editingId: number | null | undefined,
  startDate: string | null | undefined,
): CreditContract[] {
  const start = toIsoDate(startDate);
  if (!start) return [];
  const renewedByOther = new Set(
    contracts
      .filter(c => c.Id !== editingId && !c.IsClosed && c.RenewsCreditContractId)
      .map(c => c.RenewsCreditContractId as number),
  );
  return contracts
    .filter(c => c.Id !== editingId)
    .filter(c => {
      const candidateStart = toIsoDate(c.ContractStartDate);
      return Boolean(candidateStart && candidateStart < start);
    })
    .filter(c => !renewedByOther.has(c.Id))
    .filter(c => editingId === null || editingId === undefined || c.RenewsCreditContractId !== editingId)
    .sort((a, b) => (b.ContractStartDate || '').localeCompare(a.ContractStartDate || ''));
}

export function renewalError(
  contracts: CreditContract[],
  editingId: number | null | undefined,
  startDate: string | null | undefined,
  renewsId: number | null | undefined,
): string | null {
  if (!renewsId) return null;
  if (!toIsoDate(startDate)) return 'Nhập ngày hiệu lực của HĐTD trước khi chọn HĐTD được tái tục.';
  if (renewalCandidates(contracts, editingId, startDate).some(c => c.Id === renewsId)) return null;
  return 'HĐTD được tái tục phải bắt đầu trước HĐTD này và chưa được HĐTD khác tái tục.';
}

export type HdtdListState = 'open' | 'renewed' | 'settled';

export function hdtdListState(s: { contract: Pick<CreditContract, 'IsClosed'>; renewedBy: CreditContract | null }): HdtdListState {
  if (s.contract.IsClosed) return 'settled';
  if (s.renewedBy) return 'renewed';
  return 'open';
}
