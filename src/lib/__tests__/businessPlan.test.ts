import { describe, it, expect } from 'vitest';
import {
  computeBusinessPlan, revenueGrowthOf, businessPlanInputFrom, emptyBusinessPlan, DEFAULT_MAX_DTI_PERCENT,
  type BusinessPlanInput, type PeriodDrivers, type BalanceSheetInput,
} from '../businessPlan';
import { pvAnnuityFactor, dtiMaxMonthlyPayment } from '../calcMath';
import type { BusinessPlan, BusinessPlanDebt } from '../../types';

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
  cogsRatioPercent: 65,
  depreciationAnnual: 120 * M,
  taxAnnual: 0,
  staffMonthly: 5 * M,
  premisesMonthly: 2 * M,
  utilitiesMonthly: 1 * M,
  otherMonthly: 1 * M,
};

const plan: PeriodDrivers = { ...actual, revenueAnnual: 1320 * M };

const baseInput: BusinessPlanInput = {
  kind: 'limit',
  balanceSheet,
  actual,
  plan,
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

describe('kết quả kinh doanh', () => {
  it('giá vốn tính theo tỷ lệ trên doanh thu', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costs.cogs).toBe(780 * M);
    expect(r.plan.costs.cogs).toBe(858 * M);
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
    expect(r.plan.profitBeforeTax).toBe(154 * M);
  });

  it('lợi nhuận kỳ kế hoạch trừ đủ mặt bằng và chi phí khác', () => {
    const withoutThose = computeBusinessPlan({
      ...baseInput,
      plan: { ...plan, premisesMonthly: 0, otherMonthly: 0 },
    });
    expect(withoutThose.plan.profitBeforeTax - computeBusinessPlan(baseInput).plan.profitBeforeTax)
      .toBe(36 * M);
  });

  it('lợi nhuận sau thuế trừ thuế khoán', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      actual: { ...actual, taxAnnual: 24 * M },
    });
    expect(r.actual.profitAfterTax).toBe(120 * M);
  });

  it('số liệu tháng không làm tròn lên', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      actual: { ...actual, revenueAnnual: 1000 * M },
    });
    expect(r.actual.monthly.revenue).toBeCloseTo(1000 * M / 12, 6);
  });

  it('tỷ trọng tính trên doanh thu chưa làm tròn', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.actual.costRatios.cogs).toBeCloseTo(0.65, 10);
    expect(r.actual.costRatios.total).toBeCloseTo(1056 / 1200, 10);
  });

  it('tỷ trọng bằng 0 khi doanh thu bằng 0 thay vì vô hạn', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      actual: { ...actual, revenueAnnual: 0 },
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
    expect(revenueGrowthOf(baseInput)).toBeCloseTo(0.1, 10);
    expect(r.plan.currentAssets).toBeCloseTo(495 * M, 2);
  });

  it('tài sản lưu động kỳ kế hoạch tăng bằng phần hạn mức đề nghị tăng thêm', () => {
    const r = computeBusinessPlan({
      ...baseInput,
      requestedLimitActual: 300 * M,
      requestedLimitPlan: 500 * M,
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
      balanceSheet: {
        ...balanceSheet, cash: 0, inventory: 0, receivables: 0, otherCurrentAssets: 0,
      },
    });
    expect(r.limit!.actual.turnover).toBe(0);
    expect(r.limit!.actual.avgWorkingCapitalNeed).toBe(0);
  });

  it('không dựng khối hạn mức cho hồ sơ vay từng lần', () => {
    const r = computeBusinessPlan({ ...baseInput, kind: 'each_time' });
    expect(r.limit).toBeUndefined();
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
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.incomeMonthly).toBe(27 * M);
  });

  it('khả năng trả nợ trừ chi phí sinh hoạt và nghĩa vụ nợ hiện hữu', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.affordablePaymentMonthly).toBe(expectedAffordable);
    expect(r.eachTime!.affordablePaymentMonthly).toBe(12.2 * M);
  });

  it('nhu cầu vay bằng chi phí phương án trừ vốn tự có tham gia', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.needFromBank).toBe(1000 * M);
  });

  it('vốn tự có vượt chi phí phương án thì nhu cầu vay bằng 0', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      eachTime: { ...eachTimeInput.eachTime!, ownFunds: 2000 * M },
    });
    expect(r.eachTime!.needFromBank).toBe(0);
  });

  it('khả năng vay quy từ dòng tiền trả nợ theo kỳ hạn và lãi suất', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.maxLoanFromCapacity).toBeCloseTo(expectedCapacity, 6);
  });

  it('số tiền đề nghị lấy nhỏ nhất trong ba giới hạn', () => {
    const r = computeBusinessPlan(eachTimeInput);
    expect(r.eachTime!.recommended).toBe(800 * M);
    expect(r.eachTime!.binding).toBe('collateral');
  });

  it('chỉ ra đúng giới hạn đang chặn khi tài sản bảo đảm dư', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      eachTime: { ...eachTimeInput.eachTime!, collateralCapacity: 1200 * M },
    });
    expect(r.eachTime!.recommended).toBeCloseTo(expectedCapacity, 6);
    expect(r.eachTime!.binding).toBe('capacity');
  });

  it('chỉ ra giới hạn nhu cầu khi khách trả nợ tốt và tài sản dư', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      household: { ...eachTimeInput.household!, otherIncomeMonthly: 200 * M },
      eachTime: { ...eachTimeInput.eachTime!, collateralCapacity: 5000 * M },
    });
    expect(r.eachTime!.recommended).toBe(1000 * M);
    expect(r.eachTime!.binding).toBe('need');
  });

  it('nguồn trả nợ không đủ sống thì khả năng vay bằng 0', () => {
    const r = computeBusinessPlan({
      ...eachTimeInput,
      household: { ...eachTimeInput.household!, livingExpenseMonthly: 40 * M },
    });
    expect(r.eachTime!.affordablePaymentMonthly).toBe(0);
    expect(r.eachTime!.maxLoanFromCapacity).toBe(0);
    expect(r.eachTime!.recommended).toBe(0);
  });

  it('trần DTI mặc định nằm trong khoảng hợp lệ', () => {
    expect(DEFAULT_MAX_DTI_PERCENT).toBeGreaterThan(0);
    expect(DEFAULT_MAX_DTI_PERCENT).toBeLessThanOrEqual(100);
  });

  it('không dựng khối vay từng lần cho hồ sơ hạn mức', () => {
    const r = computeBusinessPlan(baseInput);
    expect(r.eachTime).toBeUndefined();
  });

  it('thiếu khai báo phương án thì mọi giới hạn bằng 0 thay vì NaN', () => {
    const r = computeBusinessPlan({ ...baseInput, kind: 'each_time' });
    expect(r.eachTime!.needFromBank).toBe(0);
    expect(r.eachTime!.maxLoanFromCapacity).toBe(0);
    expect(r.eachTime!.recommended).toBe(0);
  });
});

