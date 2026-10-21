import { expect, it } from 'vitest';
import type { RepaymentSchedule } from '../../types';
import { verifyCollectionPersistence } from '../collectionPersistence';

const receipt = {
  Id: 1, PeriodNumber: 1, IsPaid: true, PaymentDate: '2026-10-18',
  PrincipalAmount: 0, InterestAmount: 1_000_000, OverdueInterestAmount: 822,
  ActualPaidInterest: 1_000_822, TotalAmount: 1_000_822,
} as RepaymentSchedule;
it('rejects missing receipts, mismatched payment dates and penalties', () => {
  expect(() => verifyCollectionPersistence([receipt], [])).toThrow(/Kỳ #1/);
  expect(() => verifyCollectionPersistence([receipt], [{...receipt, PaymentDate:'2026-10-19'}])).toThrow(/chưa được lưu khớp/);
  expect(() => verifyCollectionPersistence([receipt], [{...receipt, OverdueInterestAmount:0}])).toThrow(/chưa được lưu khớp/);
  expect(() => verifyCollectionPersistence([receipt], [{...receipt}])).not.toThrow();
});
