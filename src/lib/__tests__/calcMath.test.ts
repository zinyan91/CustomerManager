import { describe, it, expect } from 'vitest';
import {
  addMonths,
  diffDays,
  pvAnnuityFactor,
  emiFactor,
  emiMonthlyPayment,
  dtiMaxMonthlyPayment,
  effectiveAnnualRate,
  flatToReducingApprox,
} from '../calcMath';
import { getDaysBetween } from '../loanMath';

describe('addMonths', () => {
  it('cộng tháng, giữ nguyên ngày', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('kẹp về ngày cuối tháng khi tháng đích ngắn hơn', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('trả rỗng với đầu vào không hợp lệ', () => {
    expect(addMonths('', 3)).toBe('');
    expect(addMonths('2026-01-15', 0)).toBe('');
  });
});

describe('diffDays', () => {
  it('đếm đúng số ngày thực tế', () => {
    expect(diffDays('2026-01-15', '2026-02-15')).toBe(31);
    expect(diffDays('2026-02-15', '2026-03-15')).toBe(28);
  });

  it('trả 0 khi hai mốc trùng ngày', () => {
    expect(diffDays('2026-01-15', '2026-01-15')).toBe(0);
  });

  it('trả 0 khi đầu vào không hợp lệ', () => {
    expect(diffDays('', '2026-01-15')).toBe(0);
    expect(diffDays('sai', '2026-01-15')).toBe(0);
  });
});

describe('KHÁC BIỆT giữa diffDays (công cụ) và getDaysBetween (lịch trả nợ)', () => {

  it('khớp nhau với mọi ngày hợp lệ và khác nhau', () => {
    expect(diffDays('2026-01-15', '2026-02-15')).toBe(getDaysBetween('2026-01-15', '2026-02-15'));
    expect(diffDays('2026-02-01', '2026-12-31')).toBe(getDaysBetween('2026-02-01', '2026-12-31'));
  });

  it('LỆCH khi hai mốc trùng ngày: 0 so với 1', () => {
    expect(diffDays('2026-01-15', '2026-01-15')).toBe(0);
    expect(getDaysBetween('2026-01-15', '2026-01-15')).toBe(1);
  });

  it('LỆCH khi chuỗi ngày hỏng: 0 so với 30', () => {
    expect(diffDays('hỏng', '2026-01-15')).toBe(0);
    expect(getDaysBetween('hỏng', '2026-01-15')).toBe(30);
  });
});

describe('pvAnnuityFactor và emiFactor', () => {
  it('là nghịch đảo của nhau', () => {
    const r = 0.01, n = 24;
    expect(pvAnnuityFactor(r, n) * emiFactor(r, n)).toBeCloseTo(1, 10);
  });

  it('khứ hồi: vay P -> trả góp PMT -> quy ngược về đúng P', () => {
    const P = 500_000_000, r = 0.0075, n = 60;
    const pmt = P * emiFactor(r, n);
    expect(pmt * pvAnnuityFactor(r, n)).toBeCloseTo(P, 4);
  });

  it('lãi suất 0: giá trị hiện tại bằng số kỳ', () => {
    expect(pvAnnuityFactor(0, 12)).toBe(12);
    expect(emiFactor(0, 12)).toBeCloseTo(1 / 12);
  });

  it('kỳ hạn 0 trả về 0', () => {
    expect(pvAnnuityFactor(0.01, 0)).toBe(0);
    expect(emiFactor(0.01, 0)).toBe(0);
  });
});

describe('emiMonthlyPayment', () => {
  it('tính đúng theo công thức chuẩn', () => {

    const pmt = emiMonthlyPayment(100_000_000, 0.01, 12);
    expect(pmt).toBe(8_884_879);
  });

  it('tổng trả luôn lớn hơn tiền vay khi có lãi', () => {
    const P = 100_000_000, n = 12;
    expect(emiMonthlyPayment(P, 0.01, n) * n).toBeGreaterThan(P);
  });

  it('kỳ hạn dài hơn thì tiền trả mỗi tháng nhỏ hơn', () => {
    expect(emiMonthlyPayment(100_000_000, 0.01, 24))
      .toBeLessThan(emiMonthlyPayment(100_000_000, 0.01, 12));
  });

  it('trả 0 khi thiếu dữ liệu', () => {
    expect(emiMonthlyPayment(0, 0.01, 12)).toBe(0);
    expect(emiMonthlyPayment(100_000_000, 0.01, 0)).toBe(0);
  });
});

describe('dtiMaxMonthlyPayment', () => {
  it('lấy giá trị NHỎ HƠN giữa thu nhập ròng và trần DTI', () => {

    expect(dtiMaxMonthlyPayment(50_000_000, 20_000_000, 5_000_000, 60)).toBe(25_000_000);
  });

  it('trần DTI thấp thì trần DTI quyết định', () => {
    expect(dtiMaxMonthlyPayment(50_000_000, 10_000_000, 0, 30)).toBe(15_000_000);
  });

  it('không bao giờ âm dù chi tiêu vượt thu nhập', () => {
    expect(dtiMaxMonthlyPayment(10_000_000, 20_000_000, 5_000_000, 60)).toBe(0);
  });

  it('nợ hiện có vượt trần DTI thì khả năng vay bằng 0', () => {
    expect(dtiMaxMonthlyPayment(50_000_000, 5_000_000, 40_000_000, 60)).toBe(0);
  });
});

describe('effectiveAnnualRate', () => {
  it('12%/năm ghép lãi tháng -> EAR 12,6825%', () => {
    expect(effectiveAnnualRate(0.12, 12)).toBeCloseTo(0.126825, 6);
  });

  it('ghép lãi 1 lần/năm thì EAR bằng lãi danh nghĩa', () => {
    expect(effectiveAnnualRate(0.12, 1)).toBeCloseTo(0.12, 10);
  });

  it('ghép lãi càng dày thì EAR càng cao', () => {
    expect(effectiveAnnualRate(0.12, 12)).toBeGreaterThan(effectiveAnnualRate(0.12, 4));
    expect(effectiveAnnualRate(0.12, 4)).toBeGreaterThan(effectiveAnnualRate(0.12, 1));
  });

  it('EAR luôn >= lãi danh nghĩa', () => {
    for (const m of [1, 2, 4, 12, 365]) {
      expect(effectiveAnnualRate(0.1, m)).toBeGreaterThanOrEqual(0.1);
    }
  });
});

describe('flatToReducingApprox', () => {
  it('lãi phẳng 12%/năm, kỳ hạn 12 tháng -> xấp xỉ 22,15%', () => {
    expect(flatToReducingApprox(0.12, 12)).toBeCloseTo(0.221538, 6);
  });

  it('lãi dư nợ giảm dần luôn CAO HƠN lãi phẳng tương đương', () => {

    for (const n of [6, 12, 24, 36]) {
      expect(flatToReducingApprox(0.1, n)).toBeGreaterThan(0.1);
    }
  });

  it('kỳ hạn càng dài thì hệ số quy đổi càng tiệm cận 2 lần', () => {
    expect(flatToReducingApprox(0.1, 240) / 0.1).toBeCloseTo(2, 1);
  });

  it('kỳ hạn 0 trả về 0', () => {
    expect(flatToReducingApprox(0.12, 0)).toBe(0);
  });
});
