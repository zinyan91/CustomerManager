import { describe, it, expect } from 'vitest';
import {
  calcRateReductionForLoan,
  sumInterestReduced,
  resolveReducedRateAnnual,
  buildRateReductionSchedule,
  summarizeRateReduction,
} from '../rateReduction';
import { edate, addMonths } from '../calcMath';

describe('edate', () => {
  it('clamps to the last day of a shorter target month', () => {
    expect(edate('2026-01-31', 1)).toBe('2026-02-28');
    expect(edate('2026-01-31', 3)).toBe('2026-04-30');
  });

  it('handles zero and negative offsets', () => {
    expect(edate('2026-03-15', 0)).toBe('2026-03-15');
    expect(edate('2026-01-15', -1)).toBe('2025-12-15');
    expect(edate('2026-01-31', -1)).toBe('2025-12-31');
  });

  it('leaves addMonths behaviour unchanged', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 0)).toBe('');
    expect(addMonths('', 3)).toBe('');
  });
});

describe('calcRateReductionForLoan', () => {
  it('matches the NH template formula: balance x deltaRate x days / 365', () => {
    const r = calcRateReductionForLoan({
      balance: 1_500_000_000,
      standardRateAnnual: 0.1025,
      proposedRateAnnual: 0.0825,
      days: 61,
      cofAnnual: 0.053,
    });
    expect(r.deltaRateAnnual).toBeCloseTo(0.02, 10);
    expect(r.interestReduced).toBe(Math.round(1_500_000_000 * 0.02 * 61 / 365));
    expect(r.interestReduced).toBe(5_013_699);
  });

  it('computes margin against COF, and keeps a zero COF meaningful', () => {
    const r = calcRateReductionForLoan({
      balance: 1_000_000_000,
      standardRateAnnual: 0.1,
      proposedRateAnnual: 0.08,
      days: 30,
      cofAnnual: 0,
    });
    expect(r.marginCurrentAnnual).toBeCloseTo(0.1, 10);
    expect(r.marginProposedAnnual).toBeCloseTo(0.08, 10);
  });

  it('reports null margins when COF is not supplied', () => {
    const r = calcRateReductionForLoan({
      balance: 1_000_000_000,
      standardRateAnnual: 0.1,
      proposedRateAnnual: 0.08,
      days: 30,
    });
    expect(r.marginCurrentAnnual).toBeNull();
    expect(r.marginProposedAnnual).toBeNull();
  });

  it('never produces a negative reduction when the proposal is higher than the standard rate', () => {
    const r = calcRateReductionForLoan({
      balance: 1_000_000_000,
      standardRateAnnual: 0.08,
      proposedRateAnnual: 0.1,
      days: 90,
    });
    expect(r.deltaRateAnnual).toBe(0);
    expect(r.interestReduced).toBe(0);
    expect(r.interestFinal).toBe(r.interestOriginal);
  });

  it('sums a multi-loan proposal', () => {
    const rows = [
      { balance: 1_500_000_000, standardRateAnnual: 0.1025, proposedRateAnnual: 0.0825, days: 61 },
      { balance: 2_200_000_000, standardRateAnnual: 0.1025, proposedRateAnnual: 0.0825, days: 61 },
    ].map(calcRateReductionForLoan);

    expect(sumInterestReduced(rows)).toBe(5_013_699 + 7_353_425);
    expect(sumInterestReduced([])).toBe(0);
  });
});

describe('resolveReducedRateAnnual', () => {
  it('applies the maximum-reduction cap', () => {
    expect(resolveReducedRateAnnual(0.126, null, 0, 0.03)).toBeCloseTo(0.096, 10);
  });

  it('respects the regulatory floor', () => {
    expect(resolveReducedRateAnnual(0.126, null, 0.0982, 0.03)).toBeCloseTo(0.0982, 10);
  });

  it('honours a proposed rate that is milder than the cap allows', () => {
    expect(resolveReducedRateAnnual(0.126, 0.11, 0.0982, 0.03)).toBeCloseTo(0.11, 10);
  });

  it('does not let a proposed rate breach the cap or the floor', () => {
    expect(resolveReducedRateAnnual(0.126, 0.05, 0.0982, 0.03)).toBeCloseTo(0.0982, 10);
    expect(resolveReducedRateAnnual(0.126, 0.05, 0, 0.03)).toBeCloseTo(0.096, 10);
  });

  it('never raises the rate above the standard rate', () => {
    expect(resolveReducedRateAnnual(0.09, 0.2, 0, 0.03)).toBeCloseTo(0.09, 10);
  });
});

