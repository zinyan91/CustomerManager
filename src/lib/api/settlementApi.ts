import type { LoanContract, RepaymentSchedule } from '../../types';
import type { EarlySettlementQuote } from '../loanSettlement';
import { bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByIdsAPI, fetchRepaymentSchedulesAPI, saveContractAPI } from './loanContractApi';

export interface AppliedSettlement {
  contract: LoanContract;
  schedules: RepaymentSchedule[];
}

/** Ghi tất toán một KUNN: xoá các kỳ tương lai, chốt kỳ tất toán, đánh dấu KUNN đã tất toán, đọc lại lịch. */
export async function applyEarlySettlementAPI(contract: LoanContract, quote: EarlySettlementQuote): Promise<AppliedSettlement> {
  if (!quote.canSettle) throw new Error(quote.blockReason || 'Không thể tất toán khoản vay này.');

  if (quote.futureScheduleIds.length > 0) await deleteRepaymentSchedulesByIdsAPI(quote.futureScheduleIds);
  if (quote.settledRow) await bulkSaveRepaymentSchedulesAPI([quote.settledRow]);

  const patch: Partial<LoanContract> = {
    Id: contract.Id,
    CustomerId: contract.CustomerId,
    ContractNumber: contract.ContractNumber,
    CurrentBalance: 0,
    IsSettled: true,
    SettledDate: quote.settlementDate,
    DebtGroup: 1,
  };
  await saveContractAPI(patch);

  return { contract: { ...contract, ...patch }, schedules: await fetchRepaymentSchedulesAPI(contract.Id) };
}
