import { describe, it, expect } from 'vitest';
import {
  findActiveProgram,
  isProgramExpired,
  resolvePostFixedRate,
  calcServiceFee,
  findPrepaymentFee,
  calcDepositInterest,
  collectQuoteWarnings,
  hasBlockingWarning,
  buildDepositRateRows,
  depositChannelsPresent,
  findOverlappingPrograms,
  checkProgramPeriod,
} from '../rateQuote';
import type { RateProgram, RateProgramTier, RateProgramPrepaymentFee } from '../rateQuote';

const shortTerm: RateProgram = {
  Id: 1,
  Kind: 'cho_vay_ngan_han',
  Name: 'Ngắn hạn KHCN',
  DocumentNumber: '2274/2026/TB-BĐH',
  DocumentDate: '2026-07-22',
  EffectiveFrom: '2026-07-22',
  EffectiveTo: '2026-09-30',
  QuotaVnd: 4_000_000_000_000,
  FloatingBaseLabel: 'LSCS',
  FloatingSpreadAnnual: 0.03,
  RateResetMonths: 3,
  MinFeeAmountVnd: 500_000,
  NewCustomerFeeDiscount: 0.5,
  CasaShortfallFeeAddon: 0.001,
  CasaMinRatio: 0.05,
  AllowRateReduction: false,
  AllowPrepayFeeWaive: false,
  SourceVerified: true,
};

const previous: RateProgram = {
  ...shortTerm,
  Id: 2,
  DocumentNumber: '1679/2026/TB-TGĐ',
  EffectiveFrom: '2026-06-19',
  EffectiveTo: '2026-07-27',
};

const unverifiedTdh: RateProgram = {
  ...shortTerm,
  Id: 3,
  Kind: 'cho_vay_trung_dai_han',
  DocumentNumber: 'TAM-TDH-2026',
  EffectiveFrom: '2026-07-22',
  EffectiveTo: null,
  SourceVerified: false,
  AllowRateReduction: true,
  AllowPrepayFeeWaive: true,
};

const lc2: RateProgramTier = {
  Id: 20, ProgramId: 1, PackageCode: 'LC2', Label: 'Cố định 05 tháng',
  FixedMonths: 5, MinTenorMonths: 5, MinFeeRatio: 0.0075,
  RateAnnual: 0.088, SortOrder: 2,
};

describe('findActiveProgram', () => {
  const all = [previous, shortTerm, unverifiedTdh];

  it('picks the program in force on the given date', () => {
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-08-01')?.DocumentNumber)
      .toBe('2274/2026/TB-BĐH');
  });

  it('prefers the newest EffectiveFrom when two programs overlap', () => {
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-07-25')?.DocumentNumber)
      .toBe('2274/2026/TB-BĐH');
  });

  it('falls back to the older program before the new one starts', () => {
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-07-01')?.DocumentNumber)
      .toBe('1679/2026/TB-TGĐ');
  });

  it('includes the boundary days', () => {
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-07-22')).not.toBeNull();
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-09-30')).not.toBeNull();
  });

  it('returns null after every program has lapsed', () => {
    expect(findActiveProgram(all, 'cho_vay_ngan_han', '2026-10-01')).toBeNull();
  });

  it('treats a null EffectiveTo as open-ended', () => {
    expect(findActiveProgram(all, 'cho_vay_trung_dai_han', '2030-01-01')?.DocumentNumber)
      .toBe('TAM-TDH-2026');
  });

  it('does not mix program kinds', () => {
    expect(findActiveProgram(all, 'huy_dong', '2026-08-01')).toBeNull();
  });

  it('is safe on empty input', () => {
    expect(findActiveProgram([], 'cho_vay_ngan_han', '2026-08-01')).toBeNull();
  });
});

describe('isProgramExpired', () => {
  it('reports expiry only after EffectiveTo', () => {
    expect(isProgramExpired(shortTerm, '2026-09-30')).toBe(false);
    expect(isProgramExpired(shortTerm, '2026-10-01')).toBe(true);
  });

  it('never expires an open-ended program', () => {
    expect(isProgramExpired(unverifiedTdh, '2099-01-01')).toBe(false);
  });
});

describe('resolvePostFixedRate', () => {
  it('adds the minimum spread to the base rate', () => {
    expect(resolvePostFixedRate(0.075, 0.03)).toBeCloseTo(0.105, 10);
  });

  it('returns null when the base rate is unknown', () => {
    expect(resolvePostFixedRate(null, 0.03)).toBeNull();
    expect(resolvePostFixedRate(undefined, 0.03)).toBeNull();
  });

  it('keeps a zero spread meaningful', () => {
    expect(resolvePostFixedRate(0.09, 0)).toBeCloseTo(0.09, 10);
  });
});

