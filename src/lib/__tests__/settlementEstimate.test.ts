import { describe, it, expect } from 'vitest';
import { estimateSettlementLine, estimateTotals, type EstimateLoanInput } from '../settlementEstimate';

const base: EstimateLoanInput = {
  loanMethod: 'Cho vay từng lần',
  principal: 1_000_000_000,
  rateAnnualPercent: 10,
  disbursementDate: '2025-06-01',
  interestFromDate: '2026-10-01',
  settlementDate: '2026-11-10',
  penaltyOverridePercent: null,
};

describe('estimateSettlementLine', () => {
  it('lãi dồn tích Actual/365 từ ngày trả lãi gần nhất tới ngày tất toán; phí theo năm vay', () => {
    const line = estimateSettlementLine(base);
    expect(line.accruedDays).toBe(40);
    expect(line.accruedInterest).toBe(Math.round(1_000_000_000 * 0.1 * 40 / 365));
    expect(line.fee.loanYear).toBe(2);
    expect(line.penaltyPercent).toBe(3);
    expect(line.penaltyFee).toBe(30_000_000);
    expect(line.total).toBe(1_000_000_000 + line.accruedInterest + 30_000_000);
    expect(line.error).toBeNull();
  });

  it('hạn mức tín dụng: phí 0', () => {
    const line = estimateSettlementLine({ ...base, loanMethod: 'Hạn mức tín dụng' });
    expect(line.penaltyFee).toBe(0);
    expect(line.total).toBe(1_000_000_000 + line.accruedInterest);
  });

  it('chưa có ngày trả lãi gần nhất thì tính lãi từ ngày giải ngân', () => {
    expect(estimateSettlementLine({ ...base, interestFromDate: '' }).accruedDays).toBe(527);
  });

  it('tỷ lệ sửa tay thắng tỷ lệ gợi ý, kể cả 0', () => {
    expect(estimateSettlementLine({ ...base, penaltyOverridePercent: 0 }).penaltyFee).toBe(0);
    expect(estimateSettlementLine({ ...base, penaltyOverridePercent: 1.5 }).penaltyFee).toBe(15_000_000);
  });

  it('dữ liệu thiếu hoặc sai thì báo lỗi, không tính ra số', () => {
    expect(estimateSettlementLine({ ...base, principal: 0 }).error).toBe('Nhập dư nợ gốc');
    expect(estimateSettlementLine({ ...base, settlementDate: '2026-09-01' }).error).toBe('Ngày tất toán trước mốc tính lãi');
    expect(estimateSettlementLine({ ...base, disbursementDate: '', interestFromDate: '' }).error).toBe('Nhập ngày giải ngân hoặc ngày trả lãi gần nhất');
    expect(estimateSettlementLine({ ...base, principal: 0 }).total).toBe(0);
  });
});

describe('estimateTotals', () => {
  it('hai khoản giải ngân khác ngày, tất toán khác ngày: cộng đúng, bỏ khoản lỗi', () => {
    const a = estimateSettlementLine(base);
    const b = estimateSettlementLine({ ...base, loanMethod: 'Hạn mức tín dụng', principal: 500_000_000, disbursementDate: '2026-03-01', interestFromDate: '2026-10-15', settlementDate: '2026-12-01' });
    const bad = estimateSettlementLine({ ...base, principal: 0 });
    const t = estimateTotals([a, b, bad]);
    expect(t.count).toBe(2);
    expect(t.principal).toBe(1_500_000_000);
    expect(t.fee).toBe(30_000_000);
    expect(t.total).toBe(a.total + b.total);
  });
});
