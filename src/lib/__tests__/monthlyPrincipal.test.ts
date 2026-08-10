import { describe, it, expect } from 'vitest';
import {
  monthlyPrincipalQuotient,
  resolveMonthlyPrincipal,
  generateSchedule,
  recalculateSchedules,
} from '../loanMath';
import { checkMonthlyPrincipal } from '../kunnForm';
import type { LoanContract, RepaymentSchedule } from '../../types';

const hd = (o: Partial<LoanContract>): LoanContract => ({
  Id: 1, CustomerId: 1, ContractNumber: 'HD01/GNN-01', ContractType: 0,
  PrincipalRepaymentMethod: 'Trả đều hàng tháng',
  DisbursementDate: '2026-01-15',
  InterestRate: 0.1,
  ...o,
} as LoanContract);

const ky = (o: Partial<RepaymentSchedule>): RepaymentSchedule => ({
  Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-02-15',
  PrincipalAmount: 0, InterestAmount: 0, IsPaid: false,
  ...o,
} as RepaymentSchedule);

describe('monthlyPrincipalQuotient', () => {
  it('chia số tiền vay cho số kỳ TRẢ GỐC, không phải tổng số kỳ', () => {
    const c = hd({ LoanAmount: 500_000_000, PrincipalGracePeriodMonths: 0 });
    expect(monthlyPrincipalQuotient(c, 120)).toBeCloseTo(4_166_666.67, 1);
  });

  it('trừ số tháng ân hạn khỏi số kỳ trả gốc', () => {
    const c = hd({ LoanAmount: 960_000_000, PrincipalGracePeriodMonths: 18 });
    expect(monthlyPrincipalQuotient(c, 120)).toBeCloseTo(960_000_000 / 102, 1);
  });

  it('mượn ContractAmount khi LoanAmount trống', () => {
    const c = hd({ LoanAmount: null, ContractAmount: 240_000_000 });
    expect(monthlyPrincipalQuotient(c, 60)).toBe(4_000_000);
  });

  it('không chia cho 0 khi ân hạn bằng hoặc dài hơn kỳ hạn', () => {
    const c = hd({ LoanAmount: 100_000_000, PrincipalGracePeriodMonths: 12 });
    expect(monthlyPrincipalQuotient(c, 12)).toBe(100_000_000);
  });
});

describe('resolveMonthlyPrincipal', () => {
  it('số khai tay thắng thương số đã làm tròn', () => {
    const c = hd({ LoanAmount: 500_000_000, MonthlyPrincipalAmount: 4_160_000 });
    expect(resolveMonthlyPrincipal(c, 120)).toBe(4_160_000);
  });

  it('NULL là tự tính, không phải 0', () => {
    const c = hd({ LoanAmount: 500_000_000, MonthlyPrincipalAmount: null });
    expect(resolveMonthlyPrincipal(c, 120)).toBe(4_170_000);
  });

  it('undefined cũng là tự tính — cột chưa có giá trị', () => {
    const c = hd({ LoanAmount: 500_000_000 });
    expect(resolveMonthlyPrincipal(c, 120)).toBe(4_170_000);
  });

  it('0 là tự tính, KHÔNG phải "gốc mỗi kỳ bằng 0"', () => {
    const c = hd({ LoanAmount: 500_000_000, MonthlyPrincipalAmount: 0 });
    expect(resolveMonthlyPrincipal(c, 120)).toBe(4_170_000);
  });

  it('mặc định làm tròn LÊN bước 10.000 — khớp tờ GNN PNAT.CN.03111223', () => {
    const c = hd({ LoanAmount: 550_000_000 });
    expect(resolveMonthlyPrincipal(c, 120)).toBe(4_590_000);
  });
});

describe('generateSchedule — gốc mỗi kỳ khai tay', () => {
  it('dùng đúng số khai tay ở các kỳ giữa', () => {
    const s = generateSchedule(
      1, 500_000_000, 10, '2026-02-15', 120, false, '2026-01-15', 4_160_000
    );
    expect(s.slice(0, 119).every(k => k.PrincipalAmount === 4_160_000)).toBe(true);
  });

  it('TỔNG GỐC VẪN BẰNG SỐ TIỀN VAY khi khai tay thấp hơn thương số', () => {
    const s = generateSchedule(
      1, 500_000_000, 10, '2026-02-15', 120, false, '2026-01-15', 4_160_000
    );
    const tong = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tong).toBe(500_000_000);
  });

  it('TỔNG GỐC VẪN BẰNG SỐ TIỀN VAY khi khai tay cao hơn thương số', () => {
    const s = generateSchedule(
      1, 500_000_000, 10, '2026-02-15', 120, false, '2026-01-15', 4_200_000
    );
    const tong = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tong).toBe(500_000_000);
  });

  it('gốc trả cuối kỳ bỏ qua số khai tay', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 6, true, '2026-01-15', 9_999_000
    );
    expect(s.slice(0, 5).every(k => k.PrincipalAmount === 0)).toBe(true);
    expect(s[5].PrincipalAmount).toBe(100_000_000);
  });

  it('không kỳ nào có gốc âm khi khai tay cao hơn thương số', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15', 20_000_000
    );
    expect(s.every(k => (k.PrincipalAmount || 0) >= 0)).toBe(true);
  });
});

