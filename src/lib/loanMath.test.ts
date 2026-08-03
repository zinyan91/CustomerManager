import { describe, it, expect } from 'vitest';
import {
  addMonthsToDate,
  parseKunnTenorMonths,
  parseDateParts,
  getDaysBetween,
  roundPrincipalCore,
  generateSchedule,
  calculateOverdueDaysFromDates,
  getAutoDebtGroupInfo,
  recalculateSchedules,
} from './loanMath';
import type { RepaymentSchedule } from '../types';

describe('addMonthsToDate', () => {
  it('cộng tháng bình thường, giữ nguyên ngày', () => {
    expect(addMonthsToDate('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsToDate('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('kẹp về ngày cuối tháng khi tháng đích ngắn hơn', () => {
    // 31/01 + 1 tháng: tháng 2/2026 chỉ có 28 ngày
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('xử lý năm nhuận', () => {
    expect(addMonthsToDate('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('trả chuỗi rỗng khi đầu vào không hợp lệ', () => {
    expect(addMonthsToDate(null, 3)).toBe('');
    expect(addMonthsToDate('2026-01-15', 0)).toBe('');
    expect(addMonthsToDate('không-phải-ngày', 3)).toBe('');
  });
});

describe('parseKunnTenorMonths', () => {
  it('bóc số tháng từ chuỗi kỳ hạn', () => {
    expect(parseKunnTenorMonths('12 tháng')).toBe(12);
    expect(parseKunnTenorMonths('6')).toBe(6);
  });

  it('trả 0 khi không có số', () => {
    expect(parseKunnTenorMonths('')).toBe(0);
    expect(parseKunnTenorMonths(null)).toBe(0);
    expect(parseKunnTenorMonths('không xác định')).toBe(0);
  });
});

describe('parseDateParts', () => {
  it('tách đúng, tháng là 0-indexed', () => {
    expect(parseDateParts('2026-08-03')).toEqual({ y: 2026, m: 7, d: 3 });
  });

  it('trả null khi sai định dạng', () => {
    expect(parseDateParts('03/08/2026')).toBeNull();
    expect(parseDateParts(null)).toBeNull();
  });
});

describe('getDaysBetween', () => {
  it('đếm đúng số ngày thực tế', () => {
    expect(getDaysBetween('2026-01-15', '2026-02-15')).toBe(31);
    expect(getDaysBetween('2026-02-15', '2026-03-15')).toBe(28);
  });

  it('không bị lệch do đổi giờ mùa (dùng UTC)', () => {
    expect(getDaysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('tối thiểu 1 ngày, kể cả khi hai mốc trùng nhau', () => {
    expect(getDaysBetween('2026-01-15', '2026-01-15')).toBe(1);
  });

  it('trả 30 khi chuỗi ngày không hợp lệ', () => {
    expect(getDaysBetween('sai', '2026-01-15')).toBe(30);
  });
});

describe('roundPrincipalCore', () => {
  it('làm tròn LÊN theo bước 1.000 (chuẩn Core Banking)', () => {
    expect(roundPrincipalCore(10_500, '1k')).toBe(11_000);
    expect(roundPrincipalCore(10_001, '1k')).toBe(11_000);
    expect(roundPrincipalCore(10_000, '1k')).toBe(10_000);
  });

  it('hỗ trợ bước 10k và 50k', () => {
    expect(roundPrincipalCore(10_500, '10k')).toBe(20_000);
    expect(roundPrincipalCore(10_500, '50k')).toBe(50_000);
  });

  it('chế độ exact chỉ làm tròn số học', () => {
    expect(roundPrincipalCore(10_500.4, 'exact')).toBe(10_500);
  });

  it('trả 0 với đầu vào không dương', () => {
    expect(roundPrincipalCore(0, '1k')).toBe(0);
  });
});

describe('generateSchedule — bất biến quan trọng nhất', () => {
  it('TỔNG GỐC CÁC KỲ PHẢI BẰNG ĐÚNG SỐ TIỀN VAY (trả đều)', () => {
    // Số tiền chia không hết: 100tr / 12 kỳ = 8.333.333,33
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15');
    const tongGoc = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(100_000_000);
  });

  it('TỔNG GỐC PHẢI BẰNG SỐ TIỀN VAY (gốc cuối kỳ)', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 12, true, '2026-01-15');
    const tongGoc = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(100_000_000);
  });

  it('TỔNG GỐC PHẢI BẰNG SỐ TIỀN VAY (có ân hạn gốc)', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15', undefined, 3);
    const tongGoc = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(100_000_000);
  });

  it('TỔNG GỐC PHẢI BẰNG SỐ TIỀN VAY (có trả trước hạn)', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15',
      undefined, 0, 20_000_000, 4, 'reduce_monthly'
    );
    const tongGoc = s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(100_000_000);
  });
});

describe('generateSchedule — phân bổ gốc', () => {
  it('gốc cuối kỳ: các kỳ giữa bằng 0, kỳ cuối trả toàn bộ', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 6, true, '2026-01-15');
    expect(s).toHaveLength(6);
    expect(s.slice(0, 5).every(k => k.PrincipalAmount === 0)).toBe(true);
    expect(s[5].PrincipalAmount).toBe(100_000_000);
  });

  it('trả đều: gốc hằng số ở các kỳ giữa, kỳ cuối gánh phần dư', () => {
    const s = generateSchedule(1, 120_000_000, 10, '2026-02-15', 12, false, '2026-01-15');
    expect(s).toHaveLength(12);
    // 120tr / 12 = 10tr chẵn
    expect(s.slice(0, 11).every(k => k.PrincipalAmount === 10_000_000)).toBe(true);
    expect(s[11].PrincipalAmount).toBe(10_000_000);
  });

  it('ân hạn gốc: đúng N kỳ đầu không trả gốc', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15', undefined, 3);
    expect(s.slice(0, 3).every(k => k.PrincipalAmount === 0)).toBe(true);
    expect((s[3].PrincipalAmount || 0)).toBeGreaterThan(0);
  });

  it('dư nợ không bao giờ âm', () => {
    const s = generateSchedule(1, 5_000_000, 10, '2026-02-15', 24, false, '2026-01-15');
    expect(s.every(k => (k.PrincipalAmount || 0) >= 0)).toBe(true);
  });
});

describe('generateSchedule — tính lãi', () => {
  it('lãi = dư nợ × lãi suất năm × số ngày thực tế / 365', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 1, true, '2026-01-15');
    // 15/01 -> 15/02 là 31 ngày
    const kyVong = Math.round(100_000_000 * 0.1 * (31 / 365));
    expect(s[0].InterestAmount).toBe(kyVong);
  });

  it('nhận lãi suất cả dạng phần trăm (10) lẫn thập phân (0.1)', () => {
    const a = generateSchedule(1, 100_000_000, 10, '2026-02-15', 1, true, '2026-01-15');
    const b = generateSchedule(1, 100_000_000, 0.1, '2026-02-15', 1, true, '2026-01-15');
    expect(a[0].InterestAmount).toBe(b[0].InterestAmount);
  });

  it('lãi TÍNH TRÊN MỖI NGÀY giảm dần theo dư nợ', () => {
    const s = generateSchedule(1, 120_000_000, 10, '2026-02-15', 12, false, '2026-01-15');
    const laiMoiNgay = s.map((k, i) => {
      const truoc = i === 0 ? '2026-01-15' : s[i - 1].DueDate!;
      return k.InterestAmount! / getDaysBetween(truoc, k.DueDate!);
    });
    for (let i = 1; i < laiMoiNgay.length; i++) {
      expect(laiMoiNgay[i]).toBeLessThan(laiMoiNgay[i - 1]);
    }
  });

  it('lãi CÓ THỂ TĂNG so với kỳ trước khi kỳ đó dài hơn — đúng chuẩn số ngày thực tế/365', () => {
    // Ghi lại có chủ đích: đây KHÔNG phải lỗi.
    // Kỳ 15/02→15/03 chỉ 28 ngày, kỳ 15/03→15/04 có 31 ngày.
    // Dư nợ giảm 10tr không bù nổi 3 ngày cộng thêm, nên lãi kỳ sau cao hơn.
    const s = generateSchedule(1, 120_000_000, 10, '2026-02-15', 12, false, '2026-01-15');
    expect(getDaysBetween(s[1].DueDate!, s[2].DueDate!)).toBe(31);
    expect(getDaysBetween(s[0].DueDate!, s[1].DueDate!)).toBe(28);
    expect(s[2].InterestAmount!).toBeGreaterThan(s[1].InterestAmount!);
  });

  it('áp đúng lãi suất theo lịch sử điều chỉnh', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 3, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly',
      [
        { id: '1', effectiveDate: '2026-01-01', ratePercent: 10 },
        { id: '2', effectiveDate: '2026-03-01', ratePercent: 20 },
      ]
    );
    // Kỳ 1 (đến 15/02) dùng 10%; kỳ 3 (đến 15/04) đã sang mốc 20%
    const laiKy1TheoRate10 = Math.round(100_000_000 * 0.1 * (31 / 365));
    expect(s[0].InterestAmount).toBe(laiKy1TheoRate10);
    // Kỳ 3: 15/03 -> 15/04 = 31 ngày, rate 20%
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.2 * (31 / 365)));
  });

  it('áp lãi suất ưu đãi trong N kỳ đầu rồi chuyển sang lãi sau ưu đãi', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 4, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly', undefined,
      { prefRate: 6, prefMonths: 2, postPrefRate: 12 }
    );
    // Kỳ 1: 31 ngày @6%
    expect(s[0].InterestAmount).toBe(Math.round(100_000_000 * 0.06 * (31 / 365)));
    // Kỳ 3: 15/03 -> 15/04 = 31 ngày @12%
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.12 * (31 / 365)));
  });
});

