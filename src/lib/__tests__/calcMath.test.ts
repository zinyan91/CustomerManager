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
  buildLoanSchedule,
  mergePrepayments,
  postPromoRateAnnual,
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

describe('postPromoRateAnnual', () => {
  it('LS cơ sở + biên độ', () => {
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5, baseRateAnnual: 9.9, marginAnnual: 3.5 })).toBe(13.4);
  });

  it('LS cơ sở 0 và biên độ 0 là giá trị hợp lệ, không bị coi là thiếu', () => {
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5, baseRateAnnual: 0, marginAnnual: 3.5 })).toBe(3.5);
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5, baseRateAnnual: 9.9, marginAnnual: 0 })).toBe(9.9);
  });

  it('không khai LS cơ sở thì lấy lãi suất ưu đãi làm cơ sở', () => {
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5, marginAnnual: 3.5 })).toBe(13);
  });

  it('LS sau ưu đãi khai tay thắng cả cơ sở và biên độ', () => {
    expect(postPromoRateAnnual({
      promoRateAnnual: 9.5, baseRateAnnual: 9.9, marginAnnual: 3.5, postPromoRateOverride: 12.8,
    })).toBe(12.8);
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5, marginAnnual: 3.5, postPromoRateOverride: 0 })).toBe(0);
  });

  it('không khai gì thì giữ nguyên lãi suất ưu đãi', () => {
    expect(postPromoRateAnnual({ promoRateAnnual: 9.5 })).toBe(9.5);
    expect(postPromoRateAnnual({
      promoRateAnnual: 9.5, baseRateAnnual: null, marginAnnual: null, postPromoRateOverride: null,
    })).toBe(9.5);
  });
});

describe('mergePrepayments', () => {
  it('gộp nhiều lần trả trong cùng một kỳ và sắp xếp theo kỳ', () => {
    const out = mergePrepayments([
      { period: 5, amount: 10_000_000, mode: 'reduce_monthly' },
      { period: 2, amount: 3_000_000, mode: 'reduce_monthly' },
      { period: 5, amount: 5_000_000, mode: 'shorten_tenor' },
    ]);
    expect(out.map(p => p.period)).toEqual([2, 5]);
    expect(out[1].amount).toBe(15_000_000);
    expect(out[1].mode).toBe('shorten_tenor');
  });

  it('bỏ dòng trống, số tiền <= 0 hoặc kỳ không hợp lệ', () => {
    expect(mergePrepayments([
      { period: 0, amount: 1_000_000, mode: 'reduce_monthly' },
      { period: 3, amount: 0, mode: 'reduce_monthly' },
      { period: 4, amount: -5, mode: 'reduce_monthly' },
      { period: NaN, amount: 1_000_000, mode: 'reduce_monthly' },
    ])).toEqual([]);
  });
});

