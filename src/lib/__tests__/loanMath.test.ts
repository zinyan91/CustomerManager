import { describe, it, expect } from 'vitest';
import {
  addMonthsToDate,
  parseKunnTenorMonths,
  parseDateParts,
  getDaysBetween,
  roundPrincipalCore,
  PRINCIPAL_ROUND_MODE,
  generateSchedule,
  calculateOverdueDaysFromDates,
  getAutoDebtGroupInfo,
  recalculateSchedules,
  computeOutstandingBalance,
  isBulletPrincipal,
  overdueDaysOfSchedule,
  computeSchedulePenalty,
  redateSchedules,
  schedulePaymentStatus,
  alignLastPeriodToMaturity,
  needsLastPeriodAlignment,
  buildDueDateSequence,
} from '../loanMath';
import type { RepaymentSchedule, LoanContract } from '../../types';

describe('addMonthsToDate', () => {
  it('cộng tháng bình thường, giữ nguyên ngày', () => {
    expect(addMonthsToDate('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsToDate('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('kẹp về ngày cuối tháng khi tháng đích ngắn hơn', () => {
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
  it('mặc định làm tròn LÊN theo bước 10.000, đúng như giấy nhận nợ', () => {
    expect(PRINCIPAL_ROUND_MODE).toBe('10k');
    expect(roundPrincipalCore(4_166_667)).toBe(4_170_000);
    expect(roundPrincipalCore(4_170_000)).toBe(4_170_000);
    expect(roundPrincipalCore(4_170_001)).toBe(4_180_000);
  });

  it('vẫn làm tròn được theo bước 1.000 khi khai rõ', () => {
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
    expect(roundPrincipalCore(0)).toBe(0);
    expect(roundPrincipalCore(0, '1k')).toBe(0);
  });
});

describe('khớp giấy nhận nợ thật — PNAT.CN.03111223/GNN-01', () => {
  const GOC = 500_000_000;
  const KY_HAN = 120;

  it('gốc mỗi kỳ 4.170.000đ, kỳ cuối 3.770.000đ như chứng từ', () => {
    const s = generateSchedule(1, GOC, 8, '2024-01-15', KY_HAN, false, '2023-12-19');
    expect(s[0].PrincipalAmount).toBe(4_170_000);
    expect(s[KY_HAN - 2].PrincipalAmount).toBe(4_170_000);
    expect(s[KY_HAN - 1].PrincipalAmount).toBe(3_770_000);
  });

  it('BẤT BIẾN: tổng gốc vẫn bằng đúng số tiền vay', () => {
    const s = generateSchedule(1, GOC, 8, '2024-01-15', KY_HAN, false, '2023-12-19');
    expect(s.reduce((sum, k) => sum + (k.PrincipalAmount || 0), 0)).toBe(GOC);
  });

  it('đủ 120 kỳ, kỳ đầu 15/01/2024, các kỳ sau ngày 15 hàng tháng', () => {
    const s = generateSchedule(1, GOC, 8, '2024-01-15', KY_HAN, false, '2023-12-19');
    expect(s.length).toBe(KY_HAN);
    expect(s[0].DueDate).toBe('2024-01-15');
    expect(s[1].DueDate).toBe('2024-02-15');
  });
});

describe('generateSchedule — bất biến quan trọng nhất', () => {
  it('TỔNG GỐC CÁC KỲ PHẢI BẰNG ĐÚNG SỐ TIỀN VAY (trả đều)', () => {
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
    const laiKy1TheoRate10 = Math.round(100_000_000 * 0.1 * (31 / 365));
    expect(s[0].InterestAmount).toBe(laiKy1TheoRate10);
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.2 * (31 / 365)));
  });

  it('áp lãi suất ưu đãi trong N kỳ đầu rồi chuyển sang lãi sau ưu đãi', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 4, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly', undefined,
      { prefRate: 6, prefMonths: 2, postPrefRate: 12 }
    );
    expect(s[0].InterestAmount).toBe(Math.round(100_000_000 * 0.06 * (31 / 365)));
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.12 * (31 / 365)));
  });

  it('KHÔNG bỏ kỳ ưu đãi khi hợp đồng có thêm mốc điều chỉnh', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 5, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly',
      [{ id: '1', effectiveDate: '2026-05-15', ratePercent: 20 }],
      { prefRate: 6, prefMonths: 2, postPrefRate: 12 }
    );

    expect(s[0].InterestAmount).toBe(Math.round(100_000_000 * 0.06 * (31 / 365)));
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.12 * (31 / 365)));
    expect(s[4].InterestAmount).toBe(Math.round(100_000_000 * 0.20 * (31 / 365)));
  });

  it('mốc đổi lãi rơi giữa kỳ thì tách lãi theo số ngày', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 3, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly',
      [{ id: '1', effectiveDate: '2026-03-01', ratePercent: 20 }]
    );

    const kyGomHaiDoan = Math.round(
      100_000_000 * 0.10 * (14 / 365) + 100_000_000 * 0.20 * (14 / 365)
    );
    expect(s[1].InterestAmount).toBe(kyGomHaiDoan);
    expect(s[2].InterestAmount).toBe(Math.round(100_000_000 * 0.20 * (31 / 365)));
  });

  it('tách lãi giữa kỳ vẫn giữ đúng tổng số ngày của kỳ', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 2, true, '2026-01-15',
      undefined, 0, 0, 0, 'reduce_monthly',
      [{ id: '1', effectiveDate: '2026-03-01', ratePercent: 10 }]
    );

    expect(s[1].InterestAmount).toBe(Math.round(100_000_000 * 0.10 * (28 / 365)));
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
  it('kỳ trả trước hạn có gốc lớn hơn và ghi số tiền vào cột riêng', () => {
    const s = generateSchedule(
      1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15',
      undefined, 0, 20_000_000, 4, 'reduce_monthly'
    );
    expect(s[3].PrincipalAmount!).toBeGreaterThan(s[2].PrincipalAmount!);
    expect(s[3].PrepaidPrincipalAmount).toBeGreaterThan(0);
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
    const r = getAutoDebtGroupInfo([ky('2024-01-01', true), ky('2026-12-31')], '2026-08-03');
    expect(r.debtGroup).toBe(1);
    expect(r.maxOverdueDays).toBe(0);
  });

  it('lấy kỳ quá hạn LÂU NHẤT trong các kỳ chưa trả', () => {
    const r = getAutoDebtGroupInfo(
      [ky('2026-07-20'), ky('2026-01-15'), ky('2026-07-01')], '2026-08-03'
    );
    expect(r.worstDueDate).toBe('2026-01-15');
    expect(r.maxOverdueDays).toBe(200);
    expect(r.debtGroup).toBe(4);
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

  it('kỳ đã thanh toán: gốc phải trả giữ theo lịch, số thực thu ghi riêng', () => {
    const l = lich(11);
    l[0] = { ...l[0], IsPaid: true, ActualPaidPrincipal: 20_000_000, ActualPaidInterest: 999_000 };
    const r = recalculateSchedules(l, hopDong);

    expect(r[0].PrincipalAmount).toBe(10_910_000);
    expect(r[0].ActualPaidPrincipal).toBe(20_000_000);
    expect(r[0].TotalAmount).toBe(10_910_000 + 999_000);
  });

  it('khách trả vượt gốc của kỳ thì dư nợ giảm theo số thực thu', () => {
    const l = lich(11);
    l[0] = { ...l[0], IsPaid: true, ActualPaidPrincipal: 20_000_000 };
    const r = recalculateSchedules(l, hopDong);

    expect(computeOutstandingBalance(r, hopDong)).toBe(120_000_000 - 20_000_000);
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

  it('trả trước hạn TRONG lúc còn ân hạn gốc: gốc đều sau ân hạn tính theo số kỳ sau ân hạn, không dồn cục kỳ cuối', () => {
    const hd = { ...hopDong, LoanAmount: 960_000_000, PrincipalGracePeriodMonths: 18 };
    const l = lich(120);
    l[1] = { ...l[1], PrepaidPrincipalAmount: 8_000_000 };
    l[2] = { ...l[2], PrepaidPrincipalAmount: 8_000_000 };
    const r = recalculateSchedules(l, hd);

    const firstAfterGrace = r[18].PrincipalAmount!;
    const lastPeriod = r[r.length - 1].PrincipalAmount!;
    expect(firstAfterGrace).toBeGreaterThan(9_000_000);
    expect(lastPeriod).toBeLessThan(firstAfterGrace * 1.5);
    expect(r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0)).toBe(960_000_000);
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

describe('trả trước hạn trên kỳ ĐÃ thanh toán', () => {
  const hopDongHM = {
    Id: 1, CustomerId: 1, ContractNumber: 'HĐTD-01/GNN-01', ContractType: 0,
    LoanAmount: 3_800_000_000, InterestRate: 0.085,
    LoanMethod: 'Hạn mức tín dụng',
    PrincipalRepaymentMethod: 'Trả đều hàng tháng',
    DisbursementDate: '2025-08-25',
  } as any;

  const lich240 = () => Array.from({ length: 240 }, (_, i) => ({
    Id: i + 1, ContractId: 1, PeriodNumber: i + 1,
    DueDate: `${2026 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
    PrincipalAmount: 0, InterestAmount: 0, TotalAmount: 0,
    IsPaid: i < 10,
  } as RepaymentSchedule));

  it('GHI NHẬN tiền trả trước hạn kể cả khi kỳ đã tất toán', () => {
    const goc = 3_800_000_000, kyHan = 240;
    const gocDeuMoiKy = roundPrincipalCore(goc / kyHan);

    const l = lich240();
    l[9] = { ...l[9], PrepaidPrincipalAmount: 900_000_000 };
    const r = recalculateSchedules(l, hopDongHM);

    expect(r[9].PrincipalAmount).toBe(gocDeuMoiKy + 900_000_000);
  });

  it('dư nợ GIẢM đúng bằng số tiền trả trước hạn', () => {
    const khongTraTruoc = recalculateSchedules(lich240(), hopDongHM);

    const l = lich240();
    l[9] = { ...l[9], PrepaidPrincipalAmount: 900_000_000 };
    const coTraTruoc = recalculateSchedules(l, hopDongHM);

    const duNoTruoc = computeOutstandingBalance(khongTraTruoc, hopDongHM);
    const duNoSau = computeOutstandingBalance(coTraTruoc, hopDongHM);

    expect(duNoTruoc - duNoSau).toBe(900_000_000);
  });

  it('trả trước hạn làm GIẢM gốc phải trả các kỳ chưa đến hạn', () => {
    const khongTraTruoc = recalculateSchedules(lich240(), hopDongHM);
    const l = lich240();
    l[9] = { ...l[9], PrepaidPrincipalAmount: 900_000_000 };
    const coTraTruoc = recalculateSchedules(l, hopDongHM);

    expect(coTraTruoc[10].PrincipalAmount!).toBeLessThan(khongTraTruoc[10].PrincipalAmount!);
  });

  it('tổng gốc toàn bộ lịch vẫn bằng đúng số tiền vay', () => {
    const l = lich240();
    l[9] = { ...l[9], PrepaidPrincipalAmount: 900_000_000 };
    const r = recalculateSchedules(l, hopDongHM);
    expect(r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0)).toBe(3_800_000_000);
  });
});

describe('computeOutstandingBalance', () => {
  const hd = {
    Id: 1, CustomerId: 1, ContractNumber: 'A/GNN-01', ContractType: 0,
    LoanAmount: 100_000_000,
  } as any;

  const ky = (o: Partial<RepaymentSchedule>): RepaymentSchedule =>
    ({ Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-01-15',
       PrincipalAmount: 0, InterestAmount: 0, TotalAmount: 0, IsPaid: false, ...o } as RepaymentSchedule);

  it('trừ gốc của các kỳ đã thanh toán', () => {
    expect(computeOutstandingBalance(
      [ky({ IsPaid: true, PrincipalAmount: 30_000_000 }), ky({})], hd
    )).toBe(70_000_000);
  });

  it('trừ cả tiền trả trước hạn ghi trên kỳ CHƯA thanh toán', () => {
    expect(computeOutstandingBalance(
      [ky({ PrepaidPrincipalAmount: 20_000_000 })], hd
    )).toBe(80_000_000);
  });

  it('trừ cả phần thực thu trên kỳ chưa tất toán', () => {
    expect(computeOutstandingBalance(
      [ky({ ActualPaidPrincipal: 10_000_000, PrepaidPrincipalAmount: 5_000_000 })], hd
    )).toBe(85_000_000);
  });

  it('không âm khi đã trả vượt', () => {
    expect(computeOutstandingBalance(
      [ky({ IsPaid: true, PrincipalAmount: 150_000_000 })], hd
    )).toBe(0);
  });

  it('chưa có lịch thì lấy dư nợ trên hợp đồng', () => {
    expect(computeOutstandingBalance([], { ...hd, CurrentBalance: 77_000_000 })).toBe(77_000_000);
    expect(computeOutstandingBalance(undefined, hd)).toBe(100_000_000);
  });
});

describe('isBulletPrincipal — lựa chọn của banker quyết định', () => {
  it('mặc định là gốc cuối kỳ khi chưa chọn', () => {
    expect(isBulletPrincipal({} as any)).toBe(true);
  });

  it('chọn "Trả đều hàng tháng" thì KHÔNG phải bullet', () => {
    expect(isBulletPrincipal({ PrincipalRepaymentMethod: 'Trả đều hàng tháng' } as any)).toBe(false);
  });

  it('PHƯƠNG THỨC VAY không được đè lên lựa chọn trả gốc', () => {
    expect(isBulletPrincipal({
      LoanMethod: 'Hạn mức tín dụng',
      PrincipalRepaymentMethod: 'Trả đều hàng tháng',
    } as any)).toBe(false);
  });
});

describe('computeOutstandingBalance', () => {
  const hd = { Id: 1, CustomerId: 1, ContractNumber: 'X', ContractType: 0, LoanAmount: 100_000_000 } as any;
  const ky = (o: Partial<RepaymentSchedule>) => ({
    Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-01-15',
    PrincipalAmount: 0, InterestAmount: 0, TotalAmount: 0, IsPaid: false, ...o,
  } as RepaymentSchedule);

  it('chưa có lịch thì lấy dư nợ trên hợp đồng', () => {
    expect(computeOutstandingBalance(undefined, { ...hd, CurrentBalance: 80_000_000 })).toBe(80_000_000);
    expect(computeOutstandingBalance([], hd)).toBe(100_000_000);
  });

  it('trừ gốc của các kỳ đã thanh toán', () => {
    expect(computeOutstandingBalance(
      [ky({ IsPaid: true, PrincipalAmount: 30_000_000 })], hd
    )).toBe(70_000_000);
  });

  it('TRỪ CẢ tiền trả trước hạn ghi trên kỳ chưa thanh toán', () => {
    expect(computeOutstandingBalance(
      [ky({ IsPaid: false, PrepaidPrincipalAmount: 20_000_000 })], hd
    )).toBe(80_000_000);
  });

  it('không bao giờ âm', () => {
    expect(computeOutstandingBalance(
      [ky({ IsPaid: true, PrincipalAmount: 500_000_000 })], hd
    )).toBe(0);
  });
});

describe('tách gốc phải trả, gốc đã trả và gốc trả trước hạn', () => {
  const hopDong = {
    Id: 1, CustomerId: 1, ContractNumber: 'PNAT.CN.01181023/GNN-02', ContractType: 1,
    LoanAmount: 550_000_000, InterestRate: 0.09,
    PrincipalRepaymentMethod: 'Trả đều hàng tháng',
    DisbursementDate: '2023-10-19',
  } as any;

  const lich = (n = 120) => Array.from({ length: n }, (_, i) => ({
    Id: i + 1, ContractId: 1, PeriodNumber: i + 1,
    DueDate: `${2023 + Math.floor((i + 10) / 12)}-${String(((i + 10) % 12) + 1).padStart(2, '0')}-15`,
    PrincipalAmount: 0, InterestAmount: 0, TotalAmount: 0,
    IsPaid: i < 10,
  } as RepaymentSchedule));

  it('khách trả thiếu ở một kỳ thì GỐC PHẢI TRẢ của kỳ đó không đổi', () => {
    const l = lich();
    l[10] = { ...l[10], ActualPaidPrincipal: 2_592, IsPaid: false };
    const r = recalculateSchedules(l, hopDong);

    expect(r[10].PrincipalAmount).toBe(4_590_000);
    expect(r[10].ActualPaidPrincipal).toBe(2_592);
  });

  it('trả thiếu KHÔNG làm đổi gốc phải trả của các kỳ sau', () => {
    const l = lich();
    l[10] = { ...l[10], ActualPaidPrincipal: 2_592, IsPaid: false };
    const r = recalculateSchedules(l, hopDong);

    expect(r[11].PrincipalAmount).toBe(4_590_000);
    expect(r[50].PrincipalAmount).toBe(4_590_000);
  });

  it('BẤT BIẾN: tổng GỐC PHẢI TRẢ vẫn bằng số tiền vay dù có trả thiếu', () => {
    const l = lich();
    l[10] = { ...l[10], ActualPaidPrincipal: 2_592, IsPaid: false };
    l[11] = { ...l[11], ActualPaidPrincipal: 1_000_000, IsPaid: false };
    const r = recalculateSchedules(l, hopDong);

    expect(r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0)).toBe(550_000_000);
  });

  it('dư nợ tính theo GỐC ĐÃ TRẢ, không theo gốc phải trả', () => {
    const l = lich();
    l[10] = { ...l[10], ActualPaidPrincipal: 2_592, IsPaid: false };
    const r = recalculateSchedules(l, hopDong);

    const daTra = 10 * 4_590_000 + 2_592;
    expect(computeOutstandingBalance(r, hopDong)).toBe(550_000_000 - daTra);
  });

  it('gốc trả trước hạn thì GIẢM gốc phải trả các kỳ còn lại', () => {
    const l = lich();
    l[10] = { ...l[10], PrepaidPrincipalAmount: 100_000_000, ActualPaidPrincipal: 4_590_000, IsPaid: true };
    const r = recalculateSchedules(l, hopDong);

    expect(r[11].PrincipalAmount).toBeLessThan(4_590_000);
    expect(r.reduce((s, k) => s + (k.PrincipalAmount || 0), 0)).toBe(550_000_000);
  });

  it('kỳ đã tất toán mà không khai gốc đã trả thì lấy gốc phải trả', () => {
    const r = recalculateSchedules(lich(), hopDong);
    expect(computeOutstandingBalance(r, hopDong)).toBe(550_000_000 - 10 * 4_590_000);
  });

  it('tổng nghĩa vụ trả là gốc phải trả + lãi + lãi phạt, không phải số đã thu', () => {
    const l = lich();
    l[10] = { ...l[10], ActualPaidPrincipal: 2_592, IsPaid: false, OverdueInterestAmount: 1_168_166 };
    const r = recalculateSchedules(l, hopDong);

    expect(r[10].TotalAmount).toBe(
      (r[10].PrincipalAmount || 0) + (r[10].InterestAmount || 0) + 1_168_166
    );
  });
});

describe('tất toán thì hết nợ', () => {
  const hopDong = {
    Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 1,
    LoanAmount: 500_000_000, InterestRate: 0.09,
    PrincipalRepaymentMethod: 'Trả đều hàng tháng',
    DisbursementDate: '2024-01-19',
  } as any;

  const lich = () => Array.from({ length: 120 }, (_, i) => ({
    Id: i + 1, ContractId: 1, PeriodNumber: i + 1,
    DueDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
    PrincipalAmount: 4_170_000, InterestAmount: 0, TotalAmount: 0,
    IsPaid: i < 20,
  } as RepaymentSchedule));

  it('KUNN đã tất toán thì dư nợ bằng 0 dù lịch còn kỳ chưa trả', () => {
    const daTatToan = { ...hopDong, IsSettled: true };
    expect(computeOutstandingBalance(lich(), daTatToan)).toBe(0);
  });

  it('tất toán TRƯỚC HẠN: còn 100 kỳ chưa trả vẫn hết nợ', () => {
    const l = lich();
    expect(l.filter(k => !k.IsPaid).length).toBe(100);
    expect(computeOutstandingBalance(l, { ...hopDong, IsSettled: true })).toBe(0);
  });

  it('chưa tất toán thì vẫn tính theo gốc đã trả', () => {
    expect(computeOutstandingBalance(lich(), hopDong)).toBe(500_000_000 - 20 * 4_170_000);
  });

  it('không có lịch trả nợ mà đã tất toán thì cũng bằng 0', () => {
    expect(computeOutstandingBalance(undefined, { ...hopDong, CurrentBalance: 123_000_000, IsSettled: true })).toBe(0);
  });
});

describe('generateSchedule — kỳ cuối rơi vào ngày đáo hạn', () => {
  it('lấy ngày đáo hạn khai kèm cho kỳ cuối', () => {
    const s = generateSchedule(1, 960_000_000, 9.5, '2026-05-15', 120, false, '2026-05-05', undefined, 0, 0, 0, 'reduce_monthly', undefined, undefined, '2036-05-05');
    expect(s.length).toBe(120);
    expect(s[118].DueDate).toBe('2036-03-15');
    expect(s[119].DueDate).toBe('2036-05-05');
    expect(s.reduce((a, k) => a + (k.PrincipalAmount || 0), 0)).toBe(960_000_000);
  });

  it('không khai đáo hạn thì giữ nguyên cách cộng dồn theo kỳ', () => {
    const s = generateSchedule(1, 960_000_000, 9.5, '2026-05-15', 120, false, '2026-05-05');
    expect(s[119].DueDate).toBe('2036-04-15');
  });

  it('giữ nguyên kỳ cuối khi đáo hạn không sau kỳ liền trước', () => {
    const s = generateSchedule(1, 300_000_000, 9, '2026-09-15', 3, false, '2026-05-05', undefined, 0, 0, 0, 'reduce_monthly', undefined, undefined, '2026-08-05');
    expect(s[2].DueDate).toBe('2026-11-15');
  });

  it('lãi kỳ cuối tính theo số ngày thực tế tới đáo hạn', () => {
    const s = generateSchedule(1, 960_000_000, 9.5, '2026-05-15', 120, false, '2026-05-05', undefined, 0, 0, 0, 'reduce_monthly', undefined, undefined, '2036-05-05');
    const cuoi = s[119];
    const truoc = s[118];
    expect(getDaysBetween(truoc.DueDate!, cuoi.DueDate!)).toBe(51);

    const duNoDauKy = cuoi.PrincipalAmount || 0;
    expect(cuoi.InterestAmount).toBe(Math.round(duNoDauKy * 0.095 * 51 / 365));
  });
});

describe('kỳ đầu không được rơi trước hoặc trùng ngày giải ngân', () => {
  it('dịch mốc trả nợ tới lần đầu tiên SAU ngày giải ngân', () => {
    const s = generateSchedule(1, 1_000_000_000, 9, '2026-04-15', 5, true, '2026-05-08');
    expect(s[0].DueDate).toBe('2026-05-15');
    expect(s.every(k => (k.DueDate || '') > '2026-05-08')).toBe(true);
  });

  it('mốc trả nợ trùng đúng ngày giải ngân cũng bị dịch sang kỳ sau', () => {
    const s = generateSchedule(1, 850_000_000, 8.5, '2025-02-17', 6, true, '2025-02-17');
    expect(s[0].DueDate).toBe('2025-03-17');
    expect(s[5].DueDate).toBe('2025-08-17');
  });

  it('kỳ 1 tính lãi theo số ngày thực tế từ ngày giải ngân, không phải 1 ngày', () => {
    const s = generateSchedule(1, 1_000_000_000, 9, '2026-04-15', 5, true, '2026-05-08');
    expect(getDaysBetween('2026-05-08', s[0].DueDate!)).toBe(7);
    expect(s[0].InterestAmount).toBe(Math.round(1_000_000_000 * 0.09 * 7 / 365));
  });

  it('mốc trả nợ vốn đã sau ngày giải ngân thì giữ nguyên', () => {
    const s = generateSchedule(1, 500_000_000, 9, '2026-06-15', 6, true, '2026-05-08');
    expect(s[0].DueDate).toBe('2026-06-15');
  });

  it('không khai ngày giải ngân thì không dịch gì', () => {
    const s = generateSchedule(1, 500_000_000, 9, '2026-04-15', 3, true);
    expect(s[0].DueDate).toBe('2026-04-15');
  });
});

describe('overdueDaysOfSchedule', () => {
  it('ưu tiên số ngày quá hạn banker đã ghi trên kỳ', () => {
    const s = { OverdueDays: 12, DueDate: '2026-01-01' } as RepaymentSchedule;
    expect(overdueDaysOfSchedule(s, '2026-08-05')).toBe(12);
  });

  it('suy từ ngày đến hạn khi kỳ chưa ghi số ngày', () => {
    const s = { OverdueDays: 0, DueDate: '2026-07-31' } as RepaymentSchedule;
    expect(overdueDaysOfSchedule(s, '2026-08-05')).toBe(5);
  });

  it('trả 0 khi chưa tới hạn', () => {
    const s = { DueDate: '2026-09-01' } as RepaymentSchedule;
    expect(overdueDaysOfSchedule(s, '2026-08-05')).toBe(0);
  });
});

describe('computeSchedulePenalty', () => {
  const s = {
    OverdueDays: 0,
    DueDate: '2026-07-06',
    PrincipalAmount: 100_000_000,
    InterestAmount: 900_000,
  } as RepaymentSchedule;

  it('phạt gốc bằng 150% lãi suất trong hạn tính theo số ngày thực tế', () => {
    const r = computeSchedulePenalty(s, 0.10, { asOfDateStr: '2026-08-05' });
    expect(r.overdueDays).toBe(30);
    expect(r.principalPenaltyRate).toBeCloseTo(0.15, 10);
    expect(r.principalPenalty).toBe(Math.round(100_000_000 * 0.15 * (30 / 365)));
  });

  it('phạt lãi chậm trả theo mức 10%/năm', () => {
    const r = computeSchedulePenalty(s, 0.10, { asOfDateStr: '2026-08-05' });
    expect(r.interestPenalty).toBe(Math.round(900_000 * 0.10 * (30 / 365)));
    expect(r.total).toBe(r.principalPenalty + r.interestPenalty);
  });

  it('nhận số ngày quá hạn truyền tay để dùng cho ô nhập trên modal', () => {
    const r = computeSchedulePenalty(s, 0.10, { overdueDays: 45 });
    expect(r.overdueDays).toBe(45);
    expect(r.principalPenalty).toBe(Math.round(100_000_000 * 0.15 * (45 / 365)));
  });

  it('không phạt khi chưa quá hạn', () => {
    const r = computeSchedulePenalty(
      { ...s, DueDate: '2026-09-01' } as RepaymentSchedule,
      0.10,
      { asOfDateStr: '2026-08-05' }
    );
    expect(r).toEqual({
      overdueDays: 0,
      principalPenaltyRate: 0,
      principalPenalty: 0,
      interestPenalty: 0,
      total: 0,
    });
  });

  it('lãi suất 0 không sinh tiền phạt gốc nhưng vẫn phạt lãi chậm trả', () => {
    const r = computeSchedulePenalty(s, 0, { overdueDays: 30 });
    expect(r.principalPenalty).toBe(0);
    expect(r.interestPenalty).toBe(Math.round(900_000 * 0.10 * (30 / 365)));
  });
});

describe('redateSchedules — đường SỬA KUNN đã có lịch', () => {
  const kunn = (n: number): RepaymentSchedule[] =>
    Array.from({ length: n }, (_, i) => ({
      Id: 900 + i,
      ContractId: 1051,
      PeriodNumber: i + 1,
      DueDate: '2026-04-15',
      PrincipalAmount: 0,
      InterestAmount: 0,
      IsPaid: false,
    } as RepaymentSchedule));

  it('kỳ 1 không được rơi trước ngày giải ngân khi khai lại ngày cho lịch cũ', () => {
    const r = redateSchedules(kunn(5), '2026-04-15', '2026-05-08');
    expect(r[0].DueDate).toBe('2026-05-15');
    expect(r.every(s => (s.DueDate || '') > '2026-05-08')).toBe(true);
  });

  it('cho ra đúng dãy ngày mà generateSchedule sinh cho cùng đầu vào', () => {
    const sinhMoi = generateSchedule(1051, 1_000_000_000, 9, '2026-04-15', 5, true, '2026-05-08');
    const khaiLai = redateSchedules(kunn(5), '2026-04-15', '2026-05-08');
    expect(khaiLai.map(s => s.DueDate)).toEqual(sinhMoi.map(s => s.DueDate));
  });

  it('giữ nguyên ngày trong tháng khách đã chọn, chỉ dịch tháng', () => {
    const r = redateSchedules(kunn(3), '2026-05-28', '2026-05-10');
    expect(r.map(s => s.DueDate)).toEqual(['2026-05-28', '2026-06-28', '2026-07-28']);
  });

  it('kẹp ngày 31 về ngày cuối tháng ngắn', () => {
    const r = redateSchedules(kunn(4), '2026-01-31', '2026-01-05');
    expect(r.map(s => s.DueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('đưa kỳ cuối về ngày đáo hạn khi hợp đồng khai rõ mốc đáo hạn', () => {
    const r = redateSchedules(kunn(5), '2026-05-15', '2026-05-08', '2026-10-08');
    expect(r[4].DueDate).toBe('2026-10-08');
  });

  it('không đổi số kỳ và giữ nguyên mọi trường khác của kỳ', () => {
    const goc = kunn(3);
    goc[1].IsPaid = true;
    goc[1].Note = 'đã thu';
    const r = redateSchedules(goc, '2026-05-15', '2026-05-08');
    expect(r).toHaveLength(3);
    expect(r[1].IsPaid).toBe(true);
    expect(r[1].Note).toBe('đã thu');
    expect(r[1].Id).toBe(901);
  });

  it('trả về mảng rỗng khi không có kỳ nào', () => {
    expect(redateSchedules([], '2026-05-15', '2026-05-08')).toEqual([]);
  });
});

describe('buildDueDateSequence — nguồn duy nhất sinh dãy ngày đến hạn', () => {
  it('sinh dãy theo tháng, giữ nguyên ngày trong tháng', () => {
    expect(buildDueDateSequence('2026-05-15', 3, '2026-05-08'))
      .toEqual(['2026-05-15', '2026-06-15', '2026-07-15']);
  });

  it('dịch mốc lên tới lần đầu tiên SAU ngày giải ngân', () => {
    expect(buildDueDateSequence('2026-04-15', 2, '2026-05-08'))
      .toEqual(['2026-05-15', '2026-06-15']);
  });

  it('mốc trùng đúng ngày giải ngân cũng bị dịch sang tháng sau', () => {
    expect(buildDueDateSequence('2026-05-08', 1, '2026-05-08')).toEqual(['2026-06-08']);
  });

  it('không dịch gì khi hợp đồng chưa khai ngày giải ngân', () => {
    expect(buildDueDateSequence('2026-04-15', 2)).toEqual(['2026-04-15', '2026-05-15']);
  });

  it('vắt qua năm đúng', () => {
    expect(buildDueDateSequence('2026-11-15', 3, '2026-11-01'))
      .toEqual(['2026-11-15', '2026-12-15', '2027-01-15']);
  });

  it('đưa kỳ cuối về đáo hạn kể cả khi chỉ lệch một ngày so với mốc tự nhiên', () => {
    const r = buildDueDateSequence('2026-05-15', 3, '2026-05-08', '2026-07-16');
    expect(r[2]).toBe('2026-07-16');
  });

  it('KHÔNG đưa kỳ cuối về đáo hạn khi làm vậy sinh ra kỳ chỉ 1 ngày', () => {
    const r = buildDueDateSequence('2026-05-15', 3, '2026-05-08', '2026-06-16');
    expect(r[2]).toBe('2026-07-15');
  });

  it('trả mảng rỗng khi số kỳ không dương', () => {
    expect(buildDueDateSequence('2026-05-15', 0, '2026-05-08')).toEqual([]);
    expect(buildDueDateSequence('2026-05-15', null, '2026-05-08')).toEqual([]);
  });
});

describe('không ghi đè kỳ ĐÃ THU', () => {
  const lich = (n: number, paidUpTo: number): RepaymentSchedule[] =>
    Array.from({ length: n }, (_, i) => ({
      Id: 900 + i,
      ContractId: 77,
      PeriodNumber: i + 1,
      DueDate: `2026-0${i + 1}-15`,
      PrincipalAmount: 10_000_000,
      InterestAmount: 500_000 + i,
      IsPaid: i < paidUpTo,
    } as RepaymentSchedule));

  it('redateSchedules giữ nguyên ngày đến hạn của kỳ đã thu', () => {
    const goc = lich(5, 2);
    const r = redateSchedules(goc, '2026-06-20', '2026-05-10');
    expect(r[0].DueDate).toBe('2026-01-15');
    expect(r[1].DueDate).toBe('2026-02-15');
    expect(r[2].DueDate).not.toBe('2026-03-15');
    expect(r[3].DueDate).not.toBe('2026-04-15');
  });

  it('kỳ chưa thu vẫn nhận mốc mới theo đúng dãy dùng chung', () => {
    const r = redateSchedules(lich(5, 2), '2026-06-20', '2026-05-10');
    const day = r.filter(s => !s.IsPaid).map(s => s.DueDate);
    expect(day).toEqual(['2026-08-20', '2026-09-20', '2026-10-20']);
  });

  it('mọi kỳ đã thu thì không đổi gì', () => {
    const goc = lich(3, 3);
    const r = redateSchedules(goc, '2026-09-01', '2026-05-10');
    expect(r.map(s => s.DueDate)).toEqual(goc.map(s => s.DueDate));
  });

  it('recalculateSchedules giữ nguyên tiền lãi của kỳ đã thu', () => {
    const goc = lich(4, 2);
    const hd = {
      Id: 77, LoanAmount: 40_000_000, InterestRate: 0.1,
      DisbursementDate: '2025-12-20', PrincipalRepaymentMethod: 'Gốc trả đều',
    } as LoanContract;
    const r = recalculateSchedules(goc, hd);
    expect(r[0].InterestAmount).toBe(500_000);
    expect(r[1].InterestAmount).toBe(500_001);
    expect(r[2].InterestAmount).not.toBe(500_002);
  });

  it('kỳ đã thu vẫn hấp thu tiền trả trước hạn vào gốc, không bị đóng băng cả dòng', () => {
    const goc = lich(4, 2);
    goc[1].PrepaidPrincipalAmount = 5_000_000;
    const hd = {
      Id: 77, LoanAmount: 40_000_000, InterestRate: 0.1,
      DisbursementDate: '2025-12-20', PrincipalRepaymentMethod: 'Gốc trả đều',
    } as LoanContract;
    const r = recalculateSchedules(goc, hd);
    expect(r[1].PrincipalAmount).toBeGreaterThan(10_000_000);
    expect(r[1].InterestAmount).toBe(500_001);
  });
});

describe('tiền trả trước hạn ghi vào cột riêng, không nhét trong Note', () => {
  const sinh = () => generateSchedule(
    1, 100_000_000, 10, '2026-02-15', 12, false, '2026-01-15',
    undefined, 0, 20_000_000, 4, 'reduce_monthly'
  );

  it('ghi số tiền vào PrepaidPrincipalAmount', () => {
    const s = sinh();
    expect(s[3].PrepaidPrincipalAmount).toBe(20_000_000);
  });

  it('không kỳ nào còn chuỗi TRẢ TRƯỚC HẠN trong Note', () => {
    expect(sinh().some(k => (k.Note || '').includes('TRẢ TRƯỚC HẠN'))).toBe(false);
  });

  it('kỳ không trả trước hạn thì cột đó bằng 0, không phải null', () => {
    const s = sinh();
    expect(s[0].PrepaidPrincipalAmount).toBe(0);
    expect(s[4].PrepaidPrincipalAmount).toBe(0);
  });

  it('BẤT BIẾN vẫn giữ: tổng gốc bằng đúng số tiền vay', () => {
    expect(sinh().reduce((a, k) => a + (k.PrincipalAmount || 0), 0)).toBe(100_000_000);
  });

  it('recalculateSchedules đọc lại từ cột và cho ra cùng số gốc', () => {
    const sinhMoi = sinh() as RepaymentSchedule[];
    const hd = {
      Id: 1, LoanAmount: 100_000_000, InterestRate: 0.1,
      DisbursementDate: '2026-01-15', PrincipalRepaymentMethod: 'Gốc trả đều',
    } as LoanContract;
    const lai = recalculateSchedules(sinhMoi, hd);
    expect(lai[3].PrincipalAmount).toBe(sinhMoi[3].PrincipalAmount);
    expect(lai.reduce((a, k) => a + (k.PrincipalAmount || 0), 0)).toBe(100_000_000);
  });
});

describe('schedulePaymentStatus — kỳ chỉ xong khi thu ĐỦ nghĩa vụ', () => {
  const ky = (o: Partial<RepaymentSchedule>): RepaymentSchedule => ({
    Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2025-06-15',
    PrincipalAmount: 5_420_000, InterestAmount: 3_827_218, TotalAmount: 0,
    IsPaid: false, ...o,
  } as RepaymentSchedule);

  it('chưa thu gì', () => {
    const r = schedulePaymentStatus(ky({}));
    expect(r.status).toBe('chua_thu');
    expect(r.collected).toBe(0);
    expect(r.shortfall).toBe(9_247_218);
  });

  it('đủ gốc nhưng thiếu lãi thì KHÔNG xong — ca PHẠM TẤN KIỆT kỳ 17', () => {
    const r = schedulePaymentStatus(ky({
      IsPaid: true, OverdueInterestAmount: 17_819,
      ActualPaidPrincipal: 5_420_000, ActualPaidInterest: 358_140,
    }));
    expect(r.status).toBe('thu_mot_phan');
    expect(r.shortfall).toBe(3_486_897);
  });

  it('mới thu một phần gốc thì KHÔNG xong — ca PHẠM TẤN KIỆT kỳ 18', () => {
    const r = schedulePaymentStatus(ky({
      IsPaid: true, PrincipalAmount: 5_420_000, InterestAmount: 3_668_121,
      OverdueInterestAmount: 668_219, ActualPaidPrincipal: 1_911, ActualPaidInterest: 0,
    }));
    expect(r.status).toBe('thu_mot_phan');
    expect(r.shortfall).toBe(9_754_429);
  });

  it('thu một phần gốc một phần lãi thì KHÔNG xong', () => {
    const r = schedulePaymentStatus(ky({
      ActualPaidPrincipal: 2_000_000, ActualPaidInterest: 1_000_000,
    }));
    expect(r.status).toBe('thu_mot_phan');
  });

  it('thu đủ cả gốc lãi phạt mới xong', () => {
    const r = schedulePaymentStatus(ky({
      OverdueInterestAmount: 17_819,
      ActualPaidPrincipal: 5_420_000, ActualPaidInterest: 3_845_037,
    }));
    expect(r.status).toBe('da_thu_du');
    expect(r.shortfall).toBe(0);
  });

  it('đủ gốc và lãi mà chưa đóng phạt thì vẫn chưa xong', () => {
    const r = schedulePaymentStatus(ky({
      OverdueInterestAmount: 17_819,
      ActualPaidPrincipal: 5_420_000, ActualPaidInterest: 3_827_218,
    }));
    expect(r.status).toBe('thu_mot_phan');
    expect(r.shortfall).toBe(17_819);
  });

  it('QUY ƯỚC CŨ: IsPaid kèm hai cột khai tay bỏ trống là đã trả đủ theo lịch', () => {
    const r = schedulePaymentStatus(ky({ IsPaid: true }));
    expect(r.status).toBe('da_thu_du');
    expect(r.shortfall).toBe(0);
  });

  it('quy ước cũ vẫn đúng khi kỳ có trả trước hạn — ca LÊ VĂN HẬU, không được báo thiếu', () => {
    const r = schedulePaymentStatus(ky({
      IsPaid: true, PrincipalAmount: 900_470_000, InterestAmount: 20_843_138,
      PrepaidPrincipalAmount: 888_000_000,
    }));
    expect(r.status).toBe('da_thu_du');
    expect(r.shortfall).toBe(0);
  });

  it('trả trước hạn KHÔNG bị trừ hai lần: gốc đã thu cộng cả phần trả trước', () => {
    const r = schedulePaymentStatus(ky({
      PrincipalAmount: 900_470_000, InterestAmount: 20_843_138,
      PrepaidPrincipalAmount: 888_000_000, ActualPaidPrincipal: 12_470_000,
      ActualPaidInterest: 20_843_138,
    }));
    expect(r.collectedPrincipal).toBe(900_470_000);
    expect(r.status).toBe('da_thu_du');
  });

  it('thu thừa vẫn tính là xong, không âm', () => {
    const r = schedulePaymentStatus(ky({
      ActualPaidPrincipal: 6_000_000, ActualPaidInterest: 4_000_000,
    }));
    expect(r.status).toBe('da_thu_du');
    expect(r.shortfall).toBe(0);
  });
});

describe('kỳ thu một phần vẫn bị đếm quá hạn và tính phạt', () => {
  const kyThieu = {
    Id: 1, ContractId: 1, PeriodNumber: 17, DueDate: '2025-06-15',
    PrincipalAmount: 5_420_000, InterestAmount: 3_827_218, TotalAmount: 0,
    OverdueInterestAmount: 17_819, IsPaid: true,
    ActualPaidPrincipal: 5_420_000, ActualPaidInterest: 358_140,
  } as RepaymentSchedule;

  it('getAutoDebtGroupInfo KHÔNG bỏ qua kỳ mới thu một phần dù đã tích IsPaid', () => {
    const r = getAutoDebtGroupInfo([kyThieu], '2026-08-05');
    expect(r.maxOverdueDays).toBeGreaterThan(360);
    expect(r.debtGroup).toBe(5);
  });

  it('kỳ thu ĐỦ thì vẫn được bỏ qua như trước', () => {
    const kyDu = {
      ...kyThieu, ActualPaidInterest: 3_845_037,
    } as RepaymentSchedule;
    const r = getAutoDebtGroupInfo([kyDu], '2026-08-05');
    expect(r.maxOverdueDays).toBe(0);
    expect(r.debtGroup).toBe(1);
  });

  it('kỳ theo quy ước cũ vẫn được bỏ qua — không làm 831 kỳ đã thu thành quá hạn', () => {
    const kyCu = {
      ...kyThieu, ActualPaidPrincipal: 0, ActualPaidInterest: 0,
    } as RepaymentSchedule;
    const r = getAutoDebtGroupInfo([kyCu], '2026-08-05');
    expect(r.maxOverdueDays).toBe(0);
  });

  it('overdueDaysOfSchedule vẫn đếm ngày cho kỳ thu một phần', () => {
    expect(overdueDaysOfSchedule(kyThieu, '2026-08-05')).toBeGreaterThan(360);
  });
});

describe('alignLastPeriodToMaturity — kéo kỳ cuối về ngày đáo hạn', () => {
  const lich = (dates: string[], paidUpTo = 0): RepaymentSchedule[] =>
    dates.map((d, i) => ({
      Id: 900 + i, ContractId: 1, PeriodNumber: i + 1, DueDate: d,
      PrincipalAmount: 1_000_000, InterestAmount: 10_000, TotalAmount: 0,
      IsPaid: i < paidUpTo,
    } as RepaymentSchedule));

  it('chỉ đổi kỳ cuối, mọi kỳ khác giữ nguyên', () => {
    const goc = lich(['2026-05-15', '2026-06-15', '2026-07-15']);
    const r = alignLastPeriodToMaturity(goc, '2026-07-24');
    expect(r.map(s => s.DueDate)).toEqual(['2026-05-15', '2026-06-15', '2026-07-24']);
  });

  it('ca ĐOÀN NGỌC LÝ: kỳ cuối đang lệch trước đáo hạn 20 ngày', () => {
    const r = alignLastPeriodToMaturity(lich(['2036-03-15', '2036-04-15']), '2036-05-05');
    expect(r[1].DueDate).toBe('2036-05-05');
  });

  it('KHÔNG đổi khi kỳ cuối đã thu — không ghi đè lịch sử', () => {
    const goc = lich(['2025-07-15', '2025-08-15'], 2);
    const r = alignLastPeriodToMaturity(goc, '2025-08-17');
    expect(r[1].DueDate).toBe('2025-08-15');
  });

  it('KHÔNG đổi khi làm vậy sinh ra kỳ cuối chỉ 1 ngày', () => {
    const r = alignLastPeriodToMaturity(lich(['2026-06-15', '2026-07-15']), '2026-06-16');
    expect(r[1].DueDate).toBe('2026-07-15');
  });

  it('KHÔNG đổi khi chưa khai ngày đáo hạn', () => {
    const r = alignLastPeriodToMaturity(lich(['2026-06-15', '2026-07-15']), null);
    expect(r[1].DueDate).toBe('2026-07-15');
  });

  it('kỳ cuối đã đúng đáo hạn thì không có gì đổi', () => {
    const r = alignLastPeriodToMaturity(lich(['2026-06-15', '2026-07-15']), '2026-07-15');
    expect(r[1].DueDate).toBe('2026-07-15');
  });

  it('lịch một kỳ duy nhất vẫn kéo được về đáo hạn', () => {
    const r = alignLastPeriodToMaturity(lich(['2026-07-15']), '2026-07-24');
    expect(r[0].DueDate).toBe('2026-07-24');
  });

  it('needsLastPeriodAlignment nhận ra đúng khoản cần sửa', () => {
    expect(needsLastPeriodAlignment(lich(['2036-03-15', '2036-04-15']), '2036-05-05')).toBe(true);
    expect(needsLastPeriodAlignment(lich(['2026-06-15', '2026-07-15']), '2026-07-15')).toBe(false);
    expect(needsLastPeriodAlignment(lich(['2025-07-15', '2025-08-15'], 2), '2025-08-17')).toBe(false);
    expect(needsLastPeriodAlignment([], '2026-07-24')).toBe(false);
  });

  it('cho ra cùng ngày kỳ cuối với buildDueDateSequence', () => {
    const day = buildDueDateSequence('2026-05-15', 3, '2026-05-08', '2026-07-24');
    const r = alignLastPeriodToMaturity(lich(['2026-05-15', '2026-06-15', '2026-07-15']), '2026-07-24');
    expect(r[2].DueDate).toBe(day[2]);
  });
});
