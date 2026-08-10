import { describe, it, expect } from 'vitest';
import {
  computeBusinessPlan, revenueGrowthOf, planDriversOf, emptyBusinessPlanInput,
  DEFAULT_MAX_DTI_PERCENT, DEFAULT_GROWTH_FACTOR, PERIOD_DRIVER_KEYS,
  type BusinessPlanInput, type PeriodDrivers, type BalanceSheetInput,
} from '../businessPlan';
import { pvAnnuityFactor, dtiMaxMonthlyPayment } from '../calcMath';

const M = 1_000_000;

const balanceSheet: BalanceSheetInput = {
  cash: 300 * M,
  inventory: 100 * M,
  receivables: 50 * M,
  otherCurrentAssets: 0,
  longTermReceivables: 0,
  fixedAssets: 50 * M,
  otherLongTermAssets: 0,
  shortTermDebt: 20 * M,
  otherShortTermDebt: 0,
  longTermDebt: 30 * M,
  otherLongTermDebt: 0,
};

const actual: PeriodDrivers = {
  revenueAnnual: 1200 * M,
  cogsAnnual: 780 * M,
  depreciationAnnual: 120 * M,
  taxAnnual: 0,
  staffMonthly: 5 * M,
  premisesMonthly: 2 * M,
  utilitiesMonthly: 1 * M,
  otherMonthly: 1 * M,
};

const baseInput: BusinessPlanInput = {
  ...emptyBusinessPlanInput('2026-08-10'),
  kind: 'limit',
  balanceSheet,
  actual,
  growthFactor: 1.1,
  planOverrides: {},
  debts: [
    { label: 'VB_HM hiện hữu', principal: 600 * M, rateAnnualPercent: 8, scope: 'both' },
    { label: 'VB_Cấp mới', principal: 400 * M, rateAnnualPercent: 8, scope: 'plan' },
  ],
  requestedLimitActual: 0,
  requestedLimitPlan: 0,
};

describe('bảng cân đối', () => {
  it('tổng tài sản chỉ gồm tài sản ngắn hạn và dài hạn', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.balance.currentAssets).toBe(450 * M);
    expect(r.balance.longTermAssets).toBe(50 * M);
    expect(r.balance.totalAssets).toBe(500 * M);
  });

  it('vốn tự có là phần còn lại sau nợ phải trả', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.balance.totalLiabilities).toBe(50 * M);
    expect(r.balance.ownEquity).toBe(450 * M);
  });

  it('tổng nguồn vốn luôn bằng tổng tài sản', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.balance.totalCapital).toBe(r.balance.totalAssets);
  });

  it('vốn tự có âm khi nợ phải trả vượt tổng tài sản', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      balanceSheet: { ...balanceSheet, longTermDebt: 900 * M },
    });
    expect(r.balance.ownEquity).toBe(500 * M - 920 * M);
    expect(r.balance.totalCapital).toBe(r.balance.totalAssets);
  });
});

describe('kỳ kế hoạch dự phóng theo hệ số', () => {
  it('mọi khoản mục nhân đúng hệ số', () => {
    const d = planDriversOf({ ...baseInput, growthFactor: 1.5 });
    expect(d.revenueAnnual).toBe(1800 * M);
    expect(d.cogsAnnual).toBe(1170 * M);
    expect(d.staffMonthly).toBe(7.5 * M);
  });

  it('hệ số phủ hết mọi khoản mục, không sót dòng nào', () => {
    const d = planDriversOf({ ...baseInput, growthFactor: 2 });
    PERIOD_DRIVER_KEYS.forEach(key => {
      expect(d[key]).toBe(actual[key] * 2);
    });
  });

  it('dòng gõ đè thì giữ nguyên số gõ, các dòng khác vẫn bám hệ số', () => {
    const d = planDriversOf({
      ...baseInput, growthFactor: 1.5,
      planOverrides: { premisesMonthly: 2 * M },
    });
    expect(d.premisesMonthly).toBe(2 * M);
    expect(d.revenueAnnual).toBe(1800 * M);
  });

  it('gõ đè bằng 0 là con số thật, không rơi về hệ số', () => {
    const d = planDriversOf({ ...baseInput, planOverrides: { premisesMonthly: 0 } });
    expect(d.premisesMonthly).toBe(0);
  });

  it('hệ số mặc định dùng cho hồ sơ mới', () => {
    expect(emptyBusinessPlanInput('2026-08-10').growthFactor).toBe(DEFAULT_GROWTH_FACTOR);
    expect(DEFAULT_GROWTH_FACTOR).toBeGreaterThan(1);
  });

  it('tốc độ tăng doanh thu tính từ số cuối cùng, kể cả khi gõ đè', () => {
    expect(revenueGrowthOf({ ...baseInput, growthFactor: 1.5 })).toBeCloseTo(0.5, 10);
    expect(revenueGrowthOf({
      ...baseInput, growthFactor: 1.5, planOverrides: { revenueAnnual: 1320 * M },
    })).toBeCloseTo(0.1, 10);
  });

  it('doanh thu kỳ thực hiện bằng 0 thì tốc độ tăng bằng 0, không chia cho 0', () => {
    expect(revenueGrowthOf({ ...baseInput, actual: { ...actual, revenueAnnual: 0 } })).toBe(0);
  });
});

