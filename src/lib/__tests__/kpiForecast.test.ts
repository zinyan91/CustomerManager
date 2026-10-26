import { describe, expect, it } from 'vitest';
import { calculateKpiForecast, createKpiForecastInputs, kpiTenureCoefficient } from '../kpiForecast';

describe('dự báo KPI RBO, CSO', () => {
  it('khớp bộ dữ liệu mẫu trong workbook', () => {
    const result = calculateKpiForecast(createKpiForecastInputs());
    expect(result.planPoints).toBeCloseTo(285.2, 8);
    expect(result.actualPoints).toBeCloseTo(155.255, 8);
    expect(result.completion).toBeCloseTo(0.5443723702664797, 12);
    expect(result.bonus).toBe(0);
  });

  it.each([
    [0, 0.1], [2, 0.1], [3, 0.2], [6, 0.3], [9, 0.4], [12, 0.55],
    [15, 0.7], [18, 0.8], [21, 0.95], [24, 1], [48, 1],
  ])('dùng đúng hệ số thâm niên tại %s tháng', (months, expected) => {
    expect(kpiTenureCoefficient(months)).toBe(expected);
  });

  it('giảm 30% cấp bậc 1 dưới ba tháng theo công thức nguồn', () => {
    const inputs = createKpiForecastInputs();
    inputs.tenureMonths = 2;
    const result = calculateKpiForecast(inputs);
    expect(result.rows.find(row => row.id === 'netLoan')?.plan).toBeCloseTo(1200 * 0.7);
    expect(result.rows.find(row => row.id === 'fees')?.plan).toBeCloseTo(17 * 0.7);
    expect(result.rows.find(row => row.id === 'activeCustomers')?.plan).toBeCloseTo(18 * 0.7);
  });

  it('chặn điểm quy mô ở 130% điểm gốc của cấp bậc', () => {
    const inputs = createKpiForecastInputs();
    inputs.actuals.managedLoan = 1_000_000;
    const row = calculateKpiForecast(inputs).rows.find(item => item.id === 'managedLoan');
    expect(row?.actualPoints).toBeCloseTo(204 * 1.3);
    expect(row?.completion).toBe(1.3);
  });

  it('tính ba bậc thưởng và điều kiện tăng trưởng cho RBO', () => {
    const inputs = createKpiForecastInputs();
    inputs.actuals.netLoan = 1200;
    inputs.actuals.netDeposit = 5000;
    inputs.actuals.netCasa = 1000;
    inputs.actuals.managedLoan = 100000;
    inputs.actuals.cards = 10;
    inputs.actuals.activeCustomers = 50;
    inputs.fees.beautifulNumber = 30;
    const result = calculateKpiForecast(inputs);
    expect(result.completion).toBeGreaterThan(1.4);
    expect(result.growthCompletion).toBe(1);
    expect(result.bonusTiers.map(tier => tier.rate)).toEqual([4000, 6000, 8000]);
    expect(result.bonus).toBeGreaterThan(0);
  });

  it('dùng tăng ròng huy động CKH làm điều kiện thưởng cho CSO', () => {
    const inputs = createKpiForecastInputs();
    inputs.rank = 'CSO1';
    inputs.tenureMonths = 24;
    inputs.actuals.netDeposit = 6400;
    inputs.actuals.netCasa = 1000;
    inputs.actuals.managedDeposit = 600000;
    inputs.actuals.cards = 20;
    inputs.actuals.activeCustomers = 60;
    inputs.fees.beautifulNumber = 60;
    const result = calculateKpiForecast(inputs);
    expect(result.rows.some(row => row.id === 'netLoan')).toBe(false);
    expect(result.rows.some(row => row.id === 'managedDeposit')).toBe(true);
    expect(result.growthCompletion).toBe(1);
    expect(result.bonusTiers[2].rate).toBe(8000);
  });
});