describe('buildLoanSchedule', () => {
  const base = {
    loanAmount: 960_000_000,
    promoRateAnnual: 9.5,
    tenorMonths: 12,
    disbursementDate: '2026-05-05',
    repayMethod: 'equal_principal' as const,
  };

  it('BẤT BIẾN: tổng gốc các kỳ bằng số tiền vay', () => {
    const cases = [
      { ...base },
      { ...base, principalGraceMonths: 3 },
      { ...base, repayMethod: 'bullet' as const },
      { ...base, tenorMonths: 120, principalGraceMonths: 18 },
      {
        ...base, tenorMonths: 120, principalGraceMonths: 18,
        prepayments: [
          { period: 2, amount: 8_000_000, mode: 'reduce_monthly' as const },
          { period: 30, amount: 100_000_000, mode: 'reduce_monthly' as const },
          { period: 60, amount: 50_000_000, mode: 'shorten_tenor' as const },
        ],
      },
      {
        ...base, tenorMonths: 24,
        prepayments: [{ period: 3, amount: 900_000_000, mode: 'shorten_tenor' as const }],
      },
    ];
    for (const c of cases) {
      const rows = buildLoanSchedule(c);
      expect(rows.reduce((a, r) => a + r.principal, 0)).toBe(c.loanAmount);
    }
  });

  it('ngày bắt đầu kỳ 1 là ngày giải ngân, các kỳ sau nối liền nhau', () => {
    const rows = buildLoanSchedule({ ...base, tenorMonths: 4 });
    expect(rows[0].startDate).toBe('2026-05-05');
    expect(rows[0].dueDate).toBe('2026-06-05');
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].startDate).toBe(rows[i - 1].dueDate);
    }
  });

  it('số ngày là ngày thực tế giữa hai mốc, không phải 30', () => {
    const rows = buildLoanSchedule({ ...base, tenorMonths: 12 });
    expect(rows[0].days).toBe(31);
    expect(rows[9].days).toBe(28);
  });

  it('áp lãi ưu đãi trong thời gian ưu đãi, sau đó là cơ sở + biên độ', () => {
    const rows = buildLoanSchedule({
      ...base, tenorMonths: 12, promoRateAnnual: 8,
      promoMonths: 3, baseRateAnnual: 9.9, marginAnnual: 3.5,
    });
    expect(rows.slice(0, 3).map(r => r.rateAnnual)).toEqual([8, 8, 8]);
    expect(rows.slice(3).every(r => r.rateAnnual === 13.4)).toBe(true);
  });

  it('không khai ưu đãi thì mọi kỳ dùng một lãi suất', () => {
    const rows = buildLoanSchedule({ ...base, promoMonths: 0, marginAnnual: 4.5 });
    expect(rows.every(r => r.rateAnnual === 9.5)).toBe(true);
  });

  it('lãi kỳ đầu = dư nợ x lãi suất x số ngày / 365', () => {
    const rows = buildLoanSchedule(base);
    expect(rows[0].interest).toBe(Math.round(960_000_000 * 0.095 * 31 / 365));
  });

  it('ân hạn gốc: các kỳ trong thời gian ân hạn không trả gốc', () => {
    const rows = buildLoanSchedule({ ...base, tenorMonths: 12, principalGraceMonths: 3 });
    expect(rows.slice(0, 3).every(r => r.principal === 0)).toBe(true);
    expect(rows[3].principal).toBeGreaterThan(0);
  });

  it('trả trước hạn TRONG lúc ân hạn gốc: gốc đều sau ân hạn tính theo số kỳ sau ân hạn, không dồn cục kỳ cuối', () => {
    // Tái tạo đúng ca thực tế (GNN 960tr/120 tháng, ân hạn 18 tháng, trả trước
    // hạn kỳ 2 và 3 — trong lúc còn ân hạn). Trước khi sửa: gốc/kỳ tính hụt
    // (8.070.000 thay vì ~9.260.000) vì chia dư nợ cho tenorMonths - kỳ hiện tại
    // (117) thay vì kỳ còn lại SAU ân hạn (102), kỳ cuối phải gánh 128.930.000 —
    // gấp hơn 16 lần một kỳ thường.
    const rows = buildLoanSchedule({
      ...base, loanAmount: 960_000_000, tenorMonths: 120, principalGraceMonths: 18,
      prepayments: [
        { period: 2, amount: 8_000_000, mode: 'reduce_monthly' },
        { period: 3, amount: 8_000_000, mode: 'reduce_monthly' },
      ],
    });
    const firstAfterGrace = rows[18].principal; // kỳ 19
    const lastPeriod = rows[rows.length - 1].principal; // kỳ 120
    expect(firstAfterGrace).toBeGreaterThan(9_000_000);
    // Kỳ cuối chỉ gánh phần dư làm tròn, không được vượt quá một kỳ thường quá xa.
    expect(lastPeriod).toBeLessThan(firstAfterGrace * 1.5);
    expect(rows.reduce((a, r) => a + r.principal, 0)).toBe(960_000_000);
  });

  it('trả trước hạn nhiều kỳ: mỗi kỳ đều được ghi nhận', () => {
    const rows = buildLoanSchedule({
      ...base, tenorMonths: 24,
      prepayments: [
        { period: 3, amount: 50_000_000, mode: 'reduce_monthly' },
        { period: 9, amount: 30_000_000, mode: 'reduce_monthly' },
      ],
    });
    expect(rows.filter(r => r.prepayment > 0).map(r => r.period)).toEqual([3, 9]);
    expect(rows[2].prepayment).toBe(50_000_000);
    expect(rows[8].prepayment).toBe(30_000_000);
  });

  it('giảm gốc hàng tháng sau mỗi lần trả trước hạn', () => {
    const rows = buildLoanSchedule({
      ...base, tenorMonths: 24,
      prepayments: [
        { period: 3, amount: 50_000_000, mode: 'reduce_monthly' },
        { period: 9, amount: 30_000_000, mode: 'reduce_monthly' },
      ],
    });
    expect(rows[3].scheduledPrincipal).toBeLessThan(rows[1].scheduledPrincipal);
    expect(rows[9].scheduledPrincipal).toBeLessThan(rows[3].scheduledPrincipal);
  });

  it('rút ngắn thời hạn: khoản vay kết thúc sớm hơn kỳ hạn khai báo', () => {
    const rows = buildLoanSchedule({
      ...base, tenorMonths: 24,
      prepayments: [{ period: 3, amount: 400_000_000, mode: 'shorten_tenor' }],
    });
    expect(rows.length).toBeLessThan(24);
    expect(rows[rows.length - 1].endingBalance).toBe(0);
  });

  it('trả trước hạn không vượt quá dư nợ còn lại', () => {
    const rows = buildLoanSchedule({
      ...base, tenorMonths: 12,
      prepayments: [{ period: 2, amount: 5_000_000_000, mode: 'shorten_tenor' }],
    });
    expect(rows.reduce((a, r) => a + r.principal, 0)).toBe(960_000_000);
    expect(rows[1].endingBalance).toBe(0);
    expect(rows.length).toBe(2);
  });

  it('đầu vào thiếu thì trả bảng rỗng', () => {
    expect(buildLoanSchedule({ ...base, loanAmount: 0 })).toEqual([]);
    expect(buildLoanSchedule({ ...base, disbursementDate: '' })).toEqual([]);
    expect(buildLoanSchedule({ ...base, tenorMonths: 0 })).toEqual([]);
  });
});