describe('calcServiceFee', () => {
  const base = {
    disbursementAmount: 1_000_000_000,
    feeRatio: 0.0075,
    minFeeAmountVnd: 500_000,
    casaMinRatio: 0.05,
    casaShortfallAddon: 0.001,
  };

  it('charges the tier ratio when CASA is sufficient', () => {
    const r = calcServiceFee({ ...base, casaAverage: 60_000_000 });
    expect(r.casaAddonApplied).toBe(false);
    expect(r.effectiveRatio).toBeCloseTo(0.0075, 10);
    expect(r.feeAmount).toBe(7_500_000);
  });

  it('adds 0,10% when average CASA falls below 5% of the disbursement', () => {
    const r = calcServiceFee({ ...base, casaAverage: 40_000_000 });
    expect(r.casaRequiredAmount).toBe(50_000_000);
    expect(r.casaAddonApplied).toBe(true);
    expect(r.effectiveRatio).toBeCloseTo(0.0085, 10);
    expect(r.feeAmount).toBe(8_500_000);
  });

  it('treats CASA exactly at the threshold as sufficient', () => {
    expect(calcServiceFee({ ...base, casaAverage: 50_000_000 }).casaAddonApplied).toBe(false);
  });

  it('treats zero CASA as a real shortfall, not as missing data', () => {
    const r = calcServiceFee({ ...base, casaAverage: 0 });
    expect(r.casaAddonApplied).toBe(true);
  });

  it('does not add the surcharge when CASA has not been supplied', () => {
    const r = calcServiceFee({ ...base });
    expect(r.casaAddonApplied).toBe(false);
  });

  it('discounts a new customer before adding the CASA surcharge', () => {
    const r = calcServiceFee({ ...base, casaAverage: 40_000_000, newCustomerDiscount: 0.5 });
    expect(r.effectiveRatio).toBeCloseTo(0.0075 * 0.5 + 0.001, 10);
    expect(r.feeAmount).toBe(4_750_000);
  });

  it('clamps the discount to the 0..1 range', () => {
    expect(calcServiceFee({ ...base, newCustomerDiscount: 2 }).effectiveRatio).toBe(0);
    expect(calcServiceFee({ ...base, newCustomerDiscount: -1 }).effectiveRatio).toBeCloseTo(0.0075, 10);
  });

  it('lifts a small fee up to the 500.000 đồng floor', () => {
    const r = calcServiceFee({ ...base, disbursementAmount: 50_000_000 });
    expect(r.feeFromRatio).toBe(375_000);
    expect(r.feeAmount).toBe(500_000);
    expect(r.minFeeApplied).toBe(true);
  });

  it('reports nulls when the tier has no fee ratio yet', () => {
    const r = calcServiceFee({ ...base, feeRatio: null });
    expect(r.effectiveRatio).toBeNull();
    expect(r.feeAmount).toBeNull();
  });

  it('keeps a zero fee ratio distinct from a missing one', () => {
    const r = calcServiceFee({ ...base, feeRatio: 0, minFeeAmountVnd: null });
    expect(r.effectiveRatio).toBe(0);
    expect(r.feeAmount).toBe(0);
  });
});

describe('findPrepaymentFee', () => {
  const fees: RateProgramPrepaymentFee[] = [
    { Id: 1, ProgramId: 3, YearFrom: 1, YearTo: 1, FeeRatio: 0.04 },
    { Id: 2, ProgramId: 3, YearFrom: 2, YearTo: 2, FeeRatio: 0.03 },
    { Id: 3, ProgramId: 3, YearFrom: 3, YearTo: 3, FeeRatio: null, Note: 'THIẾU SỐ' },
    { Id: 4, ProgramId: 3, YearFrom: 4, YearTo: 4, FeeRatio: 0.01 },
    { Id: 5, ProgramId: 3, YearFrom: 6, YearTo: null, FeeRatio: 0 },
  ];

  it('resolves a bounded year band', () => {
    expect(findPrepaymentFee(fees, 2)?.FeeRatio).toBe(0.03);
  });

  it('resolves the open-ended tail band', () => {
    expect(findPrepaymentFee(fees, 9)?.FeeRatio).toBe(0);
  });

  it('surfaces a known-missing figure as null rather than as free of charge', () => {
    const row = findPrepaymentFee(fees, 3);
    expect(row).not.toBeNull();
    expect(row!.FeeRatio).toBeNull();
  });

  it('distinguishes a genuine zero fee from a missing one', () => {
    expect(findPrepaymentFee(fees, 6)!.FeeRatio).toBe(0);
  });

  it('returns null for a year with no band', () => {
    expect(findPrepaymentFee(fees, 5)).toBeNull();
    expect(findPrepaymentFee(fees, 0)).toBeNull();
  });
});

