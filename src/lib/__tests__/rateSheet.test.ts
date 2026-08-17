import { describe, it, expect } from 'vitest';
import {
  formatRateForCustomer, formatMoneyForCustomer, formatDateForCustomer,
  prepaymentYearLabel, prepaymentFeeLabel, findRateSheetBlockers, buildRateSheetHtml,
  pivotFeeOptions, buildDepositMatrix, rateSheetFileBase, customerSegmentOf,
} from '../rateSheet';
import type { RateProgram, RateProgramTier, RateProgramPrepaymentFee } from '../rateQuote';

const tdh: RateProgram = {
  Id: 3,
  Kind: 'cho_vay_trung_dai_han',
  Name: 'Chương trình lãi suất cho vay trung dài hạn dành cho KHCN',
  DocumentNumber: '1680/2026/TB-TGĐ',
  DocumentDate: '2026-06-19',
  EffectiveFrom: '2026-06-19',
  EffectiveTo: '2026-12-31',
  QuotaVnd: 1_000_000_000_000,
  FloatingBaseLabel: 'LSCS',
  FloatingSpreadAnnual: 0.0375,
  RateResetMonths: null,
  MinFeeAmountVnd: 500_000,
  AllowRateReduction: true,
  AllowPrepayFeeWaive: true,
  SourceVerified: true,
};

const tdhTiers: RateProgramTier[] = [
  { Id: 1, ProgramId: 3, Label: 'Cố định 03 tháng', FixedMonths: 3, MinTenorMonths: 60, RateAnnual: 0, SortOrder: 1 },
  { Id: 2, ProgramId: 3, Label: 'Cố định 06 tháng', FixedMonths: 6, MinTenorMonths: 60, RateAnnual: 0.085, SortOrder: 2 },
  { Id: 3, ProgramId: 3, Label: 'Cố định 12 tháng', FixedMonths: 12, MinTenorMonths: 60, RateAnnual: 0.095, SortOrder: 3 },
  { Id: 4, ProgramId: 3, Label: 'Cố định 24 tháng', FixedMonths: 24, MinTenorMonths: 60, RateAnnual: 0.105, SortOrder: 4 },
];

const tdhFees: RateProgramPrepaymentFee[] = [
  { Id: 1, ProgramId: 3, YearFrom: 1, YearTo: 1, FeeRatio: 0.04 },
  { Id: 2, ProgramId: 3, YearFrom: 2, YearTo: 2, FeeRatio: 0.03 },
  { Id: 3, ProgramId: 3, YearFrom: 3, YearTo: 3, FeeRatio: 0.02 },
  { Id: 4, ProgramId: 3, YearFrom: 4, YearTo: 4, FeeRatio: 0.01 },
  { Id: 5, ProgramId: 3, YearFrom: 5, YearTo: 5, FeeRatio: 0.005 },
  { Id: 6, ProgramId: 3, YearFrom: 6, YearTo: null, FeeRatio: 0 },
];

describe('formatRateForCustomer', () => {
  it('shows a genuine 0% rate rather than a dash', () => {
    expect(formatRateForCustomer(0)).toBe('0%');
  });

  it('uses a comma as the decimal separator', () => {
    expect(formatRateForCustomer(0.085)).toBe('8,5%');
    expect(formatRateForCustomer(0.0845)).toBe('8,45%');
    expect(formatRateForCustomer(0.117)).toBe('11,7%');
  });

  it('drops trailing zeros', () => {
    expect(formatRateForCustomer(0.105)).toBe('10,5%');
    expect(formatRateForCustomer(0.1)).toBe('10%');
  });

  it('shows a dash only when the rate is genuinely unknown', () => {
    expect(formatRateForCustomer(null)).toBe('—');
    expect(formatRateForCustomer(undefined)).toBe('—');
  });
});

