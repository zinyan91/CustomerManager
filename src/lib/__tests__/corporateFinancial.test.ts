import { describe, it, expect } from 'vitest';
import {
  createSampleCorporateProfile,
} from '../corporateFinancialDefaults';
import {
  computeB01a,
  computeB02,
  computeB01b,
  checkB01aBalance,
  computeFinancialRatios,
} from '../corporateFinancialFormulas';

describe('Báo cáo Tài chính Doanh nghiệp - Thông tư 133/2016/TT-BTC', () => {
  it('tính toán chính xác các chỉ tiêu B01a và kiểm tra bảng cân đối đã khớp', () => {
    const profile = createSampleCorporateProfile();
    const computedB01a = computeB01a(profile.b01a);

    const getVal = (code: string) => {
      const it = computedB01a.items.find(i => i.code === code);
      return it?.currentPeriod || 0;
    };

    // Kiểm tra TSNH (Mã 100)
    // 110 (1.250tr) + 120 (500tr) + 130 (2.400 + 450 + 120 - 50 = 2.920tr) + 140 (3.600tr) + 150 (80tr) = 8.350tr
    expect(getVal('130')).toBe(2_920_000_000);
    expect(getVal('140')).toBe(3_600_000_000);
    expect(getVal('100')).toBe(8_350_000_000);

    // Kiểm tra TSDLH (Mã 200)
    // 210 (200tr) + 220 (4.500 - 1.200 = 3.300tr) + 240 (350tr) + 260 (100tr) = 3.950tr
    expect(getVal('220')).toBe(3_300_000_000);
    expect(getVal('200')).toBe(3_950_000_000);

    // Tổng cộng tài sản (Mã 270 = 100 + 200)
    expect(getVal('270')).toBe(12_300_000_000);

    // Nợ phải trả (Mã 300)
    // 310: 1.850 + 320 + 180 + 150 + 2.500 + 50 = 5.050tr
    // 330: 1.200tr
    // 300 = 6.250tr
    expect(getVal('310')).toBe(5_050_000_000);
    expect(getVal('330')).toBe(1_200_000_000);
    expect(getVal('300')).toBe(6_250_000_000);

    // Vốn chủ sở hữu (Mã 400)
    // 411 (5.000tr) + 416 (200tr) + 417 (850tr) = 6.050tr
    expect(getVal('400')).toBe(6_050_000_000);

    // Tổng cộng nguồn vốn (Mã 440 = 300 + 400)
    expect(getVal('440')).toBe(12_300_000_000);

    // Kiểm tra cân đối
    const balance = checkB01aBalance(computedB01a);
    expect(balance.isBalancedCurrent).toBe(true);
    expect(balance.diffCurrent).toBe(0);
  });

  it('tính toán chính xác các chỉ tiêu Kết quả kinh doanh B02', () => {
    const profile = createSampleCorporateProfile();
    const computedB02 = computeB02(profile.b02);

    const getVal = (code: string) => {
      const it = computedB02.items.find(i => i.code === code);
      return it?.currentPeriod || 0;
    };

    // 10 = 01 (18.500tr) - 02 (250tr) = 18.250tr
    expect(getVal('10')).toBe(18_250_000_000);

    // 20 = 10 (18.250tr) - 11 (13.800tr) = 4.450tr
    expect(getVal('20')).toBe(4_450_000_000);

    // 30 = 20 (4.450tr) + 21 (85tr) - 22 (420tr) - 24 (2.850tr) = 1.265tr
    expect(getVal('30')).toBe(1_265_000_000);

    // 40 = 31 (40tr) - 32 (15tr) = 25tr
    expect(getVal('40')).toBe(25_000_000);

    // 50 = 30 (1.265tr) + 40 (25tr) = 1.290tr
    expect(getVal('50')).toBe(1_290_000_000);

    // 60 = 50 (1.290tr) - 51 (258tr) = 1.032tr
    expect(getVal('60')).toBe(1_032_000_000);
  });

  it('tính toán chính xác Báo cáo theo thanh khoản B01b', () => {
    const profile = createSampleCorporateProfile();
    const computedB01b = computeB01b(profile.b01b);

    const getVal = (code: string) => {
      const it = computedB01b.items.find(i => i.code === code);
      return it?.currentPeriod || 0;
    };

    expect(getVal('200')).toBe(12_300_000_000);
    expect(getVal('500')).toBe(12_300_000_000);
  });

  it('tính toán các tỷ số tài chính chuẩn xác', () => {
    const profile = createSampleCorporateProfile();
    const ratios = computeFinancialRatios(profile.b01a, profile.b02);

    // Current Ratio = 8.350 / 5.050 = 1.65
    expect(ratios.currentRatio).toBe(1.65);

    // Quick Ratio = (8.350 - 3.600) / 5.050 = 4.750 / 5.050 = 0.94
    expect(ratios.quickRatio).toBe(0.94);

    // Debt to Assets = 6.250 / 12.300 = 50.8%
    expect(ratios.debtToAssets).toBe(50.8);

    // Gross Margin = 4.450 / 18.250 = 24.4%
    expect(ratios.grossMargin).toBe(24.4);
  });
});