describe('kết quả kinh doanh', () => {
  it('giá vốn là số tiền nhập vào, không phải tỷ lệ', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costs.cogs).toBe(780 * M);
    expect(r.plan.costs.cogs).toBeCloseTo(858 * M, 2);
  });

  it('tỷ trọng giá vốn trên doanh thu là số tự tính ra', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costRatios.cogs).toBeCloseTo(0.65, 10);
  });

  it('chi phí theo tháng quy ra năm bằng nhân mười hai', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costs.staff).toBe(60 * M);
    expect(r.actual.costs.premises).toBe(24 * M);
    expect(r.actual.costs.utilities).toBe(12 * M);
    expect(r.actual.costs.other).toBe(12 * M);
  });

  it('tổng chi phí gồm đủ bảy dòng', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costs.total).toBe(1056 * M);
  });

  it('lợi nhuận trước thuế của hai kỳ dùng cùng một công thức', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.profitBeforeTax).toBe(144 * M);
    expect(r.plan.profitBeforeTax).toBeCloseTo(131.2 * M, 2);
  });

  it('lợi nhuận kỳ kế hoạch trừ đủ mặt bằng và chi phí khác', () => {
    const coDu = computeBusinessPlan(baseInput);
    const boHai = computeBusinessPlan({
      ...baseInput, planOverrides: { premisesMonthly: 0, otherMonthly: 0 },
    });
    expect(boHai.plan.profitBeforeTax - coDu.plan.profitBeforeTax).toBeCloseTo(39.6 * M, 2);
  });

  it('lợi nhuận sau thuế trừ thuế khoán', () => {
    const r = computeBusinessPlan({ ...baseInput, actual: { ...actual, taxAnnual: 24 * M } });
    expect(r.actual.profitAfterTax).toBe(120 * M);
  });

  it('số liệu tháng không làm tròn lên', () => {
    const r = computeBusinessPlan({
      ...baseInput, actual: { ...actual, revenueAnnual: 1000 * M },
    });
    expect(r.actual.monthly.revenue).toBeCloseTo(1000 * M / 12, 6);
  });

  it('tỷ trọng tính trên doanh thu chưa làm tròn', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costRatios.total).toBeCloseTo(1056 / 1200, 10);
  });

  it('tỷ trọng bằng 0 khi doanh thu bằng 0 thay vì vô hạn', () => {
    const r = computeBusinessPlan({
      ...baseInput, actual: { ...actual, revenueAnnual: 0 },
    });
    expect(r.actual.costRatios.total).toBe(0);
    expect(Number.isFinite(r.actual.costRatios.cogs)).toBe(true);
  });
});