describe('formatMoneyForCustomer', () => {
  it('reads large programme quotas in tỷ', () => {
    expect(formatMoneyForCustomer(1_000_000_000_000)).toBe('1 nghìn tỷ đồng');
    expect(formatMoneyForCustomer(4_000_000_000_000)).toBe('4 nghìn tỷ đồng');
    expect(formatMoneyForCustomer(500_000_000_000)).toBe('500 tỷ đồng');
  });

  it('falls back to plain đồng for small amounts', () => {
    expect(formatMoneyForCustomer(500_000)).toBe('500.000 đồng');
  });
});

describe('formatDateForCustomer', () => {
  it('renders d/m/yyyy without leading zeros', () => {
    expect(formatDateForCustomer('2026-06-19')).toBe('19/6/2026');
    expect(formatDateForCustomer('2026-12-31')).toBe('31/12/2026');
  });

  it('is safe on empty input', () => {
    expect(formatDateForCustomer(null)).toBe('—');
  });
});

describe('prepayment labels', () => {
  it('labels bounded and open-ended bands', () => {
    expect(prepaymentYearLabel(tdhFees[0])).toBe('Năm 1');
    expect(prepaymentYearLabel(tdhFees[5])).toBe('Từ năm thứ 6');
  });

  it('renders a zero fee as miễn phí', () => {
    expect(prepaymentFeeLabel(tdhFees[5])).toBe('Miễn phí');
  });

  it('renders a real fee as a percentage', () => {
    expect(prepaymentFeeLabel(tdhFees[2])).toBe('2%');
  });

  it('renders a missing fee as a dash', () => {
    expect(prepaymentFeeLabel({ ...tdhFees[2], FeeRatio: null })).toBe('—');
  });
});

describe('findRateSheetBlockers', () => {
  it('passes a fully verified programme', () => {
    expect(findRateSheetBlockers({
      program: tdh, tiers: tdhTiers, prepaymentFees: tdhFees,
    })).toEqual([]);
  });

  it('accepts a 0% tier as a real figure, not a gap', () => {
    const blockers = findRateSheetBlockers({ program: tdh, tiers: tdhTiers });
    expect(blockers).toEqual([]);
  });

  it('blocks an unverified programme', () => {
    const blockers = findRateSheetBlockers({
      program: { ...tdh, SourceVerified: false }, tiers: tdhTiers,
    });
    expect(blockers.some(b => b.message.includes('chưa đối chiếu văn bản gốc'))).toBe(true);
  });

  it('blocks a tier with no rate', () => {
    const blockers = findRateSheetBlockers({
      program: tdh,
      tiers: [...tdhTiers, { ...tdhTiers[0], Id: 99, Label: 'Gói thiếu số', RateAnnual: null }],
    });
    expect(blockers.some(b => b.message.includes('Gói thiếu số'))).toBe(true);
  });

  it('blocks a prepayment band with no figure', () => {
    const blockers = findRateSheetBlockers({
      program: tdh, tiers: tdhTiers,
      prepaymentFees: [...tdhFees.slice(0, 2), { ...tdhFees[2], FeeRatio: null }],
    });
    expect(blockers.some(b => b.message.includes('Năm 3'))).toBe(true);
  });

  it('blocks an empty programme', () => {
    expect(findRateSheetBlockers({ program: tdh, tiers: [] }).length).toBeGreaterThan(0);
  });

  it('only inspects the selected channel for a deposit programme', () => {
    const deposit: RateProgram = { ...tdh, Kind: 'huy_dong' };
    const tiers: RateProgramTier[] = [
      { Id: 1, ProgramId: 3, Label: 'Quầy 6 tháng', Channel: 'quay', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 0.089, SortOrder: 1 },
      { Id: 2, ProgramId: 3, Label: 'FTP 6 tháng', Channel: 'ftp', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: null, SortOrder: 2 },
    ];
    expect(findRateSheetBlockers({ program: deposit, tiers, channel: 'quay' })).toEqual([]);
    expect(findRateSheetBlockers({ program: deposit, tiers, channel: 'ftp' }).length).toBeGreaterThan(0);
  });
});