describe('ngày bắt đầu trả nợ (ngày trả nợ kỳ 1)', () => {
  const base = {
    loanAmount: 500_000_000,
    promoRateAnnual: 8.5,
    tenorMonths: 12,
    disbursementDate: '2026-08-04',
    repayMethod: 'equal_principal' as const,
  };

  it('kỳ 1 đến hạn đúng ngày khai, các kỳ sau cách nhau một tháng', () => {
    const rows = buildLoanSchedule({ ...base, firstPaymentDate: '2026-10-20' });
    expect(rows[0].dueDate).toBe('2026-10-20');
    expect(rows[1].dueDate).toBe('2026-11-20');
    expect(rows[11].dueDate).toBe('2027-09-20');
  });

  it('kỳ 1 tính lãi theo số ngày thực tế từ ngày giải ngân', () => {
    const rows = buildLoanSchedule({ ...base, firstPaymentDate: '2026-10-20' });
    expect(rows[0].startDate).toBe('2026-08-04');
    expect(rows[0].days).toBe(diffDays('2026-08-04', '2026-10-20'));
    expect(rows[0].interest).toBe(Math.round(500_000_000 * 0.085 * rows[0].days / 365));
  });

  it('không khai thì vẫn là ngày giải ngân + 1 tháng như trước', () => {
    const rows = buildLoanSchedule(base);
    const same = buildLoanSchedule({ ...base, firstPaymentDate: '' });
    expect(rows[0].dueDate).toBe('2026-09-04');
    expect(same[0].dueDate).toBe('2026-09-04');
  });

  it('bỏ qua ngày trả nợ không sau ngày giải ngân', () => {
    const rows = buildLoanSchedule({ ...base, firstPaymentDate: '2026-07-01' });
    expect(rows[0].dueDate).toBe('2026-09-04');
    expect(buildLoanSchedule({ ...base, firstPaymentDate: '2026-08-04' })[0].dueDate).toBe('2026-09-04');
  });

  it('BẤT BIẾN: tổng gốc vẫn bằng số tiền vay khi lùi ngày trả nợ', () => {
    for (const first of ['2026-10-20', '2027-02-28', '2026-09-05']) {
      const rows = buildLoanSchedule({
        ...base, tenorMonths: 24, firstPaymentDate: first,
        prepayments: [{ period: 5, amount: 40_000_000, mode: 'reduce_monthly' as const }],
      });
      expect(rows.reduce((a, r) => a + r.principal, 0)).toBe(500_000_000);
    }
  });

  it('kẹp về ngày cuối tháng khi ngày trả nợ là 31', () => {
    const rows = buildLoanSchedule({ ...base, firstPaymentDate: '2026-12-31' });
    expect(rows[0].dueDate).toBe('2026-12-31');
    expect(rows[1].dueDate).toBe('2027-01-31');
    expect(rows[2].dueDate).toBe('2027-02-28');
  });
});

