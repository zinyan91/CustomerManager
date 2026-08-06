import { describe, it, expect } from 'vitest';
import {
  buildRateTimeline,
  buildContractRateTimeline,
  resolveRateAt,
  splitPeriodByRate,
  getEffectiveActiveRate,
  resolveRateModeOf,
  buildRateFields,
  weightedRatePercent,
  formatSegmentsLabel,
} from '../rateResolution';
import type { LoanContract } from '../../types';

const HOM_NAY = '2026-08-04';

describe('buildRateTimeline — hợp nhất ưu đãi, thả nổi và bảng điều chỉnh', () => {
  it('ưu đãi 12 tháng rồi thả nổi base + biên', () => {
    const t = buildRateTimeline({
      startDate: '2026-04-15',
      preferentialRate: 9.5,
      preferentialPeriodMonths: 12,
      baseRate: 9.6,
      marginRate: 3.2,
    }, { today: HOM_NAY });

    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ fromDate: '2026-04-15', ratePercent: 9.5, kind: 'preferential' });
    expect(t[1]).toMatchObject({ fromDate: '2027-04-15', ratePercent: 12.8, kind: 'floating' });
  });

  it('KHÔNG bỏ kỳ ưu đãi khi hợp đồng đã có mốc điều chỉnh', () => {
    const t = buildRateTimeline({
      startDate: '2026-04-15',
      preferentialRate: 9.5,
      preferentialPeriodMonths: 12,
      baseRate: 9.6,
      marginRate: 3.2,
      rateHistory: [{ id: '1', effectiveDate: '2028-06-15', ratePercent: 13.5 }],
    }, { today: HOM_NAY });

    expect(t.map(p => [p.fromDate, p.ratePercent])).toEqual([
      ['2026-04-15', 9.5],
      ['2027-04-15', 12.8],
      ['2028-06-15', 13.5],
    ]);
  });

  it('nhận cả lãi suất dạng thập phân', () => {
    const t = buildRateTimeline({
      startDate: '2026-04-15',
      preferentialRate: 0.095,
      preferentialPeriodMonths: 12,
      baseRate: 0.096,
      marginRate: 0.032,
    });
    expect(t[0].ratePercent).toBeCloseTo(9.5, 10);
    expect(t[1].ratePercent).toBeCloseTo(12.8, 10);
  });

  it('mốc điều chỉnh khai base + biên thay vì lãi suất trọn', () => {
    const t = buildRateTimeline({
      startDate: '2026-01-01',
      baseRate: 9.6,
      marginRate: 3.2,
      rateHistory: [{ id: '1', effectiveDate: '2026-07-01', ratePercent: 0, baseRatePercent: 10.3, marginPercent: 3.2 }],
    });
    expect(t[1]).toMatchObject({ fromDate: '2026-07-01', ratePercent: 13.5, kind: 'adjustment' });
  });

  it('mốc điều chỉnh trùng ngày hết ưu đãi thì điều chỉnh thắng', () => {
    const t = buildRateTimeline({
      startDate: '2026-04-15',
      preferentialRate: 9.5,
      preferentialPeriodMonths: 12,
      baseRate: 9.6,
      marginRate: 3.2,
      rateHistory: [{ id: '1', effectiveDate: '2027-04-15', ratePercent: 11.0 }],
    });
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ fromDate: '2027-04-15', ratePercent: 11.0, kind: 'adjustment' });
  });

  it('kỳ thả nổi trong tương lai là DỰ PHÓNG, kỳ đã qua thì không', () => {
    const tuongLai = buildRateTimeline({
      startDate: '2026-04-15', preferentialRate: 9.5, preferentialPeriodMonths: 12,
      baseRate: 9.6, marginRate: 3.2,
    }, { today: HOM_NAY });
    expect(tuongLai[1].forecast).toBe(true);

    const daQua = buildRateTimeline({
      startDate: '2024-04-15', preferentialRate: 9.5, preferentialPeriodMonths: 12,
      baseRate: 9.6, marginRate: 3.2,
    }, { today: HOM_NAY });
    expect(daQua[1].forecast).toBe(false);
  });

  it('mốc điều chỉnh không bao giờ là dự phóng', () => {
    const t = buildRateTimeline({
      startDate: '2026-01-01', baseRate: 9.6, marginRate: 3.2,
      rateHistory: [{ id: '1', effectiveDate: '2030-01-01', ratePercent: 14 }],
    }, { today: HOM_NAY });
    expect(t[1].forecast).toBe(false);
  });

  it('bỏ qua mốc thiếu ngày hoặc lãi suất bằng 0', () => {
    const t = buildRateTimeline({
      startDate: '2026-01-01', baseRate: 9.6, marginRate: 3.2,
      rateHistory: [
        { id: '1', effectiveDate: '', ratePercent: 13 },
        { id: '2', effectiveDate: '2026-07-01', ratePercent: 0 },
      ],
    });
    expect(t).toHaveLength(1);
  });

  it('không có ngày bắt đầu thì chỉ còn các mốc điều chỉnh', () => {
    const t = buildRateTimeline({
      preferentialRate: 9.5, preferentialPeriodMonths: 12,
      rateHistory: [{ id: '1', effectiveDate: '2026-07-01', ratePercent: 13.5 }],
    });
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe('adjustment');
  });

  it('kẹp về ngày cuối tháng đích khi hết ưu đãi', () => {
    const t = buildRateTimeline({
      startDate: '2026-08-31', preferentialRate: 9.5, preferentialPeriodMonths: 6,
      baseRate: 9.6, marginRate: 3.2,
    });
    expect(t[1].fromDate).toBe('2027-02-28');
  });
});