describe('rateSheetFileBase', () => {
  it('đặt tên theo loại chương trình và nhóm khách hàng', () => {
    expect(rateSheetFileBase({ ...tdh, Kind: 'cho_vay_ngan_han' })).toBe('LS NGAN HAN KHCN');
    expect(rateSheetFileBase(tdh)).toBe('LS TDH KHCN');
    expect(rateSheetFileBase({ ...tdh, Kind: 'huy_dong' })).toBe('LS HUY DONG');
  });

  it('tờ huy động không gắn nhóm khách hàng', () => {
    expect(rateSheetFileBase({ ...tdh, Kind: 'huy_dong', Name: 'Ưu đãi huy động KHCN' }))
      .toBe('LS HUY DONG');
  });

  it('nhận ra khách hàng doanh nghiệp để dùng cho chương trình sau này', () => {
    expect(rateSheetFileBase({ ...tdh, Kind: 'cho_vay_ngan_han', Name: 'LSCV ngắn hạn dành cho KHDN' }))
      .toBe('LS NGAN HAN KHDN');
    expect(rateSheetFileBase({ ...tdh, TargetText: 'Khách hàng doanh nghiệp' }))
      .toBe('LS TDH KHDN');
  });

  it('mặc định là KHCN khi chương trình không nói gì', () => {
    expect(customerSegmentOf({ Name: 'Chương trình lãi suất', TargetText: null } as any)).toBe('KHCN');
  });

  it('tên file đi vào tiêu đề tài liệu để hộp thoại in gợi ý đúng tên', () => {
    const html = buildRateSheetHtml({ program: tdh, tiers: tdhTiers, prepaymentFees: tdhFees });
    expect(html).toContain('<title>LS TDH KHCN</title>');
  });
});

