import { describe, it, expect } from 'vitest';
import {
  computeToiLoanMonth, computeToiLoanSummary, defaultToiLoanInputs,
  type ToiLoanMonthInput,
} from '../toiMath';

describe('TOI Loan VND Math Calculations', () => {
  it('tính margin và thu nhập tín dụng tháng T1 chính xác', () => {
    const input: ToiLoanMonthInput = {
      month: 1,
      days: 31,
      shortTermBal: 1250, // 1,250 triệu VNĐ
      shortTermRate: 9.0, // 9%
      shortTermFtp: 8.0,  // 8% => Margin = 1.0%
      longTermBal: 0,
      longTermRate: 10.0,
      longTermFtp: 8.5,
    };

    const res = computeToiLoanMonth(input);

    expect(res.shortTermMargin).toBe(1.0); // 9.0 - 8.0 = 1.0%
    // 1250 * (1.0 / 100) * 31 / 360 = 12.5 * 31 / 360 = 1.076388888...
    expect(res.shortTermIncome).toBeCloseTo(1.076388888, 5);
    expect(res.totalIncome).toBeCloseTo(1.076388888, 5);
    expect(res.totalBal).toBe(1250);
  });

  it('tính tổng TOI cho vay cả năm 12 tháng chính xác', () => {
    const inputs = defaultToiLoanInputs();
    const summary = computeToiLoanSummary(inputs);

    expect(summary.monthlyResults.length).toBe(12);
    expect(summary.avgBalanceAnnual).toBe(1250);

    // 1250 triệu * 1% margin * 365 ngày / 360 ngày = 12.67361111 triệu đồng
    expect(summary.totalIncomeAnnual).toBeCloseTo(12.67361111, 4);

    // TOI / DNBQ = 12.67361111 / 1250 = 0.010138888 (1.01388%)
    expect(summary.toiOverAvgBalance).toBeCloseTo(0.010138888, 5);
  });
});
