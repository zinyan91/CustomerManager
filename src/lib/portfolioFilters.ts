import type { CreditContract, LoanContract } from '../types';
import { resolveMasterHdtdNumber } from './creditContract';

export const NO_HDTD = 'KHONG_HDTD';
const normalized = (value: string) => value.trim().toLocaleLowerCase('vi-VN');

export function masterHdtdFilterKey(contract: LoanContract, creditContracts: CreditContract[]): string {
  if (!contract.ContractNumber?.trim() && contract.CreditContractId == null) return NO_HDTD;
  return resolveMasterHdtdNumber(contract, creditContracts).trim() || NO_HDTD;
}

export function contractsForHdtd(contracts: LoanContract[], creditContracts: CreditContract[], filter: string): LoanContract[] {
  if (filter === 'ALL') return contracts;
  return contracts.filter(contract => normalized(masterHdtdFilterKey(contract, creditContracts)) === normalized(filter));
}
