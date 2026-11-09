export type PrepaymentRepayMethod = 'equal_principal' | 'equal_installment' | 'bullet';
export type PrepaymentFeeScheduleType = 'by_year' | 'custom_rate';

export interface PrepaymentAnalysisInput {
  currentBalance: number;
  prepayAmount: number;
  rateAnnual: number;
  remainingTenorMonths: number;
  repayMethod?: PrepaymentRepayMethod;
  feeScheduleType?: PrepaymentFeeScheduleType;
  loanAgeYear?: number;
  disbursementDate?: string;
  prepayDate?: string;
  penaltyByYear?: number[];
  customPenaltyPercent?: number;
  minPenaltyFee?: number;
}

export interface PrepaymentAnalysisResult {
  currentBalance: number;
  actualPrepayAmount: number;
  isFullPrepayment: boolean;
  remainingBalanceAfterPrepay: number;
  activePenaltyPercent: number;
  penaltyFee: number;
  totalPaymentRequired: number;
  totalInterestWithoutPrepay: number;
  totalInterestWithPrepay: number;
  totalInterestSaved: number;
  netSavings: number;
  isBeneficial: boolean;
}

export const PREPAYMENT_REPAY_METHOD_LABELS: Record<PrepaymentRepayMethod, string> = {
  equal_principal: 'Gốc đều hàng tháng (Dư nợ giảm dần)',
  equal_installment: 'Gốc + Lãi đều (Niên kim cố định)',
  bullet: 'Gốc trả cuối kỳ (Bullet)',
};

export const PREPAYMENT_FEE_YEARS = 5;

export const DEFAULT_PREPAYMENT_PENALTY_BY_YEAR: readonly number[] = [4, 3, 2, 1, 0.5];

export function penaltyPercentForLoanYear(penaltyByYear: readonly number[] | undefined, loanAgeYear: number): number {
  const year = Math.max(1, Math.floor(loanAgeYear));
  if (year > PREPAYMENT_FEE_YEARS) return 0;
  const rates = penaltyByYear ?? DEFAULT_PREPAYMENT_PENALTY_BY_YEAR;
  return Math.max(0, rates[year - 1] ?? 0);
}

export function calcPrepaymentAnalysis(input: PrepaymentAnalysisInput): PrepaymentAnalysisResult {
  const currentBalance = Math.max(0, input.currentBalance || 0);
  const requestedPrepay = Math.max(0, input.prepayAmount || 0);
  const actualPrepayAmount = Math.min(requestedPrepay, currentBalance);
  const isFullPrepayment = currentBalance > 0 && actualPrepayAmount >= currentBalance;
  const remainingBalanceAfterPrepay = Math.max(0, currentBalance - actualPrepayAmount);

  const rateAnnual = Math.max(0, input.rateAnnual || 0);
  const tenorMonths = Math.max(1, Math.round(input.remainingTenorMonths || 1));
  const repayMethod = input.repayMethod || 'equal_principal';

  // Xác định tỷ lệ % phí phạt
  let activePenaltyPercent = 0;
  if (input.feeScheduleType === 'custom_rate') {
    activePenaltyPercent = Math.max(0, input.customPenaltyPercent ?? 0);
  } else {
    activePenaltyPercent = penaltyPercentForLoanYear(input.penaltyByYear, input.loanAgeYear ?? 1);
  }

  // Tiền phí phạt trả trước hạn
  const rawPenalty = Math.round(actualPrepayAmount * (activePenaltyPercent / 100));
  const minPenalty = Math.max(0, input.minPenaltyFee || 0);
  const penaltyFee = actualPrepayAmount > 0 && activePenaltyPercent > 0 && rawPenalty < minPenalty ? minPenalty : rawPenalty;

  // Tổng tiền phải thanh toán đợt này
  const totalPaymentRequired = actualPrepayAmount + penaltyFee;

  // Tính tổng lãi không trả trước vs có trả trước
  const monthlyRate = rateAnnual / 12;

  let totalInterestWithoutPrepay = 0;
  let totalInterestWithPrepay = 0;

  if (repayMethod === 'equal_principal') {
    // Gốc đều hàng tháng
    // Lãi = P * r_m * (N + 1) / 2
    totalInterestWithoutPrepay = Math.round(currentBalance * monthlyRate * ((tenorMonths + 1) / 2));
    totalInterestWithPrepay = Math.round(remainingBalanceAfterPrepay * monthlyRate * ((tenorMonths + 1) / 2));
  } else if (repayMethod === 'bullet') {
    // Gốc cuối kỳ
    totalInterestWithoutPrepay = Math.round(currentBalance * monthlyRate * tenorMonths);
    totalInterestWithPrepay = Math.round(remainingBalanceAfterPrepay * monthlyRate * tenorMonths);
  } else {
    // Niên kim / Gốc + Lãi đều
    if (monthlyRate > 0) {
      const pmtFactor = Math.pow(1 + monthlyRate, tenorMonths);
      const annuityPmtWithout = (currentBalance * monthlyRate * pmtFactor) / (pmtFactor - 1);
      totalInterestWithoutPrepay = Math.round(annuityPmtWithout * tenorMonths - currentBalance);

      if (remainingBalanceAfterPrepay > 0) {
        const annuityPmtWith = (remainingBalanceAfterPrepay * monthlyRate * pmtFactor) / (pmtFactor - 1);
        totalInterestWithPrepay = Math.round(annuityPmtWith * tenorMonths - remainingBalanceAfterPrepay);
      } else {
        totalInterestWithPrepay = 0;
      }
    } else {
      totalInterestWithoutPrepay = 0;
      totalInterestWithPrepay = 0;
    }
  }

  const totalInterestSaved = Math.max(0, totalInterestWithoutPrepay - totalInterestWithPrepay);
  const netSavings = totalInterestSaved - penaltyFee;
  const isBeneficial = netSavings > 0;

  return {
    currentBalance,
    actualPrepayAmount,
    isFullPrepayment,
    remainingBalanceAfterPrepay,
    activePenaltyPercent,
    penaltyFee,
    totalPaymentRequired,
    totalInterestWithoutPrepay,
    totalInterestWithPrepay,
    totalInterestSaved,
    netSavings,
    isBeneficial,
  };
}