describe('emptyBusinessPlan', () => {
  it('năm kế hoạch liền sau năm thực hiện', () => {
    const p = emptyBusinessPlan(9, '2026-08-09');
    expect(p.ActualYear).toBe(2026);
    expect(p.PlanYear).toBe(2027);
    expect(p.BalanceSheetDate).toBe('2026-08-09');
  });

  it('điền sẵn trần DTI mặc định để không rơi vào trạng thái chưa khai', () => {
    expect(emptyBusinessPlan(9, '2026-08-09').MaxDtiPercent).toBe(DEFAULT_MAX_DTI_PERCENT);
  });

  it('tính được ngay mà không ra NaN dù chưa nhập gì', () => {
    const r = computeBusinessPlan(businessPlanInputFrom(emptyBusinessPlan(9, '2026-08-09'), [], 0));
    expect(r.balance.totalAssets).toBe(0);
    expect(r.limit!.actual.avgWorkingCapitalNeed).toBe(0);
    expect(Number.isNaN(r.actual.profitBeforeTax)).toBe(false);
  });
});

describe('businessPlanInputFrom', () => {
  const row: BusinessPlan = {
    Id: 7, CustomerId: 3, PlanKind: 'limit',
    ActualYear: 2025, PlanYear: 2026, BalanceSheetDate: '2025-06-30',
    Cash: 300 * M, Inventory: 100 * M, Receivables: 50 * M, OtherCurrentAssets: 0,
    LongTermReceivables: 0, FixedAssets: 50 * M, OtherLongTermAssets: 0,
    ShortTermDebt: 20 * M, OtherShortTermDebt: 0, LongTermDebt: 30 * M, OtherLongTermDebt: 0,
    ActualRevenueAnnual: 1200 * M, ActualCogsRatioPercent: 65,
    ActualDepreciationAnnual: 120 * M, ActualTaxAnnual: 0,
    ActualStaffMonthly: 5 * M, ActualPremisesMonthly: 2 * M,
    ActualUtilitiesMonthly: 1 * M, ActualOtherMonthly: 1 * M,
    PlanRevenueAnnual: 1320 * M, PlanCogsRatioPercent: 65,
    PlanDepreciationAnnual: 120 * M, PlanTaxAnnual: 0,
    PlanStaffMonthly: 5 * M, PlanPremisesMonthly: 2 * M,
    PlanUtilitiesMonthly: 1 * M, PlanOtherMonthly: 1 * M,
    RequestedLimitActual: 0, RequestedLimitPlan: 0,
    OtherIncomeMonthly: 0, LivingExpenseMonthly: 0,
    ExistingDebtPaymentMonthly: 0, MaxDtiPercent: 0,
    ProjectCost: 0, OwnFunds: 0, TenorMonths: 0, RateAnnualPercent: 0,
  };

  const rowDebts: BusinessPlanDebt[] = [
    { Id: 1, PlanId: 7, Label: 'VB_HM hiện hữu', Principal: 600 * M, RateAnnualPercent: 8, Scope: 'both', SortOrder: 0 },
    { Id: 2, PlanId: 7, Label: 'VB_Cấp mới', Principal: 400 * M, RateAnnualPercent: 8, Scope: 'plan', SortOrder: 1 },
  ];

  it('dòng cơ sở dữ liệu cho ra đúng kết quả như đầu vào dựng tay', () => {
    const fromRow = computeBusinessPlan(businessPlanInputFrom(row, rowDebts, 0));
    const direct = computeBusinessPlan(baseInput);
    expect(fromRow.balance).toEqual(direct.balance);
    expect(fromRow.actual.profitBeforeTax).toBe(direct.actual.profitBeforeTax);
    expect(fromRow.plan.costs.interest).toBe(direct.plan.costs.interest);
    expect(fromRow.limit!.actual.avgWorkingCapitalNeed)
      .toBeCloseTo(direct.limit!.actual.avgWorkingCapitalNeed, 6);
  });

  it('khả năng bảo đảm truyền từ ngoài vào, không đọc từ dòng phương án', () => {
    const input = businessPlanInputFrom({ ...row, PlanKind: 'each_time' }, rowDebts, 900 * M);
    expect(input.eachTime!.collateralCapacity).toBe(900 * M);
    expect(computeBusinessPlan(input).eachTime!.collateralCapacity).toBe(900 * M);
  });

  it('cột rỗng trong cơ sở dữ liệu đọc thành 0, không thành NaN', () => {
    const sparse = { ...row, Cash: null as unknown as number, ActualRevenueAnnual: undefined as unknown as number };
    const r = computeBusinessPlan(businessPlanInputFrom(sparse, [], 0));
    expect(r.balance.currentAssets).toBe(150 * M);
    expect(r.actual.revenueAnnual).toBe(0);
    expect(Number.isNaN(r.actual.profitBeforeTax)).toBe(false);
  });
});