describe('resolveRateAt', () => {
  const t = buildRateTimeline({
    startDate: '2026-04-15', preferentialRate: 9.5, preferentialPeriodMonths: 12,
    baseRate: 9.6, marginRate: 3.2,
    rateHistory: [{ id: '1', effectiveDate: '2028-06-15', ratePercent: 13.5 }],
  });

  it('trong kỳ ưu đãi', () => {
    expect(resolveRateAt(t, '2027-04-14')?.ratePercent).toBe(9.5);
  });

  it('đúng ngày hết ưu đãi đã sang lãi thả nổi', () => {
    expect(resolveRateAt(t, '2027-04-15')?.ratePercent).toBe(12.8);
  });

  it('sau mốc điều chỉnh', () => {
    expect(resolveRateAt(t, '2028-06-15')?.ratePercent).toBe(13.5);
    expect(resolveRateAt(t, '2030-01-01')?.ratePercent).toBe(13.5);
  });

  it('trước ngày giải ngân thì lấy mốc đầu tiên', () => {
    expect(resolveRateAt(t, '2020-01-01')?.ratePercent).toBe(9.5);
  });

  it('dòng thời gian rỗng trả về null', () => {
    expect(resolveRateAt([], '2026-01-01')).toBeNull();
  });
});

describe('splitPeriodByRate — tách lãi theo số ngày trong kỳ', () => {
  const t = buildRateTimeline({
    startDate: '2026-04-15', preferentialRate: 9.5, preferentialPeriodMonths: 12,
    baseRate: 9.6, marginRate: 3.2,
  });

  it('kỳ không có mốc chuyển chỉ có một đoạn', () => {
    const s = splitPeriodByRate(t, '2026-05-15', '2026-06-15', 31);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ days: 31, ratePercent: 9.5 });
  });

  it('kỳ có mốc chuyển giữa kỳ tách thành hai đoạn', () => {
    const s = splitPeriodByRate(t, '2027-04-01', '2027-05-01', 30);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ fromDate: '2027-04-01', toDate: '2027-04-15', days: 14, ratePercent: 9.5 });
    expect(s[1]).toMatchObject({ fromDate: '2027-04-15', toDate: '2027-05-01', days: 16, ratePercent: 12.8 });
  });

  it('BẤT BIẾN: tổng số ngày các đoạn luôn bằng số ngày của kỳ', () => {
    const nhieuMoc = buildRateTimeline({
      startDate: '2026-01-01', baseRate: 9.0, marginRate: 3.0,
      rateHistory: [
        { id: '1', effectiveDate: '2026-03-05', ratePercent: 12.5 },
        { id: '2', effectiveDate: '2026-03-19', ratePercent: 13.0 },
        { id: '3', effectiveDate: '2026-03-27', ratePercent: 13.5 },
      ],
    });
    const s = splitPeriodByRate(nhieuMoc, '2026-03-01', '2026-04-01', 31);
    expect(s.reduce((x, y) => x + y.days, 0)).toBe(31);
    expect(s.map(x => x.ratePercent)).toEqual([12, 12.5, 13, 13.5]);
  });

  it('mốc rơi đúng đầu kỳ thì không tách, cả kỳ theo lãi mới', () => {
    const s = splitPeriodByRate(t, '2027-04-15', '2027-05-15', 30);
    expect(s).toHaveLength(1);
    expect(s[0].ratePercent).toBe(12.8);
  });

  it('mốc rơi đúng cuối kỳ thì thuộc kỳ sau', () => {
    const s = splitPeriodByRate(t, '2027-03-15', '2027-04-15', 31);
    expect(s).toHaveLength(1);
    expect(s[0].ratePercent).toBe(9.5);
  });

  it('số ngày bằng 0 vẫn trả về một đoạn để không mất kỳ', () => {
    const s = splitPeriodByRate(t, '2026-05-15', '2026-05-15', 0);
    expect(s).toHaveLength(1);
    expect(s[0].days).toBe(0);
  });
});

