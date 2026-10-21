import { describe, it, expect } from 'vitest';
import { periodObligation, resolvePenaltyDue, sumObligations } from '../scheduleView';
import type { LoanContract, RepaymentSchedule } from '../../types';

const contract = {
  Id: 1,
  ContractNumber: 'TEST/GNN-01',
  InterestRate: 12,
  DisbursementDate: '2026-01-01',
} as unknown as LoanContract;

const schedule = (over: Partial<RepaymentSchedule>): RepaymentSchedule => ({
  Id: 1,
  ContractId: 1,
  PeriodNumber: 1,
  DueDate: '2026-01-31',
  PrincipalAmount: 1_000_000,
  InterestAmount: 100_000,
  ...over,
} as unknown as RepaymentSchedule);

describe('resolvePenaltyDue', () => {
  it('tôn trọng lãi phạt khai tay bằng 0, không rơi về mức tính tự động', () => {
    const s = schedule({ OverdueInterestAmount: 0, OverdueDays: 90, PaymentDate: '2026-08-06' });
    expect(resolvePenaltyDue(s, contract, '2026-08-06')).toBe(0);
  });

  it('dùng số khai tay khi có', () => {
    const s = schedule({ OverdueInterestAmount: 55_000, OverdueDays: 90, PaymentDate: '2026-08-06' });
    expect(resolvePenaltyDue(s, contract, '2026-08-06')).toBe(55_000);
  });

  it('tính dồn tích khi chưa khai và kỳ quá hạn', () => {
    const s = schedule({ OverdueInterestAmount: undefined, OverdueDays: 90 });
    expect(resolvePenaltyDue(s, contract, '2026-08-06')).toBeGreaterThan(0);
  });

  it('không tính phạt cho kỳ đã tất toán mà chưa khai', () => {
    const s = schedule({ OverdueInterestAmount: undefined, IsPaid: true, OverdueDays: 90 });
    expect(resolvePenaltyDue(s, contract, '2026-08-06')).toBe(0);
  });

  it('updates uncollected zero-default penalties with the calendar date and includes late interest', () => {
    const s = schedule({ PrincipalAmount: 0, InterestAmount: 1_000_000, OverdueInterestAmount: 0, OverdueDays: 1 });
    expect(resolvePenaltyDue(s, contract, '2026-02-09')).toBe(2466);
    expect(resolvePenaltyDue(s, contract, '2026-02-10')).toBe(2740);
    expect(periodObligation(s, contract, '2026-02-10').overdueDays).toBe(10);
  });

  it('splits collected interest and penalty without double counting on partial receipts', () => {
    const s = schedule({ PrincipalAmount: 1_000_000, InterestAmount: 100_000, OverdueInterestAmount: 10_000, ActualPaidPrincipal: 0, ActualPaidInterest: 105_000 });
    const o = periodObligation(s, contract, '2026-08-06');
    expect(o.interest.paid).toBe(100_000);
    expect(o.penalty.paid).toBe(5000);
    expect(o.total.paid).toBe(105_000);
    expect(o.total.unpaid).toBe(1_005_000);
  });
});

describe('periodObligation', () => {
  it('kỳ IsPaid không khai số coi như đã thu đủ theo lịch', () => {
    const o = periodObligation(schedule({ IsPaid: true }), contract, '2026-08-06');
    expect(o.isSettled).toBe(true);
    expect(o.total.due).toBe(1_100_000);
    expect(o.total.paid).toBe(1_100_000);
    expect(o.total.unpaid).toBe(0);
    expect(o.isOverdue).toBe(false);
  });

  it('gốc trả trước hạn đã nằm trong PrincipalAmount, không cộng thêm lần nữa', () => {
    const o = periodObligation(
      schedule({ PrincipalAmount: 800_840, InterestAmount: 24_158, PrepaidPrincipalAmount: 785_000, ActualPaidPrincipal: 15_840, ActualPaidInterest: 24_158 }),
      contract,
      '2026-08-06'
    );
    expect(o.principal.due).toBe(800_840);
    expect(o.principal.paid).toBe(800_840);
    expect(o.total.unpaid).toBe(0);
  });

  it('thu một phần thì phần còn nợ bằng nghĩa vụ trừ phần đã thu', () => {
    const o = periodObligation(
      schedule({ ActualPaidPrincipal: 400_000, ActualPaidInterest: 100_000, OverdueInterestAmount: 0 }),
      contract,
      '2026-08-06'
    );
    expect(o.isSettled).toBe(false);
    expect(o.principal.unpaid).toBe(600_000);
    expect(o.interest.unpaid).toBe(0);
    expect(o.total.unpaid).toBe(600_000);
  });

  it('kỳ chưa thu và đã qua hạn được đánh dấu quá hạn theo ngày đối chiếu', () => {
    const o = periodObligation(schedule({ DueDate: '2026-07-07' }), contract, '2026-08-06');
    expect(o.isOverdue).toBe(true);
    expect(o.overdueDays).toBe(30);
  });

  it('kỳ chưa tới hạn không quá hạn', () => {
    const o = periodObligation(schedule({ DueDate: '2026-09-30' }), contract, '2026-08-06');
    expect(o.isOverdue).toBe(false);
    expect(o.overdueDays).toBe(0);
  });

  it('tổng nghĩa vụ bằng gốc cộng lãi cộng phạt', () => {
    const o = periodObligation(
      schedule({ OverdueInterestAmount: 30_000, DueDate: '2026-07-07', PaymentDate: '2026-08-06' }),
      contract,
      '2026-08-06'
    );
    expect(o.total.due).toBe(1_130_000);
  });
});

describe('sumObligations', () => {
  it('tổng cột bằng tổng các dòng, kể cả khi có kỳ miễn phạt', () => {
    const rows = [
      schedule({ Id: 1, IsPaid: true }),
      schedule({ Id: 2, DueDate: '2026-07-07', OverdueInterestAmount: 0, PaymentDate: '2026-08-06' }),
      schedule({ Id: 3, DueDate: '2026-09-30' }),
    ].map(s => periodObligation(s, contract, '2026-08-06'));

    const total = sumObligations(rows);
    expect(total.due).toBe(rows.reduce((a, o) => a + o.total.due, 0));
    expect(total.unpaid).toBe(rows.reduce((a, o) => a + o.total.unpaid, 0));
    expect(total.unpaid).toBe(2_200_000);
  });
});