describe('kỳ cuối rơi vào ngày đáo hạn', () => {
  const base = {
    loanAmount: 960_000_000,
    promoRateAnnual: 9.5,
    tenorMonths: 120,
    disbursementDate: '2026-05-05',
    firstPaymentDate: '2026-05-15',
    repayMethod: 'equal_principal' as const,
    promoMonths: 12,
    baseRateAnnual: 9.65,
    marginAnnual: 3.75,
  };

  it('kỳ cuối đến hạn đúng ngày đáo hạn, không phải ngày 15 của tháng trước', () => {
    const rows = buildLoanSchedule(base);
    expect(rows.length).toBe(120);
    expect(rows[118].dueDate).toBe('2036-03-15');
    expect(rows[119].dueDate).toBe('2036-05-05');
  });

  it('kỳ cuối tính lãi theo số ngày thực tế tới ngày đáo hạn', () => {
    const rows = buildLoanSchedule(base);
    const cuoi = rows[119];
    expect(cuoi.days).toBe(diffDays('2036-03-15', '2036-05-05'));
    expect(cuoi.days).toBe(51);
    expect(cuoi.interest).toBe(Math.round(cuoi.beginningBalance * (13.4 / 100) * 51 / 365));
  });

  it('BẤT BIẾN: tổng gốc vẫn bằng số tiền vay', () => {
    const rows = buildLoanSchedule(base);
    expect(rows.reduce((a, r) => a + r.principal, 0)).toBe(960_000_000);
    expect(rows[119].endingBalance).toBe(0);
  });

  it('không khai ngày bắt đầu trả nợ thì kỳ cuối vốn đã là ngày đáo hạn', () => {
    const rows = buildLoanSchedule({ ...base, firstPaymentDate: '' });
    expect(rows[119].dueDate).toBe('2036-05-05');
  });

  it('vẫn giữ nguyên khi ngày đáo hạn không sau kỳ liền trước', () => {
    const rows = buildLoanSchedule({
      loanAmount: 300_000_000, promoRateAnnual: 9, tenorMonths: 3,
      disbursementDate: '2026-05-05', firstPaymentDate: '2026-09-15',
      repayMethod: 'equal_principal',
    });
    expect(rows[2].dueDate).toBe('2026-11-15');
  });
});