describe('buildRateSheetHtml', () => {
  const html = buildRateSheetHtml({
    program: tdh,
    tiers: tdhTiers,
    prepaymentFees: tdhFees,
    conditions: [
      { Id: 1, ProgramId: 3, Heading: 'Khách hàng phát hành thẻ mới', Content: 'Doanh số tối thiểu 3 triệu đồng.', SortOrder: 1 },
    ],
    feeOptions: [
      { Id: 1, ProgramId: 3, OptionLabel: 'Phương án 1', PackageGroup: 'Gói 24 tháng đầu', MinFeeRatio: 0.015, CounterFeeRatio: 0.01, Note: 'Tại quầy tối thiểu 1%.', SortOrder: 1 },
    ],
    preparedBy: 'Nguyễn Văn A',
  });

  it('không lặp lại đối tượng khách hàng dưới tiêu đề lớn', () => {
    expect(html).not.toContain('class="sub"');
    expect(html).not.toContain('Dành cho Khách hàng cá nhân');
  });

  it('tờ cho vay bỏ hẳn khối phạm vi áp dụng', () => {
    const coScope = buildRateSheetHtml({
      program: { ...tdh, ScopeText: 'Cho vay trung dài hạn. Hết hiệu lực khi hết hạn mức.' },
      tiers: tdhTiers, prepaymentFees: tdhFees,
    });
    expect(coScope).not.toContain('Phạm vi áp dụng');
    expect(coScope).not.toContain('Hết hiệu lực khi hết hạn mức');
  });

  it('is a self-contained printable document sized for A4', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page { size: A4 portrait');
    expect(html).not.toContain('<script');
  });

  it('carries every published rate, including the 0% package', () => {
    expect(html).toContain('Cố định 03 tháng');
    expect(html).toContain('>0%<');
    expect(html).toContain('8,5%');
    expect(html).toContain('9,5%');
    expect(html).toContain('10,5%');
  });

  it('keeps internal-only facts off the customer sheet', () => {
    expect(html).not.toContain('1 nghìn tỷ đồng');
    expect(html).not.toContain('Hạn mức chương trình');
    expect(html).not.toContain('1680/2026/TB-TGĐ');
    expect(html).not.toContain('Thời gian triển khai');
  });

  it('carries no issue date or reference disclaimer', () => {
    expect(html).not.toContain('Ngày lập');
    expect(html).not.toContain('mang tính tham khảo');
  });

  it('states the floating rate after the fixed period', () => {
    expect(html).toContain('3,75%');
    expect(html).toContain('LSCS');
  });

  it('includes the prepayment fee band, conditions and fee options', () => {
    expect(html).toContain('Năm 3');
    expect(html).toContain('2%');
    expect(html).toContain('Miễn phí');
    expect(html).toContain('Khách hàng phát hành thẻ mới');
    expect(html).toContain('Phương án 1');
  });

  it('names the adviser', () => {
    expect(html).toContain('Nguyễn Văn A');
  });

  it('bỏ tick thì file không còn bảng phí, tiêu đề phí hay dòng chú thích nào', () => {
    const khongKemPhi = buildRateSheetHtml({
      program: tdh,
      tiers: tdhTiers,
      prepaymentFees: tdhFees,
      feeOptions: [
        { Id: 1, ProgramId: 3, OptionLabel: 'Phương án 1', PackageGroup: 'Gói 24 tháng đầu', MinFeeRatio: 0.015, CounterFeeRatio: 0.01, Note: 'Tại quầy tối thiểu 1%.', SortOrder: 1 },
        { Id: 2, ProgramId: 3, OptionLabel: 'Phương án 2', PackageGroup: 'Gói 24 tháng đầu', MinFeeRatio: 0.02, CounterFeeRatio: null, Note: null, SortOrder: 2 },
      ],
      includeFees: false,
    });
    expect(khongKemPhi).not.toContain('Phương án 1');
    expect(khongKemPhi).not.toContain('Phí dịch vụ');
    expect(khongKemPhi).not.toContain('phí dịch vụ');
    expect(khongKemPhi).not.toContain('Doanh thu phí');
  });

  it('bỏ tick vẫn giữ nguyên lãi suất, phí trả nợ trước hạn và điều kiện', () => {
    const khongKemPhi = buildRateSheetHtml({
      program: tdh, tiers: tdhTiers, prepaymentFees: tdhFees,
      conditions: [{ Id: 1, ProgramId: 3, Heading: 'Khách hàng phát hành thẻ mới', Content: 'Doanh số tối thiểu 3 triệu đồng.', SortOrder: 1 }],
      includeFees: false,
    });
    expect(khongKemPhi).toContain('8,5%');
    expect(khongKemPhi).toContain('Năm 3');
    expect(khongKemPhi).toContain('Khách hàng phát hành thẻ mới');
  });

  it('mặc định vẫn kèm bảng phí như trước', () => {
    expect(html).toContain('Phương án 1');
    expect(html).toContain('khách hàng chọn 1 trong 2 phương án');
  });

  it('prints backgrounds, otherwise the blue banner turns white on white', () => {
    expect(html).toContain('print-color-adjust: exact');
  });

  it('shows the wordmark when no logo is supplied', () => {
    expect(html).toContain('class="bank"');
    expect(html).not.toContain('<img');
  });

  it('swaps the wordmark for the logo when one is supplied', () => {
    const withLogo = buildRateSheetHtml({
      program: tdh, tiers: tdhTiers,
      logoDataUri: 'data:image/png;base64,AAAA',
    });
    expect(withLogo).toContain('<img src="data:image/png;base64,AAAA"');
    expect(withLogo).not.toContain('class="bank"');
  });

  it('escapes markup coming from the database', () => {
    const nasty = buildRateSheetHtml({
      program: { ...tdh, Name: 'Gói <script>alert(1)</script>' },
      tiers: tdhTiers,
    });
    expect(nasty).not.toContain('<script>alert(1)</script>');
    expect(nasty).toContain('&lt;script&gt;');
  });

  it('renders a deposit programme by channel instead of the lending table', () => {
    const deposit = buildRateSheetHtml({
      program: { ...tdh, Kind: 'huy_dong', Name: 'Lãi suất tiền gửi' },
      tiers: [
        { Id: 1, ProgramId: 3, Label: 'Quầy', Channel: 'quay', BalanceTierLabel: 'Số dư < 500 triệu đồng', TenorMonths: 6, PayoutMode: 'hang_thang', RateAnnual: 0.0874, SortOrder: 1 },
      ],
      channel: 'quay',
    });
    expect(deposit).toContain('Tại quầy');
    expect(deposit).toContain('Lãi hàng tháng');
    expect(deposit).toContain('8,74%');
    expect(deposit).not.toContain('Lãi suất cho vay');
  });
});