describe('recalculateSchedules — gốc mỗi kỳ khai tay', () => {
  const lich = (n: number): RepaymentSchedule[] =>
    Array.from({ length: n }, (_, i) =>
      ky({ Id: i + 1, PeriodNumber: i + 1, DueDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-15` })
    );

  it('đường sửa KUNN cũng tôn trọng số khai tay', () => {
    const c = hd({ LoanAmount: 120_000_000, MonthlyPrincipalAmount: 9_000_000 });
    const r = recalculateSchedules(lich(12), c);
    expect(r[0].PrincipalAmount).toBe(9_000_000);
  });

  it('TỔNG GỐC VẪN BẰNG SỐ TIỀN VAY ở đường sửa', () => {
    const c = hd({ LoanAmount: 120_000_000, MonthlyPrincipalAmount: 9_000_000 });
    const r = recalculateSchedules(lich(12), c);
    const tong = r.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tong).toBe(120_000_000);
  });

  it('hai đường cho ra cùng gốc mỗi kỳ', () => {
    const c = hd({ LoanAmount: 120_000_000, MonthlyPrincipalAmount: 9_000_000 });
    const tao = generateSchedule(
      1, 120_000_000, 10, '2026-01-15', 12, false, '2025-12-15', 9_000_000
    );
    const sua = recalculateSchedules(lich(12), c);
    expect(sua[0].PrincipalAmount).toBe(tao[0].PrincipalAmount);
  });
});

describe('checkMonthlyPrincipal', () => {
  const base = {
    loanAmount: 500_000_000,
    totalPeriods: 120,
    graceMonths: 0,
    isBullet: false,
  };

  it('để trống là hợp lệ — hệ thống tự tính', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: null }).ok).toBe(true);
    expect(checkMonthlyPrincipal({ ...base, declared: 0 }).ok).toBe(true);
  });

  it('gợi ý đúng số hệ thống sẽ tính', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: null }).suggested).toBe(4_170_000);
  });

  it('nhận số làm tròn LÊN theo bước 10.000', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: 4_170_000 }).ok).toBe(true);
  });

  it('nhận số làm tròn XUỐNG — hướng làm tròn chưa đo được nên không chặn', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: 4_160_000 }).ok).toBe(true);
  });

  it('nhận số làm tròn theo bước 50.000', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: 4_200_000 }).ok).toBe(true);
  });

  it('CHẶN lỗi gõ thừa một số 0', () => {
    const r = checkMonthlyPrincipal({ ...base, declared: 41_700_000 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('4.170.000');
  });

  it('CHẶN lỗi gõ thiếu một số 0', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: 417_000 }).ok).toBe(false);
  });

  it('CHẶN số âm', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: -1_000_000 }).ok).toBe(false);
  });

  it('thông báo nêu đủ ba con số phải nhất quán', () => {
    const r = checkMonthlyPrincipal({ ...base, declared: 9_000_000 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('500.000.000');
    expect(r.message).toContain('120');
  });

  it('gốc trả cuối kỳ thì ô này không có nghĩa, luôn hợp lệ', () => {
    expect(checkMonthlyPrincipal({ ...base, declared: 9_999_999, isBullet: true }).ok).toBe(true);
  });

  it('chưa khai số tiền vay thì không chặn — chưa có gì để đối chiếu', () => {
    expect(checkMonthlyPrincipal({ ...base, loanAmount: 0, declared: 4_170_000 }).ok).toBe(true);
  });

  it('chưa khai kỳ hạn thì không chặn', () => {
    expect(checkMonthlyPrincipal({ ...base, totalPeriods: 0, declared: 4_170_000 }).ok).toBe(true);
  });

  it('tính theo số kỳ TRẢ GỐC khi có ân hạn', () => {
    const r = checkMonthlyPrincipal({
      loanAmount: 960_000_000, totalPeriods: 120, graceMonths: 18,
      isBullet: false, declared: 9_420_000,
    });
    expect(r.ok).toBe(true);
    expect(r.suggested).toBe(9_420_000);
  });

  it('CHẶN số chia theo TỔNG kỳ thay vì kỳ trả gốc — lỗi bỏ quên ân hạn', () => {
    const r = checkMonthlyPrincipal({
      loanAmount: 960_000_000, totalPeriods: 120, graceMonths: 18,
      isBullet: false, declared: 8_000_000,
    });
    expect(r.ok).toBe(false);
  });
});
