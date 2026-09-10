import type { LoanContract, RepaymentSchedule } from '../types';
import { diffDays } from './calcMath';
import { isScheduleFullySettled, kunnPrincipal, paidPrincipalOf } from './loanMath';
import { buildContractRateTimeline, getEffectiveActiveRate, splitPeriodByRate, weightedRatePercent } from './rateResolution';
import { fmtDate, fmtNumber } from './utils';

export interface EarlySettlementQuote {
  canSettle: boolean;
  blockReason?: string;
  contractId: number;
  settlementDate: string;
  basisStartDate: string;
  accruedDays: number;
  remainingPrincipal: number;
  effectiveRatePercent: number;
  accruedInterest: number;
  penaltyRatePercent: number;
  penaltyFee: number;
  totalSettlementAmount: number;
  settlingPeriodNumber: number;
  targetScheduleId?: number;
  futureScheduleIds: number[];
  settledRow: RepaymentSchedule | null;
}

export interface CalculateEarlySettlementParams {
  contract: LoanContract;
  schedules: RepaymentSchedule[];
  settlementDate: string;
  penaltyRatePercent?: number;
}

/**
 * Tính toán báo giá tất toán trước hạn KUNN:
 * - Thu nốt dư nợ gốc còn lại
 * - Tính lãi dồn tích từ ngày bắt đầu kỳ hiện tại đến ngày tất toán (Actual/365)
 * - Phí trả nợ trước hạn (nếu có)
 * - Xác định kỳ chốt tất toán và danh sách các kỳ tương lai cần xóa
 */