describe('pivotFeeOptions', () => {
  const options = [
    { Id: 1, ProgramId: 3, OptionLabel: 'Phương án 1', PackageGroup: 'Gói 24 tháng đầu', MinFeeRatio: 0.015, CounterFeeRatio: 0.01, Note: null, SortOrder: 1 },
    { Id: 2, ProgramId: 3, OptionLabel: 'Phương án 1', PackageGroup: 'Các gói còn lại', MinFeeRatio: 0.01, CounterFeeRatio: 0.005, Note: null, SortOrder: 2 },
    { Id: 3, ProgramId: 3, OptionLabel: 'Phương án 2', PackageGroup: 'Gói 24 tháng đầu', MinFeeRatio: 0.0175, CounterFeeRatio: null, Note: null, SortOrder: 3 },
    { Id: 4, ProgramId: 3, OptionLabel: 'Phương án 2', PackageGroup: 'Các gói còn lại', MinFeeRatio: 0.0125, CounterFeeRatio: null, Note: null, SortOrder: 4 },
  ];

  it('puts each phương án in its own column and each nhóm gói on its own row', () => {
    const { optionLabels, groups } = pivotFeeOptions(options);
    expect(optionLabels).toEqual(['Phương án 1', 'Phương án 2']);
    expect(groups.map(g => g.group)).toEqual(['Gói 24 tháng đầu', 'Các gói còn lại']);
    expect(groups[0].cells.map(c => c!.MinFeeRatio)).toEqual([0.015, 0.0175]);
    expect(groups[1].cells.map(c => c!.MinFeeRatio)).toEqual([0.01, 0.0125]);
  });

  it('leaves a hole when a combination is not published', () => {
    const { groups } = pivotFeeOptions(options.slice(0, 3));
    expect(groups[1].cells[1]).toBeNull();
  });

  it('is safe on empty input', () => {
    expect(pivotFeeOptions([])).toEqual({ optionLabels: [], groups: [] });
  });
});

describe('phí trả nợ trước hạn phân theo loại khoản vay', () => {
  const nh: RateProgram = { ...tdh, Kind: 'cho_vay_ngan_han', DocumentNumber: '2274/2026/TB-BĐH' };
  const byType: RateProgramPrepaymentFee[] = [
    { Id: 1, ProgramId: 1, YearFrom: 1, YearTo: null, FeeRatio: 0, AppliesTo: 'Vay theo hạn mức tín dụng' },
    { Id: 2, ProgramId: 1, YearFrom: 1, YearTo: null, FeeRatio: 0.005, AppliesTo: 'Vay từng lần',
      Note: 'Miễn phí nếu trả trong vòng 10 ngày trước thời điểm kết thúc khoản vay.' },
  ];

  it('gives each loan type its own row with its own figure', () => {
    const html = buildRateSheetHtml({ program: nh, tiers: tdhTiers, prepaymentFees: byType });
    expect(html).toContain('Loại khoản vay');
    expect(html).toContain('Vay theo hạn mức tín dụng');
    expect(html).toContain('Miễn phí');
    expect(html).toContain('Vay từng lần');
    expect(html).toContain('0,5%');
    expect(html).not.toContain('Thời điểm');
  });

  it('does not shrink the accompanying note into fine print', () => {
    const html = buildRateSheetHtml({ program: nh, tiers: tdhTiers, prepaymentFees: byType });
    expect(html).toContain('<p>Miễn phí nếu trả trong vòng 10 ngày');
  });

  it('still lays the trung dài hạn programme out by year', () => {
    const html = buildRateSheetHtml({ program: tdh, tiers: tdhTiers, prepaymentFees: tdhFees });
    expect(html).toContain('Thời điểm');
    expect(html).toContain('Năm 3');
    expect(html).not.toContain('Loại khoản vay');
  });
});

