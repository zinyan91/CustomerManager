import type { CreditContract, LoanContract, RepaymentSchedule } from '../types';
import { calculateEarlySettlementQuote, type EarlySettlementQuote } from './loanSettlement';
import { loanMethodOfKunn, suggestSettlementFee, type SettlementFeeSuggestion } from './settlementFee';

export interface SettlementLineInput {
  contract: LoanContract;
  /** undefined khi chưa tải được lịch trả nợ: không được tính như "chưa phát sinh lịch". */
  schedules: RepaymentSchedule[] | undefined;
  settlementDate: string;
  /** Tỷ lệ cán bộ sửa tay; null thì dùng tỷ lệ gợi ý theo hình thức vay và năm vay. */
  penaltyOverridePercent: number | null;
}

export interface SettlementLine {
  contract: LoanContract;
  loanMethod: string;
  fee: SettlementFeeSuggestion;
  penaltyPercent: number;
  quote: EarlySettlementQuote | null;
  blockReason: string | null;
}

export function buildSettlementLine(input: SettlementLineInput, creditContracts: Pick<CreditContract, 'Id' | 'LoanMethod'>[]): SettlementLine {
  const { contract, schedules, settlementDate, penaltyOverridePercent } = input;
  const loanMethod = loanMethodOfKunn(contract, creditContracts);
  const fee = suggestSettlementFee({
    loanMethod,
    disbursementDate: contract.DisbursementDate || contract.ContractStartDate,
    settlementDate,
  });
  const penaltyPercent = penaltyOverridePercent ?? fee.percent;

  if (!schedules) {
    return { contract, loanMethod, fee, penaltyPercent, quote: null, blockReason: 'Chưa tải được lịch trả nợ của khoản này, chưa tính được số tiền tất toán.' };
  }
  const quote = calculateEarlySettlementQuote({ contract, schedules, settlementDate, penaltyRatePercent: penaltyPercent });
  return { contract, loanMethod, fee, penaltyPercent, quote, blockReason: quote.canSettle ? null : quote.blockReason ?? 'Không tất toán được khoản này.' };
}

export interface SettlementTotals {
  count: number;
  principal: number;
  interest: number;
  fee: number;
  total: number;
}

export function settlementTotals(lines: SettlementLine[]): SettlementTotals {
  const ok = lines.filter((l): l is SettlementLine & { quote: EarlySettlementQuote } => l.blockReason === null && l.quote !== null);
  const sum = (pick: (q: EarlySettlementQuote) => number) => ok.reduce((s, l) => s + pick(l.quote), 0);
  return {
    count: ok.length,
    principal: sum(q => q.remainingPrincipal),
    interest: sum(q => q.accruedInterest),
    fee: sum(q => q.penaltyFee),
    total: sum(q => q.totalSettlementAmount),
  };
}