describe('calcDepositInterest', () => {
  it('uses actual days over 365', () => {
    expect(calcDepositInterest(1_000_000_000, 0.089, 180))
      .toBe(Math.round(1_000_000_000 * 0.089 * 180 / 365));
  });

  it('returns null when the rate is unknown', () => {
    expect(calcDepositInterest(1_000_000_000, null, 180)).toBeNull();
  });

  it('is safe on zero inputs', () => {
    expect(calcDepositInterest(0, 0.089, 180)).toBe(0);
    expect(calcDepositInterest(1_000_000_000, 0.089, 0)).toBe(0);
  });
});

describe('collectQuoteWarnings', () => {
  it('blocks when no program is in force', () => {
    const w = collectQuoteWarnings({ program: null });
    expect(hasBlockingWarning(w)).toBe(true);
  });

  it('blocks a program whose figures are not verified against the notice', () => {
    const w = collectQuoteWarnings({ program: unverifiedTdh });
    expect(hasBlockingWarning(w)).toBe(true);
    expect(w.some(x => x.message.includes('chưa đối chiếu văn bản gốc'))).toBe(true);
  });

  it('blocks a tier that has no rate yet', () => {
    const w = collectQuoteWarnings({
      program: shortTerm,
      tier: { ...lc2, RateAnnual: null },
    });
    expect(hasBlockingWarning(w)).toBe(true);
  });

  it('warns that the programme forbids using rate-reduction authority', () => {
    const w = collectQuoteWarnings({ program: shortTerm, tier: lc2 });
    expect(hasBlockingWarning(w)).toBe(false);
    expect(w.some(x => x.message.includes('thẩm quyền giảm LSCV'))).toBe(true);
    expect(w.some(x => x.message.includes('phí trả nợ trước hạn'))).toBe(true);
  });

  it('warns when the tenor is under the tier minimum', () => {
    const w = collectQuoteWarnings({ program: shortTerm, tier: lc2, loanTenorMonths: 3 });
    expect(w.some(x => x.message.includes('thấp hơn mức tối thiểu'))).toBe(true);
  });

  it('does not warn when the tenor meets the minimum', () => {
    const w = collectQuoteWarnings({ program: shortTerm, tier: lc2, loanTenorMonths: 5 });
    expect(w.some(x => x.message.includes('thấp hơn mức tối thiểu'))).toBe(false);
  });

  it('blocks an expired program', () => {
    const w = collectQuoteWarnings({ program: shortTerm, tier: lc2, onDate: '2026-10-05' });
    expect(hasBlockingWarning(w)).toBe(true);
  });

  it('produces no blocking warning for a clean quote', () => {
    const w = collectQuoteWarnings({
      program: shortTerm, tier: lc2, onDate: '2026-08-01', loanTenorMonths: 6,
    });
    expect(hasBlockingWarning(w)).toBe(false);
  });
});