describe('buildDepositMatrix', () => {
  const quay: RateProgramTier[] = [];
  let id = 1;
  const TIERS = ['Số dư < 500 triệu đồng', 'Số dư ≥ 1 tỷ đồng'];
  const RATES: Record<string, Record<number, Record<string, number>>> = {
    'Số dư < 500 triệu đồng': {
      6: { cuoi_ky: 0.089, hang_thang: 0.0874, hang_quy: 0.088, tra_truoc: 0.0852 },
      12: { cuoi_ky: 0.089, hang_thang: 0.0856, hang_quy: 0.0862, tra_truoc: 0.0817 },
    },
    'Số dư ≥ 1 tỷ đồng': {
      6: { cuoi_ky: 0.089, hang_thang: 0.0895, hang_quy: 0.0895, tra_truoc: 0.087 },
      12: { cuoi_ky: 0.089, hang_thang: 0.0874, hang_quy: 0.088, tra_truoc: 0.0834 },
    },
  };
  for (const tier of TIERS) {
    for (const tenor of [6, 12]) {
      for (const mode of ['cuoi_ky', 'hang_thang', 'hang_quy', 'tra_truoc'] as const) {
        quay.push({
          Id: id++, ProgramId: 1, Label: `${tier} ${tenor} ${mode}`,
          Channel: 'quay', BalanceTierLabel: tier, PayoutMode: mode,
          TenorMonths: tenor, RateAnnual: RATES[tier][tenor][mode], SortOrder: id,
        });
      }
    }
  }

  it('lays the notice out as điều kiện × kỳ hạn × cách trả lãi', () => {
    const m = buildDepositMatrix(quay, 'quay');
    expect(m.tenors).toEqual([6, 12]);
    expect(m.payoutModes).toEqual(['cuoi_ky', 'hang_thang', 'hang_quy', 'tra_truoc']);
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0].cells).toHaveLength(8);
  });

  it('keeps each rate in the right cell', () => {
    const m = buildDepositMatrix(quay, 'quay');
    expect(m.rows[0].cells[0]).toBe(0.089);
    expect(m.rows[0].cells[3]).toBe(0.0852);
    expect(m.rows[0].cells[7]).toBe(0.0817);
    expect(m.rows[1].cells[1]).toBe(0.0895);
  });

  it('preserves the order the tiers were published in', () => {
    const m = buildDepositMatrix(quay, 'quay');
    expect(m.rows.map(r => r.balanceTier)).toEqual(TIERS);
  });

  it('leaves a hole where the notice publishes no rate', () => {
    const partial = quay.filter(t => !(t.TenorMonths === 12 && t.PayoutMode === 'tra_truoc'));
    const m = buildDepositMatrix(partial, 'quay');
    expect(m.rows[0].cells[7]).toBeNull();
  });

  it('ignores other channels', () => {
    const mixed = [...quay, {
      Id: 99, ProgramId: 1, Label: 'Online 6 tháng', Channel: 'online' as const,
      TenorMonths: 6, RateAnnual: 0.088, SortOrder: 99,
    }];
    expect(buildDepositMatrix(mixed, 'quay').rows).toHaveLength(2);
    expect(buildDepositMatrix(mixed, 'online').rows).toHaveLength(1);
  });

  it('is safe on empty input', () => {
    expect(buildDepositMatrix([], 'quay')).toEqual({ tenors: [], payoutModes: [], rows: [] });
  });

  it('renders a matrix with merged tenor headers', () => {
    const html = buildRateSheetHtml({
      program: { ...tdh, Kind: 'huy_dong', Name: 'Lãi suất tiền gửi' },
      tiers: quay, channel: 'quay',
    });
    expect(html).toContain('colspan="4"');
    expect(html).toContain('rowspan="2"');
    expect(html).toContain('Kỳ hạn 06 tháng');
    expect(html).toContain('Kỳ hạn 12 tháng');
    expect(html).toContain('8,17%');
  });

  it('in khổ ngang vì ma trận kỳ hạn × hình thức trả lãi rộng hơn khổ dọc', () => {
    const html = buildRateSheetHtml({
      program: { ...tdh, Kind: 'huy_dong', Name: 'Lãi suất tiền gửi' },
      tiers: quay, channel: 'quay',
    });
    expect(html).toContain('@page { size: A4 landscape');
    expect(html).not.toContain('A4 portrait');
  });

  it('bảng lãi suất cho vay vẫn giữ khổ dọc', () => {
    const html = buildRateSheetHtml({ program: tdh, tiers: [] });
    expect(html).toContain('@page { size: A4 portrait');
    expect(html).not.toContain('A4 landscape');
  });

  it('falls back to a simple two-column table for the online channel', () => {
    const html = buildRateSheetHtml({
      program: { ...tdh, Kind: 'huy_dong', Name: 'Lãi suất tiền gửi' },
      tiers: [{ Id: 1, ProgramId: 1, Label: 'Online 6 tháng', Channel: 'online', TenorMonths: 6, RateAnnual: 0.088, SortOrder: 1 }],
      channel: 'online',
    });
    expect(html).toContain('Kỳ hạn 6 tháng');
    expect(html).toContain('8,8%');
    expect(html).not.toContain('colspan');
  });
});