describe('weightedRatePercent và nhãn hiển thị', () => {
  it('lãi suất bình quân gia quyền theo số ngày', () => {
    const s = [
      { fromDate: 'a', toDate: 'b', days: 10, ratePercent: 12, kind: 'floating' as const, label: '', forecast: false },
      { fromDate: 'b', toDate: 'c', days: 20, ratePercent: 15, kind: 'adjustment' as const, label: '', forecast: false },
    ];
    expect(weightedRatePercent(s)).toBeCloseTo(14, 10);
  });

  it('nhãn ghép các mức lãi suất trong kỳ', () => {
    const s = [
      { fromDate: 'a', toDate: 'b', days: 14, ratePercent: 12.8, kind: 'preferential' as const, label: '', forecast: false },
      { fromDate: 'b', toDate: 'c', days: 16, ratePercent: 13.5, kind: 'adjustment' as const, label: '', forecast: false },
    ];
    expect(formatSegmentsLabel(s)).toBe('12,80% → 13,50%');
  });

  it('kỳ một mức chỉ hiện một số', () => {
    const s = [
      { fromDate: 'a', toDate: 'b', days: 31, ratePercent: 9.5, kind: 'preferential' as const, label: '', forecast: false },
    ];
    expect(formatSegmentsLabel(s)).toBe('9,50%');
  });
});

describe('buildContractRateTimeline — đọc từ hợp đồng', () => {
  const hd = (o: Partial<LoanContract>): LoanContract => ({
    Id: 1, CustomerId: 1, ContractNumber: 'HD01/GNN-01', ContractType: 0, ...o,
  } as LoanContract);

  it('lấy ngày giải ngân làm mốc và đọc bảng điều chỉnh trong Note', () => {
    const history = [{ id: '1', effectiveDate: '2028-06-15', ratePercent: 13.5 }];
    const t = buildContractRateTimeline(hd({
      DisbursementDate: '2026-04-15',
      PreferentialRate: 0.095,
      PreferentialPeriodMonths: 12,
      BaseRate: 0.096,
      MarginRate: 0.032,
      Note: `[RATE_HISTORY:${encodeURIComponent(JSON.stringify(history))}]`,
    }));

    expect(t).toHaveLength(3);
    expect(t[2]).toMatchObject({ fromDate: '2028-06-15', ratePercent: 13.5, kind: 'adjustment' });
  });

  it('không có hợp đồng trả về rỗng', () => {
    expect(buildContractRateTimeline(null)).toEqual([]);
  });
});

describe('biên độ âm — lãi sau ưu đãi thấp hơn lãi suất cơ sở', () => {
  it('trừ biên độ âm thay vì bỏ mất nó', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15',
      preferentialRate: 0.075,
      preferentialPeriodMonths: 6,
      baseRate: 0.099,
      marginRate: -0.005,
    }, { today: HOM_NAY });
    const thaNoi = tl.find(p => p.kind === 'floating');
    expect(thaNoi?.ratePercent).toBeCloseTo(9.4, 10);
  });

  it('nhận biên độ âm khai dạng phần trăm (trị tuyệt đối > 1)', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 9.9, marginRate: -1.5,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(8.4, 10);
  });

  it('biên độ 0 giữ nguyên lãi suất cơ sở', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.099, marginRate: 0,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(9.9, 10);
  });

  it('biên độ dương vẫn cộng như trước', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.099, marginRate: 0.035,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(13.4, 10);
  });
});

describe('sàn lãi suất', () => {
  it('chặn ở sàn khi cơ sở + biên độ tụt xuống dưới sàn', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.08, marginRate: -0.03, rateFloorAnnual: 0.06,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(6, 10);
  });

  it('không can thiệp khi lãi suất còn trên sàn', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.099, marginRate: -0.005, rateFloorAnnual: 0.06,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(9.4, 10);
  });

  it('không khai sàn thì vẫn không cho lãi suất xuống dưới 0', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.05, marginRate: -0.08,
    }, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBe(0);
  });

  it('áp sàn cho cả mốc điều chỉnh khai theo cơ sở + biên độ', () => {
    const tl = buildRateTimeline({
      startDate: '2026-01-15', baseRate: 0.099, marginRate: 0.035, rateFloorAnnual: 0.07,
      rateHistory: [
        { id: '1', effectiveDate: '2026-06-15', ratePercent: 0, baseRatePercent: 0.08, marginPercent: -0.03 },
      ],
    }, { today: HOM_NAY });
    const dieuChinh = tl.find(p => p.kind === 'adjustment');
    expect(dieuChinh?.ratePercent).toBeCloseTo(7, 10);
  });

  it('đọc sàn từ hợp đồng', () => {
    const hd = {
      Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 1,
      DisbursementDate: '2026-01-15', BaseRate: 0.08, MarginRate: -0.03, RateFloorAnnual: 0.065,
    } as LoanContract;
    const tl = buildContractRateTimeline(hd, { today: HOM_NAY });
    expect(tl[0].ratePercent).toBeCloseTo(6.5, 10);
  });
});

