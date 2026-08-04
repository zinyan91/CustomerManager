import { describe, it, expect } from 'vitest';
import {
  formatRateForCustomer, formatMoneyForCustomer, formatDateForCustomer,
  prepaymentYearLabel, prepaymentFeeLabel, findRateSheetBlockers, buildRateSheetHtml,
  pivotFeeOptions,
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
    issuedOn: '2026-08-04',
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

  it('anchors the quote in time with an issue date', () => {
    expect(html).toContain('Ngày lập');
    expect(html).toContain('4/8/2026');
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

  it('names the adviser and carries a disclaimer', () => {
    expect(html).toContain('Nguyễn Văn A');
    expect(html).toContain('có thể thay đổi theo');
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
