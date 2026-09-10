import { describe, it, expect } from 'vitest';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { calculateEarlySettlementQuote } from '../loanSettlement';

const makeContract = (over: Partial<LoanContract> = {}): LoanContract => ({
  Id: 101,
  CustomerId: 1,
  ContractNumber: 'KUNN-2026-001',
  ContractType: 1,
  LoanAmount: 120_000_000,
  CurrentBalance: 120_000_000,
  DisbursementDate: '2026-01-01',
  ContractStartDate: '2026-01-01',
  ContractEndDate: '2027-01-01',
  InterestRate: 0.12, // 12% / năm
  IsSettled: false,
  ...over,
});

const makeSchedule = (
  period: number,
  dueDate: string,
  principal: number,
  interest: number,
  isPaid = false
): RepaymentSchedule => ({
  Id: period * 10,
  ContractId: 101,
  PeriodNumber: period,
  DueDate: dueDate,
  PrincipalAmount: principal,
  InterestAmount: interest,
  TotalAmount: principal + interest,
  IsPaid: isPaid,
  ActualPaidPrincipal: isPaid ? principal : 0,
  ActualPaidInterest: isPaid ? interest : 0,
});

describe('calculateEarlySettlementQuote', () => {
  it('tất toán giữa chừng (kỳ 3 trên 12 kỳ)', () => {
    const contract = makeContract();
    const schedules: RepaymentSchedule[] = [
      makeSchedule(1, '2026-02-01', 10_000_000, 1_200_000, true),
      makeSchedule(2, '2026-03-01', 10_000_000, 1_100_000, true),
      makeSchedule(3, '2026-04-01', 10_000_000, 1_000_000, false),
      makeSchedule(4, '2026-05-01', 10_000_000, 900_000, false),
      makeSchedule(5, '2026-06-01', 10_000_000, 800_000, false),
    ];

    // Khách hàng đã trả 2 kỳ (đã trả 20tr gốc), còn lại 100tr gốc
    // Tất toán vào ngày 2026-03-16 (15 ngày kể từ kỳ 2 là 2026-03-01)
    const quote = calculateEarlySettlementQuote({
      contract,
      schedules,
      settlementDate: '2026-03-16',
      penaltyRatePercent: 1.0, // Phí phạt 1%
    });

    expect(quote.canSettle).toBe(true);
    expect(quote.settlingPeriodNumber).toBe(3);
    expect(quote.basisStartDate).toBe('2026-03-01');
    expect(quote.accruedDays).toBe(15);
    expect(quote.remainingPrincipal).toBe(100_000_000);

    // Lãi 15 ngày trên 100tr với lãi suất 12%/năm: 100,000,000 * 0.12 * 15 / 365 = 493,151
    const expectedInterest = Math.round((100_000_000 * 0.12 * 15) / 365);
    expect(quote.accruedInterest).toBe(expectedInterest);

    // Phí phạt 1% trên 100tr = 1,000,000
    expect(quote.penaltyFee).toBe(1_000_000);

    // Tổng nghĩa vụ
    expect(quote.totalSettlementAmount).toBe(100_000_000 + expectedInterest + 1_000_000);

    // Danh sách kỳ tương lai cần xóa: kỳ 4 và 5
    expect(quote.futureScheduleIds).toEqual([40, 50]);

    // Kỳ tất toán đã chốt
    expect(quote.settledRow).toBeDefined();
    expect(quote.settledRow?.PeriodNumber).toBe(3);
    expect(quote.settledRow?.DueDate).toBe('2026-03-16');
    expect(quote.settledRow?.PaymentDate).toBe('2026-03-16');
    expect(quote.settledRow?.PrincipalAmount).toBe(100_000_000);
    expect(quote.settledRow?.ActualPaidPrincipal).toBe(100_000_000);
    expect(quote.settledRow?.InterestAmount).toBe(expectedInterest);
    expect(quote.settledRow?.ActualPaidInterest).toBe(expectedInterest);
    expect(quote.settledRow?.IsPaid).toBe(true);
    expect(quote.settledRow?.Note).toContain('Tất toán trước hạn');
    expect(quote.settledRow?.Note).toContain('1%');
  });

  it('tất toán ngay kỳ đầu tiên (sau giải ngân 20 ngày)', () => {
    const contract = makeContract({ DisbursementDate: '2026-05-10' });
    const schedules: RepaymentSchedule[] = [
      makeSchedule(1, '2026-06-10', 10_000_000, 1_200_000, false),
      makeSchedule(2, '2026-07-10', 10_000_000, 1_100_000, false),
      makeSchedule(3, '2026-08-10', 10_000_000, 1_000_000, false),
    ];

    const quote = calculateEarlySettlementQuote({
      contract,
      schedules,
      settlementDate: '2026-05-30',
      penaltyRatePercent: 0, // Không phạt
    });

    expect(quote.canSettle).toBe(true);
    expect(quote.settlingPeriodNumber).toBe(1);
    expect(quote.basisStartDate).toBe('2026-05-10');
    expect(quote.accruedDays).toBe(20);
    expect(quote.remainingPrincipal).toBe(120_000_000);
    expect(quote.penaltyFee).toBe(0);
    expect(quote.futureScheduleIds).toEqual([20, 30]);
  });

  it('từ chối nếu hợp đồng đã có cờ IsSettled = true', () => {
    const contract = makeContract({ IsSettled: true });
    const schedules: RepaymentSchedule[] = [
      makeSchedule(1, '2026-02-01', 10_000_000, 1_200_000, true),
    ];

    const quote = calculateEarlySettlementQuote({
      contract,
      schedules,
      settlementDate: '2026-03-01',
    });

    expect(quote.canSettle).toBe(false);
    expect(quote.blockReason).toContain('đã ở trạng thái tất toán');
  });

  it('từ chối nếu ngày tất toán trước ngày bắt đầu tính lãi kỳ', () => {
    const contract = makeContract();
    const schedules: RepaymentSchedule[] = [
      makeSchedule(1, '2026-02-01', 10_000_000, 1_200_000, true),
      makeSchedule(2, '2026-03-01', 10_000_000, 1_100_000, false),
    ];

    // Kỳ 1 đáo hạn ngày 2026-02-01, nhưng nhập ngày tất toán 2026-01-15
    const quote = calculateEarlySettlementQuote({
      contract,
      schedules,
      settlementDate: '2026-01-15',
    });

    expect(quote.canSettle).toBe(false);
    expect(quote.blockReason).toContain('không được trước ngày bắt đầu tính lãi kỳ');
  });

  it('xử lý an toàn khi KUNN chưa có lịch trả nợ', () => {
    const contract = makeContract({
      LoanAmount: 50_000_000,
      DisbursementDate: '2026-01-01',
    });

    const quote = calculateEarlySettlementQuote({
      contract,
      schedules: [],
      settlementDate: '2026-01-11',
      penaltyRatePercent: 0.5,
    });

    expect(quote.canSettle).toBe(true);
    expect(quote.settlingPeriodNumber).toBe(1);
    expect(quote.remainingPrincipal).toBe(50_000_000);
    expect(quote.accruedDays).toBe(10);
    expect(quote.penaltyFee).toBe(250_000);
    expect(quote.futureScheduleIds).toEqual([]);
    expect(quote.settledRow?.PrincipalAmount).toBe(50_000_000);
  });
});