describe('getEffectiveActiveRate — cùng một nguồn với bảng lịch', () => {
  const kunn = {
    Id: 1,
    DisbursementDate: '2026-04-09',
    InterestRate: 0.1125,
    BaseRate: 0.072,
    MarginRate: 0.03,
  } as LoanContract;

  it('lấy đúng lãi suất mà bảng lịch đang áp, không lấy InterestRate rời', () => {
    expect(getEffectiveActiveRate(kunn, '2026-05-15')).toBeCloseTo(0.102, 10);
  });

  it('khớp từng kỳ với splitPeriodByRate — hai nơi không được lệch', () => {
    const timeline = buildContractRateTimeline(kunn, { today: '2026-08-05' });
    const seg = splitPeriodByRate(timeline, '2026-04-09', '2026-05-15', 36);
    expect(seg[0].ratePercent / 100).toBeCloseTo(getEffectiveActiveRate(kunn, '2026-05-15'), 10);
  });

  it('kỳ ưu đãi: trong kỳ lấy lãi ưu đãi, sau kỳ lấy thả nổi', () => {
    const uuDai = {
      ...kunn, PreferentialRate: 0.08, PreferentialPeriodMonths: 3,
    } as LoanContract;
    expect(getEffectiveActiveRate(uuDai, '2026-05-15')).toBeCloseTo(0.08, 10);
    expect(getEffectiveActiveRate(uuDai, '2026-09-15')).toBeCloseTo(0.102, 10);
  });

  it('mốc điều chỉnh ghi đè kể từ ngày hiệu lực', () => {
    const dieuChinh = {
      ...kunn,
      RateHistory: JSON.stringify([{ effectiveDate: '2026-06-01', ratePercent: 12.5 }]),
    } as unknown as LoanContract;
    expect(getEffectiveActiveRate(dieuChinh, '2026-05-15')).toBeCloseTo(0.102, 10);
    expect(getEffectiveActiveRate(dieuChinh, '2026-07-15')).toBeCloseTo(0.125, 10);
  });

  it('biên độ âm vẫn được trừ, không bị bỏ quên như bản cũ', () => {
    const bienAm = { ...kunn, MarginRate: -0.01 } as LoanContract;
    expect(getEffectiveActiveRate(bienAm, '2026-05-15')).toBeCloseTo(0.062, 10);
  });

  it('không khai gì thì về mặc định 8,5%', () => {
    expect(getEffectiveActiveRate({ Id: 1 } as LoanContract, '2026-05-15')).toBeCloseTo(0.085, 10);
    expect(getEffectiveActiveRate(null)).toBeCloseTo(0.085, 10);
  });
});

describe('getEffectiveActiveRate — bản gộp về dòng thời gian', () => {
  const lichSu = [
    { id: '1', effectiveDate: '2026-01-01', ratePercent: 8 },
    { id: '2', effectiveDate: '2026-06-01', ratePercent: 10 },
  ];

  it('lấy mốc lãi suất có hiệu lực tại thời điểm xét', () => {
    const c = { RateHistory: lichSu } as LoanContract;
    expect(getEffectiveActiveRate(c, '2026-03-15')).toBeCloseTo(0.08);
    expect(getEffectiveActiveRate(c, '2026-07-15')).toBeCloseTo(0.10);
  });

  it('dùng mốc sớm nhất khi thời điểm xét nằm trước mọi mốc', () => {
    const c = { RateHistory: lichSu } as LoanContract;
    expect(getEffectiveActiveRate(c, '2025-01-01')).toBeCloseTo(0.08);
  });

  it('quay về InterestRate khi không có lịch sử', () => {
    expect(getEffectiveActiveRate({ InterestRate: 0.095 } as LoanContract)).toBeCloseTo(0.095);
  });

  it('mặc định 8.5% khi không có thông tin nào', () => {
    expect(getEffectiveActiveRate({} as LoanContract)).toBeCloseTo(0.085);
    expect(getEffectiveActiveRate(null)).toBeCloseTo(0.085);
  });
});

