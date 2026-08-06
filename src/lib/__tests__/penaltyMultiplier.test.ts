import { describe, it, expect } from 'vitest';
import { computeSchedulePenalty } from '../loanMath';
import { DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER } from '../stkPledge';
import { periodObligation } from '../scheduleView';
import type { LoanContract, RepaymentSchedule } from '../../types';

const HOM_NAY = '2026-08-07';

const ky = (over: Partial<RepaymentSchedule> = {}): RepaymentSchedule => ({
  Id: 1, ContractId: 1, PeriodNumber: 1,
  DueDate: '2026-05-09',
  PrincipalAmount: 100_000_000,
  InterestAmount: 1_000_000,
  ...over,
} as unknown as RepaymentSchedule);

const vay = (over: Partial<LoanContract> = {}): LoanContract => ({
  Id: 1, CustomerId: 1,
  ContractNumber: 'PNAT.CN.01290824/GNN-01',
  InterestRate: 0.12,
  DisbursementDate: '2026-01-01',
  ...over,
} as unknown as LoanContract);

describe('hệ số phạt gốc theo từng khoản', () => {
  it('không khai thì dùng mặc định 150%', () => {
    const r = computeSchedulePenalty(ky(), 0.12, { asOfDateStr: HOM_NAY });
    expect(DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER).toBe(1.5);
    expect(r.principalPenaltyRate).toBeCloseTo(0.18, 10);
    expect(r.principalPenalty).toBeGreaterThan(0);
  });

  it('khai 0 là miễn phạt gốc, không rơi về 150%', () => {
    const r = computeSchedulePenalty(ky(), 0.12, {
      asOfDateStr: HOM_NAY,
      principalPenaltyMultiplier: 0,
    });
    expect(r.principalPenaltyRate).toBe(0);
    expect(r.principalPenalty).toBe(0);
  });

  it('miễn phạt gốc KHÔNG miễn lãi phạt chậm trả lãi', () => {
    const r = computeSchedulePenalty(ky(), 0.12, {
      asOfDateStr: HOM_NAY,
      principalPenaltyMultiplier: 0,
    });
    expect(r.interestPenalty).toBeGreaterThan(0);
  });

  it('hệ số lẻ vẫn dùng được nếu về sau nghiệp vụ cần', () => {
    const r = computeSchedulePenalty(ky(), 0.12, {
      asOfDateStr: HOM_NAY,
      principalPenaltyMultiplier: 1.2,
    });
    expect(r.principalPenaltyRate).toBeCloseTo(0.144, 10);
  });
});

describe('periodObligation đọc hệ số từ hợp đồng', () => {
  it('khoản miễn phạt thì nghĩa vụ kỳ không có lãi phạt gốc', () => {
    const mien = periodObligation(ky(), vay({ PrincipalPenaltyMultiplier: 0 }), HOM_NAY);
    const thuong = periodObligation(ky(), vay(), HOM_NAY);

    expect(thuong.penalty.due).toBeGreaterThan(0);
    expect(mien.penalty.due).toBe(0);
    expect(mien.total.due).toBeLessThan(thuong.total.due);
  });

  it('hệ số 0 không bị bẫy || đẩy về mặc định', () => {
    const o = periodObligation(ky(), vay({ PrincipalPenaltyMultiplier: 0 }), HOM_NAY);
    expect(o.penalty.due).toBe(0);
  });
});
