import type { RepaymentSchedule } from '../types';

const AMOUNTS = ['PrincipalAmount', 'InterestAmount', 'TotalAmount', 'OverdueDays', 'OverdueInterestAmount', 'ActualPaidPrincipal', 'ActualPaidInterest', 'PrepaidPrincipalAmount'] as const;

export function verifyCollectionPersistence(expected: RepaymentSchedule[], actual: RepaymentSchedule[]): void {
  const byId = new Map(actual.map(row => [row.Id, row]));
  for (const source of expected) {
    const saved = byId.get(source.Id);
    if (!saved || saved.IsPaid !== source.IsPaid || (saved.PaymentDate ?? null) !== (source.PaymentDate ?? null)
      || AMOUNTS.some(key => source[key] != null && Number(saved[key] ?? 0) !== Number(source[key]))) {
      throw new Error(`Kỳ #${source.PeriodNumber} chưa được lưu khớp số liệu. Tải lại lịch trả nợ để đối soát trước khi thu tiếp.`);
    }
  }
}
