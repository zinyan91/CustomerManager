import { describe, expect, it } from 'vitest';
import type { LoanContract, RepaymentSchedule } from '../../types';
import {
  assessCollection, initialPaymentDraft, changePaymentDate, changeOverdueDays,
  buildPaymentUpdate, quickCollectionPlan,
} from '../paymentCollection';
import { recalculateSchedules, schedulePaymentStatus } from '../loanMath';
import { parseMoneyInput } from '../utils';

const contract = {
  Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', LoanAmount: 100_000_000,
  InterestRate: 0.12, DisbursementDate: '2026-01-01', PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
} as LoanContract;
const period = (over: Partial<RepaymentSchedule> = {}): RepaymentSchedule => ({
  Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-01-31',
  PrincipalAmount: 0, InterestAmount: 1_000_000, TotalAmount: 1_000_000,
  IsPaid: false, OverdueDays: 0, OverdueInterestAmount: 0, ...over,
});

describe('payment assessment and date synchronization', () => {
  it('charges late interest immediately on an interest-only period with default zero fields', () => {
    const draft = initialPaymentDraft(period(), contract, '2026-02-09');
    expect(draft.paymentDate).toBe('2026-02-09');
    expect(draft.overdueDaysStr).toBe('9');
    expect(parseMoneyInput(draft.overdueInterestStr)).toBe(2466);
    expect(parseMoneyInput(draft.actualPaidInterestStr)).toBe(1_002_466);
    expect(draft.overdueInterestStr).not.toBe('2466');
    const defaults = initialPaymentDraft(period({ ActualPaidPrincipal: 0, ActualPaidInterest: 0 }), contract, '2026-02-09');
    expect(parseMoneyInput(defaults.actualPaidInterestStr)).toBe(1_002_466);
  });

  it('uses the contract multiplier including zero and always includes late-interest penalty', () => {
    const s = period({ PrincipalAmount: 100_000_000 });
    expect(assessCollection(s, { ...contract, PrincipalPenaltyMultiplier: 0 }, '2026-03-02').total).toBe(8219);
    expect(assessCollection(s, contract, '2026-03-02').total).toBe(1_487_671);
  });

  it('keeps completed receipts frozen while uncollected assessments grow with the date', () => {
    const receipt = period({ IsPaid: true, PaymentDate: '2026-02-01', OverdueDays: 1, OverdueInterestAmount: 0 });
    const frozen = initialPaymentDraft(receipt, contract, '2026-10-21');
    expect(frozen.paymentDate).toBe('2026-02-01');
    expect(frozen.overdueInterestStr).toBe('0');
    expect(initialPaymentDraft(period({ OverdueDays: 1 }), contract, '2026-02-09').overdueDaysStr).toBe('9');
    const legacy = initialPaymentDraft(period({ IsPaid: true, OverdueDays: 2 }), contract, '2026-10-21');
    expect(legacy.paymentDate).toBe('2026-02-02');
    expect(legacy.overdueDaysStr).toBe('2');
  });

  it('syncs date and days in both directions across month, year and leap day', () => {
    for (const [due, days, date] of [
      ['2026-01-31', 9, '2026-02-09'],
      ['2026-12-31', 1, '2027-01-01'],
      ['2028-02-28', 2, '2028-03-01'],
    ] as const) {
      const s = period({ DueDate: due });
      const draft = initialPaymentDraft(s, contract, due);
      const byDays = changeOverdueDays(draft, String(days), s, contract);
      expect(byDays.paymentDate).toBe(date);
      const byDate = changePaymentDate(draft, date, s, contract);
      expect(byDate.overdueDaysStr).toBe(String(days));
      expect(byDate.overdueInterestStr).toBe(byDays.overdueInterestStr);
    }
  });

  it('updates suggested collection with penalty but preserves a manually entered amount', () => {
    const s = period();
    const draft = initialPaymentDraft(s, contract, s.DueDate);
    const next = changePaymentDate(draft, '2026-02-09', s, contract);
    expect(parseMoneyInput(next.actualPaidInterestStr)).toBe(1_002_466);
    expect(changePaymentDate({ ...draft, actualPaidInterestStr: '500.000' }, '2026-02-09', s, contract).actualPaidInterestStr).toBe('500.000');
  });

  it('keeps a pre-due collection date when zero overdue days is entered', () => {
    const s = period();
    const draft = initialPaymentDraft(s, contract, '2026-01-30');
    expect(changeOverdueDays(draft, '0', s, contract).paymentDate).toBe('2026-01-30');
  });

  it('rejects inconsistent dates, invalid days, empty payment date and incomplete paid confirmation', () => {
    const s = period();
    const draft = initialPaymentDraft(s, contract, '2026-02-09');
    expect(() => buildPaymentUpdate(s, { ...draft, overdueDaysStr: '2' })).toThrow(/ngày/);
    expect(() => buildPaymentUpdate(s, { ...draft, overdueDaysStr: '-1' })).toThrow();
    expect(() => buildPaymentUpdate(s, { ...draft, paymentDate: '' })).toThrow(/ngày/i);
    expect(() => buildPaymentUpdate(s, { ...draft, isPaid: true, actualPaidInterestStr: '1' })).toThrow(/chưa thu đủ/i);
  });

  it('preserves total principal and never counts penalty twice in TotalAmount', () => {
    const s = period({ PrincipalAmount: 100_000_000 });
    const draft = { ...initialPaymentDraft(s, contract, '2026-02-09'), isPaid: true };
    const updated = buildPaymentUpdate(s, draft);
    expect(schedulePaymentStatus(updated).shortfall).toBe(0);
    const recalculated = recalculateSchedules([updated], contract);
    expect(recalculated.reduce((sum, item) => sum + item.PrincipalAmount, 0)).toBe(contract.LoanAmount);
    expect(recalculated[0].TotalAmount).toBe(100_000_000 + 1_000_000 + parseMoneyInput(draft.overdueInterestStr));
  });
});