describe('lãi vay', () => {
  it('kỳ thực hiện chỉ tính khoản đang có, kỳ kế hoạch tính thêm khoản cấp mới', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costs.interest).toBe(48 * M);
    expect(r.plan.costs.interest).toBe(80 * M);
  });

  it('không nhân hệ số dự phóng — lãi vay tính từ dư nợ thật', () => {
    const r = computeBusinessPlan({ ...baseInput, growthFactor: 3 });
    expect(r.plan.costs.interest).toBe(80 * M);
  });

  it('là nguồn duy nhất: đổi khoản vay thì lợi nhuận đổi, nhu cầu vốn bằng tiền không đổi', () => {
    const base = computeBusinessPlan(baseInput);
    const heavier = computeBusinessPlan({
      ...baseInput,
      debts: [{ label: 'VB_HM hiện hữu', principal: 1200 * M, rateAnnualPercent: 8, scope: 'both' }],
    });
    expect(heavier.actual.costs.interest).toBe(96 * M);
    expect(heavier.actual.profitBeforeTax).toBe(base.actual.profitBeforeTax - 48 * M);
    expect(heavier.limit!.actual.cashNeed).toBe(base.limit!.actual.cashNeed);
  });

  it('không có khoản vay nào thì lãi vay bằng 0', () => {
    const r = computeBusinessPlan({ ...baseInput, debts: [] });
    expect(r.actual.costs.interest).toBe(0);
    expect(r.plan.costs.interest).toBe(0);
  });
});

describe('nhu cầu cấp hạn mức', () => {
  it('vòng quay là kết quả của doanh thu chia tài sản lưu động', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.limit!.actual.turnover).toBeCloseTo(1200 / 450, 10);
  });

  it('tổng nhu cầu vốn bằng tiền trừ khấu hao, lãi vay và lợi nhuận trước thuế', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.limit!.actual.cashNeed).toBe(888 * M);
  });

  it('nhu cầu vốn lưu động một vòng bằng nhu cầu tiền chia vòng quay', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.limit!.actual.avgWorkingCapitalNeed).toBeCloseTo(333 * M, 2);
  });

  it('tài sản lưu động kỳ kế hoạch tăng theo tốc độ tăng doanh thu', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.plan.currentAssets).toBeCloseTo(495 * M, 2);
  });

  it('tài sản lưu động kỳ kế hoạch tăng bằng phần hạn mức đề nghị tăng thêm', () => {
    const r = computeBusinessPlan({
      ...baseInput, requestedLimitActual: 300 * M, requestedLimitPlan: 500 * M,
    });
    expect(r.plan.currentAssets).toBe(650 * M);
  });

  it('đánh dấu khi hạn mức đề nghị vượt nhu cầu vốn lưu động một vòng', () => {
    const within = computeBusinessPlan({ ...baseInput, requestedLimitActual: 300 * M });
    const over = computeBusinessPlan({ ...baseInput, requestedLimitActual: 400 * M });
    expect(within.limit!.actual.exceedsNeed).toBe(false);
    expect(over.limit!.actual.exceedsNeed).toBe(true);
  });

  it('tài sản lưu động bằng 0 thì vòng quay và nhu cầu một vòng bằng 0, không chia cho 0', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      balanceSheet: { ...balanceSheet, cash: 0, inventory: 0, receivables: 0, otherCurrentAssets: 0 },
    });
    expect(r.limit!.actual.turnover).toBe(0);
    expect(r.limit!.actual.avgWorkingCapitalNeed).toBe(0);
  });

  it('không dựng khối hạn mức cho hồ sơ vay từng lần', () => {
    expect(computeBusinessPlan({ ...baseInput, kind: 'each_time' }).limit).toBeUndefined();
  });
});