describe('tờ gửi khách không được chứa số liệu nội bộ', () => {
  const ct = (o: Partial<RateProgram>): RateProgram => ({
    Id: 1, Kind: 'huy_dong', Name: 'Ưu đãi huy động', DocumentNumber: '2279/2026/TB-BĐH',
    EffectiveFrom: '2026-07-23', AllowRateReduction: false, AllowPrepayFeeWaive: false,
    SourceVerified: true, ...o,
  } as RateProgram);

  const bac = (o: Partial<RateProgramTier>): RateProgramTier => ({
    Id: 0, ProgramId: 1, Label: '', SortOrder: 0, ...o,
  } as RateProgramTier);

  const tiers = [
    bac({ Id: 1, Channel: 'quay', BalanceTierLabel: 'Số dư < 500 triệu', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 0.089, SortOrder: 1 }),
    bac({ Id: 2, Channel: 'online', TenorMonths: 6, RateAnnual: 0.088, SortOrder: 2 }),
    bac({ Id: 3, Channel: 'ftp', TenorMonths: 6, RateAnnual: 0.094, SortOrder: 3 }),
  ];

  const dungTo = (channel?: 'quay' | 'online' | 'ftp' | null) => buildRateSheetHtml({
    program: ct({}), tiers, prepaymentFees: [], feeOptions: [], conditions: [],
    channel: channel ?? null,
  } as any);

  it('KHÔNG in bảng FTP mua vốn nội bộ', () => {
    const html = dungTo();
    expect(html).toContain('8,9%');
    expect(html).not.toContain('9,4%');
    expect(html.toLowerCase()).not.toContain('ftp');
  });

  it('vẫn in đủ tại quầy và online', () => {
    const html = dungTo();
    expect(html).toContain('8,8%');
  });

  it('chỉ định riêng kênh ftp cũng không in ra gì', () => {
    const html = dungTo('ftp');
    expect(html.toLowerCase()).not.toContain('ftp');
    expect(html).not.toContain('9,4%');
  });

  it('tờ huy động giữ phạm vi áp dụng, nhưng không lặp lại dòng đối tượng dưới tiêu đề', () => {
    const html = buildRateSheetHtml({
      program: ct({ TargetText: 'Khách hàng cá nhân mở tiết kiệm mới.', ScopeText: 'Tiết kiệm truyền thống và online có kỳ hạn.' }),
      tiers, prepaymentFees: [], feeOptions: [], conditions: [], channel: null,
    } as any);
    expect(html).toContain('Phạm vi áp dụng');
    expect(html).toContain('Tiết kiệm truyền thống và online có kỳ hạn.');
    expect(html).not.toContain('Khách hàng cá nhân mở tiết kiệm mới.');
    expect(html).not.toContain('class="sub"');
  });
});