describe('quick collection by due-date offset', () => {
  it.each([0,1,2,3,4,5,6,7,8,9])('collects at due date plus %i days, including both penalty components', days => {
    const s = period({ PrincipalAmount: 100_000_000 });
    const plan = quickCollectionPlan([s], contract, days, '2026-02-28');
    const payment = plan[0];
    expect(payment.PaymentDate).toBe(days === 0 ? '2026-01-31' : `2026-02-${String(days).padStart(2,'0')}`);
    expect(payment.OverdueDays).toBe(days);
    expect(payment.OverdueInterestAmount).toBe(assessCollection(s, contract, payment.PaymentDate!).total);
    expect(schedulePaymentStatus(payment).shortfall).toBe(0);
  });

  it('skips future receipt dates, already-paid and partially collected periods', () => {
    const all = [
      period(), period({ Id: 2, IsPaid: true }), period({ Id: 3, ActualPaidInterest: 500 }),
      period({ Id: 4, DueDate: '2026-02-10' }), period({ Id: 5, PaymentDate: '2026-02-01' }),
    ];
    expect(quickCollectionPlan(all, contract, 9, '2026-02-09').map(item => item.Id)).toEqual([1]);
    expect(all[0].IsPaid).toBe(false);
  });

  it('respects a zero principal multiplier and rejects delays outside 0–9', () => {
    const plan = quickCollectionPlan([period({ PrincipalAmount: 100_000_000 })], { ...contract, PrincipalPenaltyMultiplier: 0 }, 9, '2026-02-09');
    expect(plan[0].OverdueInterestAmount).toBe(2466);
    expect(() => quickCollectionPlan([period()], contract, 10, '2026-02-28')).toThrow();
    expect(() => quickCollectionPlan([period()], contract, -1, '2026-02-28')).toThrow();
  });
});