describe('cho vay từng lần', () => {
  const eachTimeInput: BusinessPlanInput = {
    ...baseInput,
    kind: 'each_time',
    household: {
      otherIncomeMonthly: 5 * M,
      livingExpenseMonthly: 8 * M,
      existingDebtPaymentMonthly: 4 * M,
      maxDtiPercent: 60,
    },
    eachTime: {
      projectCost: 1500 * M,
      ownFunds: 500 * M,
      tenorMonths: 120,
      rateAnnualPercent: 10,
      collateralCapacity: 800 * M,
    },
  };

  const expectedAffordable = dtiMaxMonthlyPayment(22 * M + 5 * M, 8 * M, 4 * M, 60);
  const expectedCapacity = expectedAffordable * pvAnnuityFactor(0.1 / 12, 120);

  it('nguồn trả nợ gộp lợi nhuận sau thuế, khấu hao và thu nhập ngoài kinh doanh', () => {
    expect(computeBusinessPlan(eachTimeInput).eachTime!.incomeMonthly).toBe(27 * M);
  });

  it('khả năng trả nợ trừ chi phí sinh hoạt và nghĩa vụ nợ hiện hữu', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.affordablePaymentMonthly).toBe(expectedAffordable);
    expect(r.eachTime!.affordablePaymentMonthly).toBe(12.2 * M);
  });

  it('nhu cầu vay bằng chi phí phương án trừ vốn tự có tham gia', () => {
    expect(computeBusinessPlan(eachTimeInput).eachTime!.needFromBank).toBe(1000 * M);
  });

  it('vốn tự có vượt chi phí phương án thì nhu cầu vay bằng 0', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      eachTime: { ...eachTimeInput.eachTime, ownFunds: 2000 * M },
    });
    expect(r.eachTime!.needFromBank).toBe(0);
  });

  it('khả năng vay quy từ dòng tiền trả nợ theo kỳ hạn và lãi suất', () => {
    expect(computeBusinessPlan(eachTimeInput).eachTime!.maxLoanFromCapacity)
      .toBeCloseTo(expectedCapacity, 6);
  });

  it('số tiền đề nghị lấy nhỏ nhất trong ba giới hạn', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.recommended).toBe(800 * M);
    expect(r.eachTime!.binding).toBe('collateral');
  });

  it('chỉ ra đúng giới hạn đang chặn khi tài sản bảo đảm dư', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      eachTime: { ...eachTimeInput.eachTime, collateralCapacity: 1200 * M },
    });
    expect(r.eachTime!.recommended).toBeCloseTo(expectedCapacity, 6);
    expect(r.eachTime!.binding).toBe('capacity');
  });

  it('chỉ ra giới hạn nhu cầu khi khách trả nợ tốt và tài sản dư', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      household: { ...eachTimeInput.household, otherIncomeMonthly: 200 * M },
      eachTime: { ...eachTimeInput.eachTime, collateralCapacity: 5000 * M },
    });
    expect(r.eachTime!.recommended).toBe(1000 * M);
    expect(r.eachTime!.binding).toBe('need');
  });

  it('nguồn trả nợ không đủ sống thì khả năng vay bằng 0', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      household: { ...eachTimeInput.household, livingExpenseMonthly: 40 * M },
    });
    expect(r.eachTime!.affordablePaymentMonthly).toBe(0);
    expect(r.eachTime!.maxLoanFromCapacity).toBe(0);
    expect(r.eachTime!.recommended).toBe(0);
  });

  it('không dựng khối vay từng lần cho hồ sơ hạn mức', () => {
    expect(computeBusinessPlan(baseInput).eachTime).toBeUndefined();
  });

  it('trần DTI mặc định nằm trong khoảng hợp lệ', () => {
    expect(DEFAULT_MAX_DTI_PERCENT).toBeGreaterThan(0);
    expect(DEFAULT_MAX_DTI_PERCENT).toBeLessThanOrEqual(100);
  });
});

describe('emptyBusinessPlanInput', () => {
  it('năm kế hoạch liền sau năm thực hiện', () => {
    const i = emptyBusinessPlanInput('2026-08-09');
    expect(i.actualYear).toBe(2026);
    expect(i.planYear).toBe(2027);
    expect(i.balanceSheetDate).toBe('2026-08-09');
  });

  it('điền sẵn trần DTI để không rơi vào trạng thái chưa khai', () => {
    expect(emptyBusinessPlanInput('2026-08-09').household.maxDtiPercent)
      .toBe(DEFAULT_MAX_DTI_PERCENT);
  });

  it('tính được ngay mà không ra NaN dù chưa nhập gì', () => {
    const r = computeBusinessPlan(emptyBusinessPlanInput('2026-08-09'));
    expect(r.balance.totalAssets).toBe(0);
    expect(r.limit!.actual.avgWorkingCapitalNeed).toBe(0);
    expect(Number.isNaN(r.actual.profitBeforeTax)).toBe(false);
    expect(Number.isNaN(r.plan.profitBeforeTax)).toBe(false);
  });
});