describe('bảng FTP mua (VOF) — chỉ in khi được tick', () => {
  const ct: RateProgram = {
    Id: 1, Kind: 'huy_dong', Name: 'Ưu đãi huy động', DocumentNumber: '2500/2026/TB-BĐH',
    EffectiveFrom: '2026-08-17', AllowRateReduction: false, AllowPrepayFeeWaive: false,
    SourceVerified: true,
  } as RateProgram;

  const bac = (o: Partial<RateProgramTier>): RateProgramTier => ({
    Id: 0, ProgramId: 1, Label: '', SortOrder: 0, ...o,
  } as RateProgramTier);

  const tiers = [
    bac({ Id: 1, Channel: 'quay', BalanceTierLabel: 'Số dư < 200 triệu đồng', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 0.09, SortOrder: 1 }),
    bac({ Id: 2, Channel: 'online', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 0.0895, SortOrder: 2 }),
    bac({ Id: 3, Channel: 'ftp', TenorMonths: 6, PayoutMode: 'cuoi_ky', RateAnnual: 0.095, SortOrder: 3 }),
    bac({ Id: 4, Channel: 'ftp', TenorMonths: 6, PayoutMode: 'hang_quy', RateAnnual: 0.0939, SortOrder: 4 }),
    bac({ Id: 5, Channel: 'ftp', TenorMonths: 12, PayoutMode: 'cuoi_ky', RateAnnual: 0.095, SortOrder: 5 }),
    bac({ Id: 6, Channel: 'ftp', TenorMonths: 12, PayoutMode: 'hang_quy', RateAnnual: 0.0918, SortOrder: 6 }),
  ];

  const dungTo = (includeFtp?: boolean) => buildRateSheetHtml({
    program: ct, tiers, prepaymentFees: [], feeOptions: [], conditions: [],
    channel: null, includeFtp,
  } as any);

  it('mặc định KHÔNG in — giữ nguyên hành vi cũ', () => {
    const html = dungTo();
    expect(html.toLowerCase()).not.toContain('ftp');
    expect(html).not.toContain('9,39%');
  });

  it('tick rồi thì in bảng FTP với đủ kỳ hạn và cách trả lãi', () => {
    const html = dungTo(true);
    expect(html).toContain('FTP mua (VOF)');
    expect(html).toContain('9,5%');
    expect(html).toContain('9,39%');
    expect(html).toContain('9,18%');
    expect(html).toContain('Lãi cuối kỳ');
    expect(html).toContain('Lãi hàng quý');
  });

  it('bảng FTP không kèm dòng đơn vị tính', () => {
    const html = dungTo(true);
    const sau = html.slice(html.indexOf('FTP mua (VOF)'));
    expect(sau).not.toContain('Đơn vị tính');
  });

  it('vẫn in đủ bảng tại quầy và online khi có FTP', () => {
    const html = dungTo(true);
    expect(html).toContain('9%');
    expect(html).toContain('8,95%');
  });

  it('chương trình không có dòng FTP thì tick cũng không sinh bảng rỗng', () => {
    const html = buildRateSheetHtml({
      program: ct,
      tiers: tiers.filter(t => t.Channel !== 'ftp'),
      prepaymentFees: [], feeOptions: [], conditions: [], channel: null, includeFtp: true,
    } as any);
    expect(html.toLowerCase()).not.toContain('ftp');
  });

  it('tờ cho vay không đụng tới lựa chọn này', () => {
    const html = buildRateSheetHtml({
      program: tdh, tiers: tdhTiers, prepaymentFees: tdhFees,
      feeOptions: [], conditions: [], channel: null, includeFtp: true,
    } as any);
    expect(html.toLowerCase()).not.toContain('ftp');
  });
});
