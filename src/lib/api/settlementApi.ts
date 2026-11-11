import type { LoanContract, RepaymentSchedule } from '../../types';
import type { EarlySettlementQuote } from '../loanSettlement';
import { bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByIdsAPI, fetchRepaymentSchedulesAPI, saveContractAPI } from './loanContractApi';

export interface AppliedSettlement {
  contract: LoanContract;
  /** null khi đã ghi xong mà chưa đọc lại được lịch; lý do ở `reloadError`. */
  schedules: RepaymentSchedule[] | null;
  reloadError: string | null;
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

  const settled = { ...contract, ...patch };
  // Đã ghi vào CSDL: lỗi đọc lại không được biến khoản đã tất toán thành "chưa ghi được" (ghi lại sẽ tất toán hai lần).
  try {
    return { contract: settled, schedules: await fetchRepaymentSchedulesAPI(contract.Id), reloadError: null };
  } catch (err) {
    return { contract: settled, schedules: null, reloadError: err instanceof Error ? err.message : String(err) };
  }
}
