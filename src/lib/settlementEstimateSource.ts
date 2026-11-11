import type { CreditContract, LoanContract, RepaymentSchedule } from '../types';
import { calculateEarlySettlementQuote } from './loanSettlement';
import { loanMethodOfKunn } from './settlementFee';
import { isKunnOfClosedHdtd } from './creditContract';

export interface EstimateSourceLoan {
  contractId: number;
  contractNumber: string;
  loanMethod: string;
  principal: number;
  rateAnnualPercent: number;
  disbursementDate: string;
  interestFromDate: string;
}

export interface EstimateSourceSkip {
  contractId: number;
  contractNumber: string;
  reason: string;
}

export interface EstimateSourceInput {
  contracts: LoanContract[];
  creditContracts: CreditContract[];
  schedules: RepaymentSchedule[];
}

export function openLoansForEstimate(
  source: EstimateSourceInput,
  settlementDate: string,
): { loans: EstimateSourceLoan[]; skipped: EstimateSourceSkip[] } {
  const byContract = new Map<number, RepaymentSchedule[]>();
  for (const s of source.schedules) {
    const list = byContract.get(s.ContractId) ?? [];
    list.push(s);
    byContract.set(s.ContractId, list);
  }

  const loans: EstimateSourceLoan[] = [];
  const skipped: EstimateSourceSkip[] = [];
  const open = source.contracts
    .filter(c => !c.IsSettled && !isKunnOfClosedHdtd(c, source.creditContracts))
    .sort((a, b) => a.ContractNumber.localeCompare(b.ContractNumber, 'vi'));

  for (const contract of open) {
    const quote = calculateEarlySettlementQuote({
      contract, schedules: byContract.get(contract.Id) ?? [], settlementDate, penaltyRatePercent: 0,
    });
    if (!quote.canSettle) {
      skipped.push({ contractId: contract.Id, contractNumber: contract.ContractNumber, reason: quote.blockReason ?? 'Không tính được.' });
      continue;
    }
    loans.push({
      contractId: contract.Id,
      contractNumber: contract.ContractNumber,
      loanMethod: loanMethodOfKunn(contract, source.creditContracts),
      principal: quote.remainingPrincipal,
      rateAnnualPercent: Number(quote.effectiveRatePercent.toFixed(4)),
      disbursementDate: contract.DisbursementDate || contract.ContractStartDate || '',
      interestFromDate: quote.basisStartDate,
    });
  }
  return { loans, skipped };
}