describe('buildDepositRateRows — gộp bảng huy động theo cột kênh', () => {
  const t = (o: Partial<RateProgramTier>): RateProgramTier => ({
    Id: 0, ProgramId: 1, Label: '', SortOrder: 0, ...o,
  } as RateProgramTier);

  it('cùng bậc số dư, kỳ hạn, cách trả lãi thì gộp một dòng hai cột', () => {
    const r = buildDepositRateRows([
      t({ Id: 1, Channel: 'quay', BalanceTierLabel: 'Dưới 1 tỷ', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 5.2, SortOrder: 1 }),
      t({ Id: 2, Channel: 'online', BalanceTierLabel: 'Dưới 1 tỷ', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 5.4, SortOrder: 1 }),
    ]);

    expect(r).toHaveLength(1);
    expect(r[0].byChannel).toEqual({ quay: 5.2, online: 5.4 });
    expect(r[0].tierIdByChannel).toEqual({ quay: 1, online: 2 });
  });

  it('kênh thiếu mức thì để TRỐNG, không suy ra 0', () => {
    const r = buildDepositRateRows([
      t({ Id: 1, Channel: 'quay', TenorMonths: 12, RateAnnual: 6.1, SortOrder: 1 }),
    ]);
    expect(r[0].byChannel.quay).toBe(6.1);
    expect(r[0].byChannel.online).toBeUndefined();
  });

  it('phân biệt NULL đã khai với chưa có kênh', () => {
    const r = buildDepositRateRows([
      t({ Id: 1, Channel: 'quay', TenorMonths: 12, RateAnnual: null, SortOrder: 1 }),
    ]);
    expect(r[0].byChannel.quay).toBeNull();
    expect('online' in r[0].byChannel).toBe(false);
  });

  it('kỳ hạn hoặc cách trả lãi khác nhau thì KHÔNG gộp', () => {
    const r = buildDepositRateRows([
      t({ Id: 1, Channel: 'quay', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 5, SortOrder: 1 }),
      t({ Id: 2, Channel: 'quay', TenorMonths: 12, PayoutMode: 'cuoi_ky', RateAnnual: 6, SortOrder: 2 }),
      t({ Id: 3, Channel: 'quay', TenorMonths: 12, PayoutMode: 'tra_truoc', RateAnnual: 5.9, SortOrder: 3 }),
    ]);
    expect(r).toHaveLength(3);
  });

  it('sắp theo SortOrder rồi tới kỳ hạn', () => {
    const r = buildDepositRateRows([
      t({ Id: 1, Channel: 'quay', TenorMonths: 12, RateAnnual: 6, SortOrder: 2 }),
      t({ Id: 2, Channel: 'quay', TenorMonths: 3, RateAnnual: 4, SortOrder: 1 }),
    ]);
    expect(r.map(x => x.tenorMonths)).toEqual([3, 12]);
  });

  it('depositChannelsPresent chỉ trả kênh có dữ liệu, đúng thứ tự', () => {
    expect(depositChannelsPresent([
      t({ Channel: 'online' }), t({ Channel: 'quay' }),
    ])).toEqual(['quay', 'online']);
    expect(depositChannelsPresent([t({ Channel: null })])).toEqual([]);
  });

  it('KHÔNG đưa FTP vào bảng gửi khách hàng', () => {
    expect(depositChannelsPresent([t({ Channel: 'ftp' })])).toEqual([]);
    expect(depositChannelsPresent([
      t({ Channel: 'quay' }), t({ Channel: 'ftp' }),
    ])).toEqual(['quay']);
  });
});

describe('checkProgramPeriod — chặn hai chương trình cùng loại chồng lấn ngày', () => {
  const pool = [shortTerm, previous, unverifiedTdh];

  it('khoảng ngày hợp lệ, không chồng lấn thì cho qua', () => {
    const r = checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-10-01', effectiveTo: '2026-12-31',
    });
    expect(r.ok).toBe(true);
    expect(r.message).toBe('');
  });

  it('thiếu ngày bắt đầu thì chặn', () => {
    expect(checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '', effectiveTo: '2026-12-31',
    }).ok).toBe(false);
  });

  it('ngày hết hiệu lực trước ngày bắt đầu thì chặn', () => {
    const r = checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-10-01', effectiveTo: '2026-09-30',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('trước ngày bắt đầu');
  });

  it('chồng lấn với chương trình cùng loại thì chặn và nêu số văn bản', () => {
    const r = checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-09-15', effectiveTo: '2026-12-31',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('2274/2026/TB-BĐH');
  });

  it('chồng lấn với chương trình KHÁC loại thì không sao', () => {
    const r = checkProgramPeriod(pool, {
      kind: 'huy_dong', effectiveFrom: '2026-07-22', effectiveTo: '2026-12-31',
    });
    expect(r.ok).toBe(true);
  });

  it('bỏ qua chính nó khi đang sửa ngày của chương trình đang có', () => {
    const period = {
      kind: 'cho_vay_ngan_han' as const,
      effectiveFrom: '2026-07-28',
      effectiveTo: '2026-12-31',
    };
    expect(checkProgramPeriod(pool, period).ok).toBe(false);
    expect(checkProgramPeriod(pool, { ...period, id: 1 }).ok).toBe(true);
  });

  it('kề nhau không tính là chồng lấn', () => {
    expect(checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-10-01', effectiveTo: null,
    }).ok).toBe(true);
    expect(checkProgramPeriod(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-09-30', effectiveTo: null,
    }).ok).toBe(false);
  });

  it('chương trình để ngỏ ngày kết thúc thì chặn mọi thứ sau nó', () => {
    const r = checkProgramPeriod(pool, {
      kind: 'cho_vay_trung_dai_han', effectiveFrom: '2030-01-01', effectiveTo: null,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('TAM-TDH-2026');
  });

  it('findOverlappingPrograms trả về đúng danh sách chương trình vướng', () => {
    const found = findOverlappingPrograms(pool, {
      kind: 'cho_vay_ngan_han', effectiveFrom: '2026-06-01', effectiveTo: '2026-12-31',
    });
    expect(found.map(p => p.Id).sort()).toEqual([1, 2]);
  });
});
