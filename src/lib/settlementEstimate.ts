import { diffDays } from './calcMath';
import { suggestSettlementFee, type SettlementFeeSuggestion } from './settlementFee';
import { toIsoDate } from './utils';

/** Một khoản vay nhập tay để ước tính tất toán khi khách chưa có trên hệ thống. */
export interface EstimateLoanInput {
  loanMethod: string;
  principal: number;
  rateAnnualPercent: number;
  disbursementDate: string;
  /** Ngày trả lãi gần nhất: mốc bắt đầu tính lãi dồn tích. Bỏ trống thì tính từ ngày giải ngân. */
  interestFromDate: string;
  settlementDate: string;
  penaltyOverridePercent: number | null;
}

export interface EstimateLine {
  fee: SettlementFeeSuggestion;
  penaltyPercent: number;
  principal: number;
  accruedDays: number;
  accruedInterest: number;
  penaltyFee: number;
  total: number;
  error: string | null;
}

/** Cùng cách tính với tất toán thật: lãi Actual/365 trên gốc còn lại, phí trên gốc còn lại. */
export function estimateSettlementLine(input: EstimateLoanInput): EstimateLine {
  const settlementDate = toIsoDate(input.settlementDate) ?? '';
  const fee = suggestSettlementFee({ loanMethod: input.loanMethod, disbursementDate: input.disbursementDate, settlementDate });
  const penaltyPercent = input.penaltyOverridePercent ?? fee.percent;
  const empty = { fee, penaltyPercent, principal: 0, accruedDays: 0, accruedInterest: 0, penaltyFee: 0, total: 0 };

  const principal = Math.max(0, input.principal || 0);
  if (principal <= 0) return { ...empty, error: 'Nhập dư nợ gốc' };
  const from = toIsoDate(input.interestFromDate) ?? toIsoDate(input.disbursementDate);
  if (!from) return { ...empty, error: 'Nhập ngày giải ngân hoặc ngày trả lãi gần nhất' };
  if (!settlementDate) return { ...empty, error: 'Nhập ngày tất toán' };
  if (settlementDate < from) return { ...empty, error: 'Ngày tất toán trước mốc tính lãi' };

  const accruedDays = diffDays(from, settlementDate);
  const rate = Math.max(0, input.rateAnnualPercent || 0);
  const accruedInterest = Math.round(principal * (rate / 100) * (accruedDays / 365));
  const penaltyFee = Math.round(principal * (Math.max(0, penaltyPercent) / 100));
  return { fee, penaltyPercent, principal, accruedDays, accruedInterest, penaltyFee, total: principal + accruedInterest + penaltyFee, error: null };
}

export function estimateTotals(lines: EstimateLine[]) {
  const ok = lines.filter(l => l.error === null);
  const sum = (pick: (l: EstimateLine) => number) => ok.reduce((s, l) => s + pick(l), 0);
  return {
    count: ok.length,
    principal: sum(l => l.principal),
    interest: sum(l => l.accruedInterest),
    fee: sum(l => l.penaltyFee),
    total: sum(l => l.total),
  };
}