describe('generateSchedule — ngày đến hạn', () => {
  it('kỳ 1 đúng ngày bắt đầu trả nợ, các kỳ sau cách nhau 1 tháng', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 3, true, '2026-01-15');
    expect(s.map(k => k.DueDate)).toEqual(['2026-02-15', '2026-03-15', '2026-04-15']);
  });

  it('kẹp ngày đến hạn về cuối tháng khi tháng ngắn', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-01-31', 3, true, '2026-01-01');
    expect(s.map(k => k.DueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});

describe('generateSchedule — trả trước hạn', () => {
  it('kỳ trả trước hạn có gốc lớn hơn và được ghi chú', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15',
      undefined, 0, 20_000_000, 4, 'reduce_monthly'
    );
    expect(s[3].PrincipalAmount!).toBeGreaterThan(s[2].PrincipalAmount!);
    expect(s[3].Note).toContain('TRẢ TRƯỚC HẠN');
  });

  it('trả trước hạn làm giảm gốc phải trả các kỳ sau', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15',
      undefined, 0, 20_000_000, 4, 'reduce_monthly'
    );
    expect(s[4].PrincipalAmount!).toBeLessThan(s[2].PrincipalAmount!);
  });
});

describe('generateSchedule — TotalAmount', () => {
  it('luôn bằng gốc cộng lãi ở mọi kỳ', () => {
    const s = generateSchedule(1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15');
    for (const k of s) {
      expect(k.TotalAmount).toBe((k.PrincipalAmount || 0) + (k.InterestAmount || 0));
    }
  });
});

describe('calculateOverdueDaysFromDates', () => {
  it('trả đúng hạn hoặc sớm thì 0 ngày', () => {
    expect(calculateOverdueDaysFromDates('2026-03-15', '2026-03-15')).toBe(0);
    expect(calculateOverdueDaysFromDates('2026-03-10', '2026-03-15')).toBe(0);
  });

  it('đếm đúng số ngày trả chậm', () => {
    expect(calculateOverdueDaysFromDates('2026-03-20', '2026-03-15')).toBe(5);
    expect(calculateOverdueDaysFromDates('2026-04-15', '2026-03-15')).toBe(31);
  });

  it('thiếu ngày thì trả 0', () => {
    expect(calculateOverdueDaysFromDates(null, '2026-03-15')).toBe(0);
    expect(calculateOverdueDaysFromDates('2026-03-20', null)).toBe(0);
  });
});

describe('getAutoDebtGroupInfo — phân nhóm nợ theo quy định', () => {
  const ky = (dueDate: string, isPaid = false): RepaymentSchedule =>
    ({ Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: dueDate, PrincipalAmount: 0,
       InterestAmount: 0, TotalAmount: 0, IsPaid: isPaid } as RepaymentSchedule);

  it('Nhóm 1 khi chưa có kỳ nào quá hạn', () => {
    expect(getAutoDebtGroupInfo([ky('2026-12-31')], '2026-08-03').debtGroup).toBe(1);
  });

  it('Nhóm 1 khi quá hạn dưới 10 ngày', () => {
    const r = getAutoDebtGroupInfo([ky('2026-07-28')], '2026-08-03');
    expect(r.maxOverdueDays).toBe(6);
    expect(r.debtGroup).toBe(1);
  });

  it('Nhóm 2 — quá hạn 10 đến 90 ngày', () => {
    expect(getAutoDebtGroupInfo([ky('2026-07-24')], '2026-08-03').debtGroup).toBe(2);
    expect(getAutoDebtGroupInfo([ky('2026-05-05')], '2026-08-03').debtGroup).toBe(2);
  });

  it('Nhóm 3 — quá hạn 91 đến 180 ngày', () => {
    expect(getAutoDebtGroupInfo([ky('2026-05-04')], '2026-08-03').debtGroup).toBe(3);
    expect(getAutoDebtGroupInfo([ky('2026-02-05')], '2026-08-03').debtGroup).toBe(3);
  });

  it('Nhóm 4 — quá hạn 181 đến 360 ngày', () => {
    expect(getAutoDebtGroupInfo([ky('2026-02-03')], '2026-08-03').debtGroup).toBe(4);
    expect(getAutoDebtGroupInfo([ky('2025-08-09')], '2026-08-03').debtGroup).toBe(4);
  });

  it('Nhóm 5 — quá hạn trên 360 ngày', () => {
    expect(getAutoDebtGroupInfo([ky('2025-08-07')], '2026-08-03').debtGroup).toBe(5);
  });

  it('BỎ QUA các kỳ đã thanh toán', () => {
    // Kỳ quá hạn rất lâu nhưng đã trả -> không ảnh hưởng nhóm nợ
    const r = getAutoDebtGroupInfo([ky('2024-01-01', true), ky('2026-12-31')], '2026-08-03');
    expect(r.debtGroup).toBe(1);
    expect(r.maxOverdueDays).toBe(0);
  });

  it('lấy kỳ quá hạn LÂU NHẤT trong các kỳ chưa trả', () => {
    const r = getAutoDebtGroupInfo(
      [ky('2026-07-20'), ky('2026-01-15'), ky('2026-07-01')], '2026-08-03'
    );
    expect(r.worstDueDate).toBe('2026-01-15');
    expect(r.maxOverdueDays).toBe(200);   // 15/01 -> 03/08
    expect(r.debtGroup).toBe(4);          // 181–360 ngày
  });

  it('không có lịch trả nợ thì mặc định Nhóm 1', () => {
    expect(getAutoDebtGroupInfo([], '2026-08-03').debtGroup).toBe(1);
    expect(getAutoDebtGroupInfo(undefined, '2026-08-03').debtGroup).toBe(1);
  });
});

describe('recalculateSchedules', () => {
  const hopDong = {
    Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 0,
    LoanAmount: 120_000_000, InterestRate: 0.1,
    PrincipalRepaymentMethod: 'Trả đều hàng tháng',
    DisbursementDate: '2026-01-15',
  } as any;

  const lich = (n: number) => Array.from({ length: n }, (_, i) => ({
    Id: i + 1, ContractId: 1, PeriodNumber: i + 1,
    DueDate: `2026-${String(i + 2).padStart(2, '0')}-15`,
    PrincipalAmount: 0, InterestAmount: 0, TotalAmount: 0, IsPaid: false,
  } as RepaymentSchedule));

  it('TỔNG GỐC vẫn bằng đúng số tiền vay sau khi tính lại', () => {
    const r = recalculateSchedules(lich(11), hopDong);
    const tongGoc = r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(120_000_000);
  });

  it('TotalAmount luôn bằng gốc cộng lãi cộng phạt', () => {
    const r = recalculateSchedules(lich(11), hopDong);
    for (const k of r) {
      expect(k.TotalAmount).toBe((k.PrincipalAmount || 0) + (k.InterestAmount || 0));
    }
  });

  it('giữ nguyên số thực thu của kỳ đã thanh toán', () => {
    const l = lich(11);
    l[0] = { ...l[0], IsPaid: true, ActualPaidPrincipal: 20_000_000, ActualPaidInterest: 999_000 };
    const r = recalculateSchedules(l, hopDong);
    expect(r[0].PrincipalAmount).toBe(20_000_000);
    expect(r[0].TotalAmount).toBe(20_000_000 + 999_000);
  });

  it('trả trước hạn làm GIẢM gốc phải trả các kỳ sau', () => {
    const l = lich(11);
    l[2] = { ...l[2], PrepaidPrincipalAmount: 30_000_000 };
    const r = recalculateSchedules(l, hopDong);
    expect(r[2].PrincipalAmount!).toBeGreaterThan(r[1].PrincipalAmount!);
    expect(r[3].PrincipalAmount!).toBeLessThan(r[1].PrincipalAmount!);
  });

  it('trả trước hạn KHÔNG làm sai tổng gốc', () => {
    const l = lich(11);
    l[2] = { ...l[2], PrepaidPrincipalAmount: 30_000_000 };
    const r = recalculateSchedules(l, hopDong);
    const tongGoc = r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0);
    expect(tongGoc).toBe(120_000_000);
  });

  it('cộng lãi phạt quá hạn vào tổng phải trả của kỳ', () => {
    const l = lich(11);
    l[1] = { ...l[1], OverdueInterestAmount: 500_000 };
    const r = recalculateSchedules(l, hopDong);
    expect(r[1].TotalAmount).toBe((r[1].PrincipalAmount || 0) + (r[1].InterestAmount || 0) + 500_000);
  });

  it('gốc trả cuối kỳ: chỉ kỳ cuối trả gốc', () => {
    const bullet = { ...hopDong, PrincipalRepaymentMethod: 'Gốc trả cuối kỳ' };
    const r = recalculateSchedules(lich(6), bullet);
    expect(r.slice(0, 5).every(k => k.PrincipalAmount === 0)).toBe(true);
    expect(r[5].PrincipalAmount).toBe(120_000_000);
  });

  it('lịch rỗng trả về mảng rỗng', () => {
    expect(recalculateSchedules([], hopDong)).toEqual([]);
  });
});
