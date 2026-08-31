import { describe, it, expect } from 'vitest';
import { calcPrepaymentAnalysis } from '../prepaymentAnalysis';

describe('calcPrepaymentAnalysis', () => {
  it('tính phí phạt và lãi tiết kiệm khi tất toán 100% (Gốc đều)', () => {
    const res = calcPrepaymentAnalysis({
      currentBalance: 800_000_000,
      prepayAmount: 800_000_000,
      rateAnnual: 0.115,
      remainingTenorMonths: 60,
      repayMethod: 'equal_principal',
      loanAgeYear: 2,
      penaltyYear1: 2.0,
      penaltyYear2: 1.5,
      penaltyYear3: 1.0,
      penaltyYear4Plus: 0.0,
    });

    expect(res.currentBalance).toBe(800_000_000);
    expect(res.actualPrepayAmount).toBe(800_000_000);
    expect(res.isFullPrepayment).toBe(true);
    expect(res.remainingBalanceAfterPrepay).toBe(0);
    expect(res.activePenaltyPercent).toBe(1.5);
    expect(res.penaltyFee).toBe(12_000_000); // 800M * 1.5% = 12M
    expect(res.totalPaymentRequired).toBe(812_000_000);

    // Without prepay: 800M * (0.115/12) * (61/2) = 233,833,333
    expect(res.totalInterestWithoutPrepay).toBe(Math.round(800_000_000 * (0.115 / 12) * (61 / 2)));
    expect(res.totalInterestWithPrepay).toBe(0);
    expect(res.totalInterestSaved).toBe(res.totalInterestWithoutPrepay);
    expect(res.netSavings).toBe(res.totalInterestSaved - 12_000_000);
    expect(res.isBeneficial).toBe(true);
  });

  it('tính trả trước 1 phần gốc (Partial prepayment)', () => {
    const res = calcPrepaymentAnalysis({
      currentBalance: 1_000_000_000,
      prepayAmount: 300_000_000,
      rateAnnual: 0.10,
      remainingTenorMonths: 36,
      repayMethod: 'equal_principal',
      feeScheduleType: 'custom_rate',
      customPenaltyPercent: 1.0,
    });

    expect(res.actualPrepayAmount).toBe(300_000_000);
    expect(res.isFullPrepayment).toBe(false);
    expect(res.remainingBalanceAfterPrepay).toBe(700_000_000);
    expect(res.activePenaltyPercent).toBe(1.0);
    expect(res.penaltyFee).toBe(3_000_000);
    expect(res.totalPaymentRequired).toBe(303_000_000);
    expect(res.totalInterestSaved).toBe(Math.round(300_000_000 * (0.10 / 12) * (37 / 2)));
    expect(res.netSavings).toBe(res.totalInterestSaved - 3_000_000);
  });

  it('giới hạn số tiền trả trước không vượt quá dư nợ gốc', () => {
    const res = calcPrepaymentAnalysis({
      currentBalance: 500_000_000,
      prepayAmount: 900_000_000,
      rateAnnual: 0.09,
      remainingTenorMonths: 24,
      feeScheduleType: 'custom_rate',
      customPenaltyPercent: 2.0,
    });

    expect(res.actualPrepayAmount).toBe(500_000_000);
    expect(res.isFullPrepayment).toBe(true);
    expect(res.remainingBalanceAfterPrepay).toBe(0);
    expect(res.penaltyFee).toBe(10_000_000);
  });

  it('áp dụng mức phí phạt tối thiểu nếu rawPenalty < minPenalty', () => {
    const res = calcPrepaymentAnalysis({
      currentBalance: 50_000_000,
      prepayAmount: 10_000_000,
      rateAnnual: 0.10,
      remainingTenorMonths: 12,
      feeScheduleType: 'custom_rate',
      customPenaltyPercent: 1.0, // raw = 100k
      minPenaltyFee: 500_000,
    });

    expect(res.penaltyFee).toBe(500_000);
    expect(res.totalPaymentRequired).toBe(10_500_000);
  });

  it('xử lý Niên kim / Gốc lãi đều', () => {
    const res = calcPrepaymentAnalysis({
      currentBalance: 500_000_000,
      prepayAmount: 500_000_000,
      rateAnnual: 0.12,
      remainingTenorMonths: 24,
      repayMethod: 'equal_installment',
      feeScheduleType: 'custom_rate',
      customPenaltyPercent: 1.5,
    });

    expect(res.isFullPrepayment).toBe(true);
    expect(res.penaltyFee).toBe(7_500_000);
    expect(res.totalInterestSaved).toBeGreaterThan(0);
    expect(res.netSavings).toBe(res.totalInterestSaved - 7_500_000);
  });
});