describe('buildRateReductionSchedule', () => {
  const base = {
    loanAmount: 2_000_000_000,
    tenorMonths: 120,
    firstPaymentDate: '2026-01-31',
    preferentialRateAnnual: 0.09,
    preferentialMonths: 12,
    postPreferentialRateAnnual: 0.126,
    reductionStartMonth: 28,
    reductionMonths: 3,
    proposedRateAnnual: 0.099,
    minRateAnnual: 0.0982,
    maxReductionAnnual: 0.03,
  };

  it('keeps the total principal exactly equal to the loan amount', () => {
    const rows = buildRateReductionSchedule(base);
    const totalPrincipal = rows.reduce((s, r) => s + r.principalPayment, 0);
    expect(totalPrincipal).toBe(base.loanAmount);
    expect(rows[rows.length - 1].endingBalance).toBe(0);
  });

  it('holds the invariant for an amount that does not divide evenly', () => {
    const rows = buildRateReductionSchedule({ ...base, loanAmount: 1_000_000_001, tenorMonths: 7 });
    expect(rows.reduce((s, r) => s + r.principalPayment, 0)).toBe(1_000_000_001);
    expect(rows[rows.length - 1].endingBalance).toBe(0);
  });

  it('uses EDATE month-ends rather than rolling into the next month', () => {
    const rows = buildRateReductionSchedule(base);
    expect(rows[0].paymentDate).toBe('2026-01-31');
    expect(rows[1].paymentDate).toBe('2026-02-28');
    expect(rows[2].paymentDate).toBe('2026-03-31');
    expect(rows[1].daysInPeriod).toBe(28);
    expect(rows[2].daysInPeriod).toBe(31);
  });

  it('charges interest on actual days, so a longer period can cost more than the one before', () => {
    const rows = buildRateReductionSchedule({ ...base, preferentialMonths: 120 });
    expect(rows[2].beginningBalance).toBeLessThan(rows[1].beginningBalance);
    expect(rows[2].interestOriginal).toBeGreaterThan(rows[1].interestOriginal);
  });

  it('applies the reduction only inside the s..s+k-1 window', () => {
    const rows = buildRateReductionSchedule(base);
    const reduced = rows.filter(r => r.isReduced).map(r => r.month);
    expect(reduced).toEqual([28, 29, 30]);
    expect(rows[27].reducedRateAnnual).toBeCloseTo(0.099, 10);
    expect(rows[27].deltaRateAnnual).toBeCloseTo(0.027, 10);
  });

  it('never reduces inside the preferential period', () => {
    const rows = buildRateReductionSchedule({ ...base, reductionStartMonth: 6, reductionMonths: 12 });
    const reduced = rows.filter(r => r.isReduced).map(r => r.month);
    expect(reduced).toEqual([13, 14, 15, 16, 17]);
  });

  it('produces no reduction when the window is empty', () => {
    const rows = buildRateReductionSchedule({ ...base, reductionMonths: 0 });
    expect(rows.some(r => r.isReduced)).toBe(false);
    expect(summarizeRateReduction(rows).totalInterestReduced).toBe(0);
  });

  it('splits interest so that reduced + final equals the original, per period', () => {
    const rows = buildRateReductionSchedule(base);
    for (const r of rows) {
      expect(Math.abs(r.interestOriginal - r.interestFinal - r.interestReduced)).toBeLessThanOrEqual(1);
    }
  });

  it('returns nothing for degenerate input', () => {
    expect(buildRateReductionSchedule({ ...base, loanAmount: 0 })).toEqual([]);
    expect(buildRateReductionSchedule({ ...base, tenorMonths: 0 })).toEqual([]);
    expect(buildRateReductionSchedule({ ...base, firstPaymentDate: '' })).toEqual([]);
  });
});

describe('summarizeRateReduction', () => {
  it('aggregates the schedule and the saving ratio', () => {
    const rows = buildRateReductionSchedule({
      loanAmount: 1_200_000_000,
      tenorMonths: 12,
      firstPaymentDate: '2026-01-15',
      preferentialRateAnnual: 0.09,
      preferentialMonths: 3,
      postPreferentialRateAnnual: 0.12,
      reductionStartMonth: 4,
      reductionMonths: 2,
      proposedRateAnnual: 0.1,
      minRateAnnual: 0.09,
      maxReductionAnnual: 0.03,
    });
    const s = summarizeRateReduction(rows);

    expect(s.totalPrincipal).toBe(1_200_000_000);
    expect(s.reducedPeriodCount).toBe(2);
    expect(s.totalInterestReduced).toBeGreaterThan(0);
    expect(s.savingRatio).toBeCloseTo(s.totalInterestReduced / s.totalInterestOriginal, 10);
  });

  it('is safe on an empty schedule', () => {
    const s = summarizeRateReduction([]);
    expect(s.totalInterestReduced).toBe(0);
    expect(s.savingRatio).toBe(0);
  });
});
