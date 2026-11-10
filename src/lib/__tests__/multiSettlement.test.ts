import { describe, it, expect } from 'vitest';
import { buildSettlementLine, settlementTotals } from '../multiSettlement';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';

const ccs = [
  { Id: 1, LoanMethod: 'Hạn mức tín dụng' },
  { Id: 2, LoanMethod: 'Cho vay từng lần' },
] as CreditContract[];

const kunn = (o: Partial<LoanContract>): LoanContract => ({
  Id: 10, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 1,
  LoanAmount: 1_000_000_000, CurrentBalance: 1_000_000_000, InterestRate: 12,
  DisbursementDate: '2025-01-10', ...o,
} as LoanContract);

const schedule = (contractId: number): RepaymentSchedule[] => ([
  { Id: 100 + contractId, ContractId: contractId, PeriodNumber: 1, DueDate: '2026-12-10', PrincipalAmount: 1_000_000_000, InterestAmount: 0, TotalAmount: 1_000_000_000, IsPaid: false } as RepaymentSchedule,
]);

describe('buildSettlementLine', () => {
  it('KUNN thuộc hạn mức tín dụng: phí 0, tổng = gốc + lãi dồn tích', () => {
    const line = buildSettlementLine({ contract: kunn({ Id: 11, CreditContractId: 1 }), schedules: schedule(11), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    expect(line.loanMethod).toBe('Hạn mức tín dụng');
    expect(line.penaltyPercent).toBe(0);
    expect(line.quote!.penaltyFee).toBe(0);
    expect(line.quote!.totalSettlementAmount).toBe(line.quote!.remainingPrincipal + line.quote!.accruedInterest);
    expect(line.blockReason).toBeNull();
  });

  it('KUNN vay từng lần năm thứ 2: phí 3% trên gốc còn lại', () => {
    const line = buildSettlementLine({ contract: kunn({ Id: 12, CreditContractId: 2 }), schedules: schedule(12), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    expect(line.fee.loanYear).toBe(2);
    expect(line.penaltyPercent).toBe(3);
    expect(line.quote!.penaltyFee).toBe(30_000_000);
  });

  it('cán bộ sửa tỷ lệ thì dùng tỷ lệ đã sửa, kể cả sửa về 0', () => {
    const base = { contract: kunn({ Id: 12, CreditContractId: 2 }), schedules: schedule(12), settlementDate: '2026-11-10' };
    expect(buildSettlementLine({ ...base, penaltyOverridePercent: 1.5 }, ccs).quote!.penaltyFee).toBe(15_000_000);
    expect(buildSettlementLine({ ...base, penaltyOverridePercent: 0 }, ccs).quote!.penaltyFee).toBe(0);
  });

  it('mỗi khoản một ngày tất toán riêng: lãi dồn tích khác nhau theo ngày', () => {
    const at = (d: string) => buildSettlementLine({ contract: kunn({ Id: 11, CreditContractId: 1 }), schedules: schedule(11), settlementDate: d, penaltyOverridePercent: null }, ccs).quote!.accruedInterest;
    expect(at('2025-03-10')).toBeLessThan(at('2025-06-10'));
  });

  it('chưa tải được lịch trả nợ: chặn, không đoán số tiền', () => {
    const line = buildSettlementLine({ contract: kunn({ Id: 13 }), schedules: undefined, settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    expect(line.quote).toBeNull();
    expect(line.blockReason).toBe('Chưa tải được lịch trả nợ của khoản này, chưa tính được số tiền tất toán.');
  });

  it('khoản đã tất toán: chặn với lý do của báo giá', () => {
    const line = buildSettlementLine({ contract: kunn({ Id: 14, IsSettled: true }), schedules: schedule(14), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    expect(line.blockReason).toBe('Khoản vay này đã ở trạng thái tất toán.');
  });
});

describe('settlementTotals', () => {
  it('cộng đúng gốc, lãi, phí, tổng của các khoản tất toán được; bỏ qua khoản bị chặn', () => {
    const a = buildSettlementLine({ contract: kunn({ Id: 11, CreditContractId: 1 }), schedules: schedule(11), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    const b = buildSettlementLine({ contract: kunn({ Id: 12, CreditContractId: 2 }), schedules: schedule(12), settlementDate: '2026-10-01', penaltyOverridePercent: null }, ccs);
    const blocked = buildSettlementLine({ contract: kunn({ Id: 13 }), schedules: undefined, settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs);
    const t = settlementTotals([a, b, blocked]);
    expect(t.count).toBe(2);
    expect(t.principal).toBe(2_000_000_000);
    expect(t.fee).toBe(30_000_000);
    expect(t.interest).toBe(a.quote!.accruedInterest + b.quote!.accruedInterest);
    expect(t.total).toBe(t.principal + t.interest + t.fee);
  });
});