export function calculateEarlySettlementQuote({
  contract,
  schedules,
  settlementDate,
  penaltyRatePercent = 0,
}: CalculateEarlySettlementParams): EarlySettlementQuote {
  const contractId = contract.Id;
  const penaltyRate = Math.max(0, Number(penaltyRatePercent) || 0);

  if (contract.IsSettled) {
    return {
      canSettle: false,
      blockReason: 'Khoản vay này đã ở trạng thái tất toán.',
      contractId,
      settlementDate,
      basisStartDate: settlementDate,
      accruedDays: 0,
      remainingPrincipal: 0,
      effectiveRatePercent: 0,
      accruedInterest: 0,
      penaltyRatePercent: penaltyRate,
      penaltyFee: 0,
      totalSettlementAmount: 0,
      settlingPeriodNumber: 0,
      futureScheduleIds: [],
      settledRow: null,
    };
  }

  const sorted = [...schedules].sort((a, b) => a.PeriodNumber - b.PeriodNumber);
  const targetIdx = sorted.findIndex(s => !isScheduleFullySettled(s));

  // Xác định mốc ngày bắt đầu tính lãi của kỳ hiện tại
  let basisStartDate: string;
  let targetSchedule: RepaymentSchedule | null = null;
  let settlingPeriodNumber = 1;
  let futureScheduleIds: number[] = [];

  const disburseOrStart = contract.DisbursementDate || contract.ContractStartDate || settlementDate;

  if (sorted.length === 0) {
    // Chưa phát sinh bảng lịch
    basisStartDate = disburseOrStart;
    settlingPeriodNumber = 1;
    futureScheduleIds = [];
  } else if (targetIdx === -1) {
    // Tất cả các kỳ đã thu đủ nhưng hợp đồng chưa đóng cờ IsSettled
    return {
      canSettle: false,
      blockReason: 'Toàn bộ các kỳ trả nợ đã được thu đủ. Bạn chỉ cần đánh dấu hoàn tất.',
      contractId,
      settlementDate,
      basisStartDate: sorted[sorted.length - 1]?.DueDate || disburseOrStart,
      accruedDays: 0,
      remainingPrincipal: 0,
      effectiveRatePercent: 0,
      accruedInterest: 0,
      penaltyRatePercent: penaltyRate,
      penaltyFee: 0,
      totalSettlementAmount: 0,
      settlingPeriodNumber: sorted.length,
      futureScheduleIds: [],
      settledRow: null,
    };
  } else {
    targetSchedule = sorted[targetIdx];
    settlingPeriodNumber = targetSchedule.PeriodNumber;
    basisStartDate = targetIdx === 0
      ? disburseOrStart
      : (sorted[targetIdx - 1]?.DueDate || disburseOrStart);
    futureScheduleIds = sorted.slice(targetIdx + 1).map(s => s.Id).filter(id => Boolean(id) && id > 0);
  }

  // Kiểm tra tính hợp lệ của ngày tất toán
  if (settlementDate < basisStartDate) {
    return {
      canSettle: false,
      blockReason: `Ngày tất toán (${fmtDate(settlementDate)}) không được trước ngày bắt đầu tính lãi kỳ (${fmtDate(basisStartDate)}).`,
      contractId,
      settlementDate,
      basisStartDate,
      accruedDays: 0,
      remainingPrincipal: 0,
      effectiveRatePercent: 0,
      accruedInterest: 0,
      penaltyRatePercent: penaltyRate,
      penaltyFee: 0,
      totalSettlementAmount: 0,
      settlingPeriodNumber,
      futureScheduleIds,
      settledRow: null,
    };
  }

  // Tính dư nợ gốc còn lại
  const totalLoan = kunnPrincipal(contract);
  let repaidPrior = 0;
  if (sorted.length > 0 && targetIdx > 0) {
    for (let i = 0; i < targetIdx; i++) {
      repaidPrior += paidPrincipalOf(sorted[i]);
    }
  }
  const remainingPrincipal = Math.max(0, totalLoan - repaidPrior);

  if (remainingPrincipal <= 0) {
    return {
      canSettle: false,
      blockReason: 'Dư nợ gốc của khoản vay đã hết (0 VNĐ).',
      contractId,
      settlementDate,
      basisStartDate,
      accruedDays: 0,
      remainingPrincipal: 0,
      effectiveRatePercent: 0,
      accruedInterest: 0,
      penaltyRatePercent: penaltyRate,
      penaltyFee: 0,
      totalSettlementAmount: 0,
      settlingPeriodNumber,
      futureScheduleIds,
      settledRow: null,
    };
  }

  // Số ngày tính lãi lẻ thực tế
  const accruedDays = diffDays(basisStartDate, settlementDate);

  // Lãi suất hiệu lực và phân đoạn lãi suất (Rate timeline)
  const rateTimeline = buildContractRateTimeline(contract, { today: settlementDate });
  const rateSegments = rateTimeline.length > 0 && accruedDays > 0
    ? splitPeriodByRate(rateTimeline, basisStartDate, settlementDate, accruedDays)
    : [];

  const effectiveRatePercent = rateSegments.length > 0
    ? weightedRatePercent(rateSegments)
    : getEffectiveActiveRate(contract, settlementDate) * 100;

  // Tiền lãi thực tế phát sinh (Actual/365)
  const accruedInterest = accruedDays <= 0 || remainingPrincipal <= 0
    ? 0
    : (rateSegments.length > 0
        ? Math.round(rateSegments.reduce(
            (acc, seg) => acc + remainingPrincipal * (seg.ratePercent / 100) * (seg.days / 365), 0))
        : Math.round(remainingPrincipal * (effectiveRatePercent / 100) * (accruedDays / 365)));

  // Phí trả trước hạn
  const penaltyFee = penaltyRate > 0
    ? Math.round(remainingPrincipal * (penaltyRate / 100))
    : 0;

  // Tổng tiền tất toán
  const totalSettlementAmount = remainingPrincipal + accruedInterest + penaltyFee;

  // Tạo hàng kỳ tất toán đã chốt
  const noteParts: string[] = [`Tất toán trước hạn ngày ${fmtDate(settlementDate)}`];
  if (penaltyFee > 0) {
    noteParts.push(`Phí phạt trả trước (${penaltyRate}%): ${fmtNumber(penaltyFee)} đ`);
  }
  if (accruedDays > 0) {
    noteParts.push(`Lãi dồn tích ${accruedDays} ngày: ${fmtNumber(accruedInterest)} đ`);
  }

  const baseRow = targetSchedule || {
    Id: 0,
    ContractId: contractId,
    PeriodNumber: settlingPeriodNumber,
    DueDate: settlementDate,
    PrincipalAmount: remainingPrincipal,
    InterestAmount: accruedInterest,
    TotalAmount: totalSettlementAmount,
    IsPaid: true,
  };

  const settledRow: RepaymentSchedule = {
    ...baseRow,
    PeriodNumber: settlingPeriodNumber,
    DueDate: settlementDate,
    PaymentDate: settlementDate,
    PrincipalAmount: remainingPrincipal,
    ActualPaidPrincipal: remainingPrincipal,
    InterestAmount: accruedInterest,
    ActualPaidInterest: accruedInterest,
    OverdueDays: 0,
    OverdueInterestAmount: 0,
    PrepaidPrincipalAmount: 0,
    TotalAmount: totalSettlementAmount,
    ActualPaidAmount: totalSettlementAmount,
    IsPaid: true,
    Note: noteParts.join(' · '),
  };

  return {
    canSettle: true,
    contractId,
    settlementDate,
    basisStartDate,
    accruedDays,
    remainingPrincipal,
    effectiveRatePercent,
    accruedInterest,
    penaltyRatePercent: penaltyRate,
    penaltyFee,
    totalSettlementAmount,
    settlingPeriodNumber,
    targetScheduleId: targetSchedule?.Id,
    futureScheduleIds,
    settledRow,
  };
}