describe('resolveRateModeOf — chế độ lãi suất phải suy lại từ hợp đồng', () => {
  it('khai lãi ưu đãi kèm số kỳ thì là chế độ ưu đãi', () => {
    expect(resolveRateModeOf({
      PreferentialRate: 0.102, PreferentialPeriodMonths: 24, BaseRate: 0.097,
    } as LoanContract)).toBe('pref');
  });

  it('chỉ khai lãi cơ sở thì là chế độ thả nổi', () => {
    expect(resolveRateModeOf({
      BaseRate: 0.097, MarginRate: 0.0135,
    } as LoanContract)).toBe('base');
  });

  it('khai lãi ưu đãi mà bỏ trống số kỳ thì không coi là ưu đãi', () => {
    expect(resolveRateModeOf({
      PreferentialRate: 0.102, PreferentialPeriodMonths: 0, BaseRate: 0.097,
    } as LoanContract)).toBe('base');
  });

  it('không khai gì thì mặc định ưu đãi, giữ nguyên hành vi form trống', () => {
    expect(resolveRateModeOf({} as LoanContract)).toBe('pref');
    expect(resolveRateModeOf(null)).toBe('pref');
  });
});

describe('buildRateFields — hai chế độ lãi suất loại trừ nhau', () => {
  const nhap = { prefPercent: 10.2, prefMonths: 24, basePercent: 9.7, marginPercent: 1.35, floorPercent: null };

  it('chế độ ưu đãi: KHÔNG lưu lãi cơ sở, thả nổi sau ưu đãi = ưu đãi + biên', () => {
    const r = buildRateFields('pref', nhap);
    expect(r.PreferentialRate).toBeCloseTo(0.102, 10);
    expect(r.PreferentialPeriodMonths).toBe(24);
    expect(r.PostPreferentialRate).toBeCloseTo(0.1155, 10);
    expect(r.BaseRate).toBeNull();
    expect(r.NormalRate).toBeNull();
    expect(r.MarginRate).toBeCloseTo(0.0135, 10);
  });

  it('chế độ thông thường: KHÔNG lưu lãi ưu đãi — chọn thông thường thì ưu đãi không tồn tại', () => {
    const r = buildRateFields('base', nhap);
    expect(r.PreferentialRate).toBeNull();
    expect(r.PreferentialPeriodMonths).toBeNull();
    expect(r.PostPreferentialRate).toBeNull();
    expect(r.BaseRate).toBeCloseTo(0.097, 10);
    expect(r.NormalRate).toBeCloseTo(0.1105, 10);
  });

  it('dòng thời gian của chế độ thông thường chỉ có một mức, không có đoạn ưu đãi', () => {
    const c = { DisbursementDate: '2026-04-09', ...buildRateFields('base', nhap) } as LoanContract;
    const timeline = buildContractRateTimeline(c, { today: '2026-08-05' });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].ratePercent).toBeCloseTo(11.05, 10);
    expect(getEffectiveActiveRate(c, '2026-05-15')).toBeCloseTo(0.1105, 10);
  });

  it('dòng thời gian của chế độ ưu đãi: ưu đãi rồi mới thả nổi đúng mức sau ưu đãi', () => {
    const c = { DisbursementDate: '2026-04-09', ...buildRateFields('pref', nhap) } as LoanContract;
    const timeline = buildContractRateTimeline(c, { today: '2026-08-05' });
    expect(timeline).toHaveLength(2);
    expect(timeline[0].ratePercent).toBeCloseTo(10.2, 10);
    expect(timeline[1].ratePercent).toBeCloseTo(11.55, 10);
    expect(getEffectiveActiveRate(c, '2026-05-15')).toBeCloseTo(0.102, 10);
    expect(getEffectiveActiveRate(c, '2028-06-15')).toBeCloseTo(0.1155, 10);
  });

  it('chế độ ưu đãi mà bỏ trống số kỳ thì không lưu ưu đãi, tránh tạo mâu thuẫn', () => {
    const r = buildRateFields('pref', { ...nhap, prefMonths: 0 });
    expect(r.PreferentialRate).toBeNull();
    expect(r.PreferentialPeriodMonths).toBeNull();
  });

  it('giữ sàn lãi suất khi có khai', () => {
    expect(buildRateFields('base', { ...nhap, floorPercent: 8 }).RateFloorAnnual).toBeCloseTo(0.08, 10);
    expect(buildRateFields('base', nhap).RateFloorAnnual).toBeNull();
  });
});
