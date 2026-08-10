import { pvAnnuityFactor, dtiMaxMonthlyPayment } from './calcMath';
import type { BusinessPlan, BusinessPlanDebt } from '../types';

export const DEFAULT_MAX_DTI_PERCENT = 60;

export type BusinessPlanKind = 'limit' | 'each_time';
export type DebtScope = 'both' | 'plan';
export type BindingLimit = 'need' | 'capacity' | 'collateral';

export interface DebtItem {
  label: string;
  principal: number;
  rateAnnualPercent: number;
  scope: DebtScope;
}

export interface PeriodDrivers {
  revenueAnnual: number;
  cogsRatioPercent: number;
  depreciationAnnual: number;
  taxAnnual: number;
  staffMonthly: number;
  premisesMonthly: number;
  utilitiesMonthly: number;
  otherMonthly: number;
}

export interface BalanceSheetInput {
  cash: number;
  inventory: number;
  receivables: number;
  otherCurrentAssets: number;
  longTermReceivables: number;
  fixedAssets: number;
  otherLongTermAssets: number;
  shortTermDebt: number;
  otherShortTermDebt: number;
  longTermDebt: number;
  otherLongTermDebt: number;
}

export interface HouseholdInput {
  otherIncomeMonthly: number;
  livingExpenseMonthly: number;
  existingDebtPaymentMonthly: number;
  maxDtiPercent: number;
}

export interface EachTimeInput {
  projectCost: number;
  ownFunds: number;
  tenorMonths: number;
  rateAnnualPercent: number;
  collateralCapacity: number;
}

export interface BusinessPlanInput {
  kind: BusinessPlanKind;
  balanceSheet: BalanceSheetInput;
  actual: PeriodDrivers;
  plan: PeriodDrivers;
  debts: DebtItem[];
  requestedLimitActual: number;
  requestedLimitPlan: number;
  household?: HouseholdInput;
  eachTime?: EachTimeInput;
}

export interface CostBreakdown {
  cogs: number;
  staff: number;
  premises: number;
  utilities: number;
  interest: number;
  depreciation: number;
  other: number;
  total: number;
}

export interface PeriodMonthly {
  revenue: number;
  costs: CostBreakdown;
  profitBeforeTax: number;
  tax: number;
  profitAfterTax: number;
  currentAssets: number;
}

export interface PeriodResult {
  revenueAnnual: number;
  costs: CostBreakdown;
  profitBeforeTax: number;
  tax: number;
  profitAfterTax: number;
  currentAssets: number;
  monthly: PeriodMonthly;
  costRatios: CostBreakdown;
}

export interface BalanceSheetResult {
  currentAssets: number;
  longTermAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  ownEquity: number;
  totalCapital: number;
}

export interface LimitResult {
  cashNeed: number;
  turnover: number;
  avgWorkingCapitalNeed: number;
  requested: number;
  exceedsNeed: boolean;
}

export interface EachTimeResult {
  needFromBank: number;
  incomeMonthly: number;
  affordablePaymentMonthly: number;
  maxLoanFromCapacity: number;
  collateralCapacity: number;
  recommended: number;
  binding: BindingLimit;
}

export interface BusinessPlanResult {
  balance: BalanceSheetResult;
  actual: PeriodResult;
  plan: PeriodResult;
  limit?: { actual: LimitResult; plan: LimitResult };
  eachTime?: EachTimeResult;
}

const MONTHS_PER_YEAR = 12;

function num(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return value;
}

export function computeBalanceSheet(b: BalanceSheetInput): BalanceSheetResult {
  const currentAssets = num(b.cash) + num(b.inventory) + num(b.receivables) + num(b.otherCurrentAssets);
  const longTermAssets = num(b.longTermReceivables) + num(b.fixedAssets) + num(b.otherLongTermAssets);
  const totalAssets = currentAssets + longTermAssets;
  const totalLiabilities =
    num(b.shortTermDebt) + num(b.otherShortTermDebt) + num(b.longTermDebt) + num(b.otherLongTermDebt);
  const ownEquity = totalAssets - totalLiabilities;

  return {
    currentAssets,
    longTermAssets,
    totalAssets,
    totalLiabilities,
    ownEquity,
    totalCapital: totalLiabilities + ownEquity,
  };
}

export function interestAnnualOf(debts: DebtItem[], scope: 'actual' | 'plan'): number {
  return (debts || []).reduce((sum, d) => {
    if (scope === 'actual' && d.scope === 'plan') return sum;
    return sum + num(d.principal) * num(d.rateAnnualPercent) / 100;
  }, 0);
}

export function revenueGrowthOf(input: BusinessPlanInput): number {
  const base = num(input.actual.revenueAnnual);
  if (base === 0) return 0;
  return num(input.plan.revenueAnnual) / base - 1;
}

function ratioOf(value: number, revenue: number): number {
  if (!revenue) return 0;
  return value / revenue;
}

function divide(costs: CostBreakdown, by: number): CostBreakdown {
  return {
    cogs: costs.cogs / by,
    staff: costs.staff / by,
    premises: costs.premises / by,
    utilities: costs.utilities / by,
    interest: costs.interest / by,
    depreciation: costs.depreciation / by,
    other: costs.other / by,
    total: costs.total / by,
  };
}

function ratios(costs: CostBreakdown, revenue: number): CostBreakdown {
  return {
    cogs: ratioOf(costs.cogs, revenue),
    staff: ratioOf(costs.staff, revenue),
    premises: ratioOf(costs.premises, revenue),
    utilities: ratioOf(costs.utilities, revenue),
    interest: ratioOf(costs.interest, revenue),
    depreciation: ratioOf(costs.depreciation, revenue),
    other: ratioOf(costs.other, revenue),
    total: ratioOf(costs.total, revenue),
  };
}

function computePeriod(d: PeriodDrivers, interestAnnual: number, currentAssets: number): PeriodResult {
  const revenueAnnual = num(d.revenueAnnual);
  const costs: CostBreakdown = {
    cogs: revenueAnnual * num(d.cogsRatioPercent) / 100,
    staff: num(d.staffMonthly) * MONTHS_PER_YEAR,
    premises: num(d.premisesMonthly) * MONTHS_PER_YEAR,
    utilities: num(d.utilitiesMonthly) * MONTHS_PER_YEAR,
    interest: interestAnnual,
    depreciation: num(d.depreciationAnnual),
    other: num(d.otherMonthly) * MONTHS_PER_YEAR,
    total: 0,
  };
  costs.total = costs.cogs + costs.staff + costs.premises + costs.utilities
    + costs.interest + costs.depreciation + costs.other;

  const profitBeforeTax = revenueAnnual - costs.total;
  const tax = num(d.taxAnnual);
  const profitAfterTax = profitBeforeTax - tax;

  return {
    revenueAnnual,
    costs,
    profitBeforeTax,
    tax,
    profitAfterTax,
    currentAssets,
    monthly: {
      revenue: revenueAnnual / MONTHS_PER_YEAR,
      costs: divide(costs, MONTHS_PER_YEAR),
      profitBeforeTax: profitBeforeTax / MONTHS_PER_YEAR,
      tax: tax / MONTHS_PER_YEAR,
      profitAfterTax: profitAfterTax / MONTHS_PER_YEAR,
      currentAssets: currentAssets / MONTHS_PER_YEAR,
    },
    costRatios: ratios(costs, revenueAnnual),
  };
}

function computeLimit(period: PeriodResult, requested: number): LimitResult {
  const cashNeed = period.revenueAnnual
    - period.costs.depreciation
    - period.costs.interest
    - period.profitBeforeTax;
  const turnover = period.currentAssets > 0 ? period.revenueAnnual / period.currentAssets : 0;
  const avgWorkingCapitalNeed = turnover > 0 ? cashNeed / turnover : 0;

  return {
    cashNeed,
    turnover,
    avgWorkingCapitalNeed,
    requested: num(requested),
    exceedsNeed: num(requested) > avgWorkingCapitalNeed,
  };
}

function planCurrentAssets(input: BusinessPlanInput, actualCurrentAssets: number): number {
  const added = num(input.requestedLimitPlan) - num(input.requestedLimitActual);
  if (added > 0) return actualCurrentAssets + added;
  return actualCurrentAssets * (1 + revenueGrowthOf(input));
}

function computeEachTime(
  input: BusinessPlanInput, actualPeriod: PeriodResult
): EachTimeResult {
  const h = input.household;
  const e = input.eachTime;

  const businessIncomeMonthly =
    (actualPeriod.profitAfterTax + actualPeriod.costs.depreciation) / MONTHS_PER_YEAR;
  const incomeMonthly = businessIncomeMonthly + num(h?.otherIncomeMonthly);

  const affordablePaymentMonthly = dtiMaxMonthlyPayment(
    incomeMonthly,
    num(h?.livingExpenseMonthly),
    num(h?.existingDebtPaymentMonthly),
    num(h?.maxDtiPercent)
  );

  const rateMonthly = num(e?.rateAnnualPercent) / 100 / MONTHS_PER_YEAR;
  const maxLoanFromCapacity =
    affordablePaymentMonthly * pvAnnuityFactor(rateMonthly, num(e?.tenorMonths));

  const needFromBank = Math.max(0, num(e?.projectCost) - num(e?.ownFunds));
  const collateralCapacity = num(e?.collateralCapacity);

  const recommended = Math.min(needFromBank, maxLoanFromCapacity, collateralCapacity);
  const binding: BindingLimit = recommended === needFromBank
    ? 'need'
    : recommended === maxLoanFromCapacity ? 'capacity' : 'collateral';

  return {
    needFromBank,
    incomeMonthly,
    affordablePaymentMonthly,
    maxLoanFromCapacity,
    collateralCapacity,
    recommended,
    binding,
  };
}

export function emptyBusinessPlan(customerId: number, todayStr: string): BusinessPlan {
  const year = parseInt((todayStr || '').slice(0, 4), 10) || new Date().getFullYear();
  const zeros = {
    Cash: 0, Inventory: 0, Receivables: 0, OtherCurrentAssets: 0,
    LongTermReceivables: 0, FixedAssets: 0, OtherLongTermAssets: 0,
    ShortTermDebt: 0, OtherShortTermDebt: 0, LongTermDebt: 0, OtherLongTermDebt: 0,
    ActualRevenueAnnual: 0, ActualCogsRatioPercent: 0, ActualDepreciationAnnual: 0, ActualTaxAnnual: 0,
    ActualStaffMonthly: 0, ActualPremisesMonthly: 0, ActualUtilitiesMonthly: 0, ActualOtherMonthly: 0,
    PlanRevenueAnnual: 0, PlanCogsRatioPercent: 0, PlanDepreciationAnnual: 0, PlanTaxAnnual: 0,
    PlanStaffMonthly: 0, PlanPremisesMonthly: 0, PlanUtilitiesMonthly: 0, PlanOtherMonthly: 0,
    RequestedLimitActual: 0, RequestedLimitPlan: 0,
    OtherIncomeMonthly: 0, LivingExpenseMonthly: 0, ExistingDebtPaymentMonthly: 0,
    ProjectCost: 0, OwnFunds: 0, TenorMonths: 0, RateAnnualPercent: 0,
  };

  return {
    Id: 0,
    CustomerId: customerId,
    CreditContractId: null,
    PlanKind: 'limit',
    ActualYear: year,
    PlanYear: year + 1,
    BalanceSheetDate: todayStr,
    MaxDtiPercent: DEFAULT_MAX_DTI_PERCENT,
    ...zeros,
  };
}

export function businessPlanInputFrom(
  plan: BusinessPlan, debts: BusinessPlanDebt[], collateralCapacity: number
): BusinessPlanInput {
  return {
    kind: plan.PlanKind,
    balanceSheet: {
      cash: num(plan.Cash),
      inventory: num(plan.Inventory),
      receivables: num(plan.Receivables),
      otherCurrentAssets: num(plan.OtherCurrentAssets),
      longTermReceivables: num(plan.LongTermReceivables),
      fixedAssets: num(plan.FixedAssets),
      otherLongTermAssets: num(plan.OtherLongTermAssets),
      shortTermDebt: num(plan.ShortTermDebt),
      otherShortTermDebt: num(plan.OtherShortTermDebt),
      longTermDebt: num(plan.LongTermDebt),
      otherLongTermDebt: num(plan.OtherLongTermDebt),
    },
    actual: {
      revenueAnnual: num(plan.ActualRevenueAnnual),
      cogsRatioPercent: num(plan.ActualCogsRatioPercent),
      depreciationAnnual: num(plan.ActualDepreciationAnnual),
      taxAnnual: num(plan.ActualTaxAnnual),
      staffMonthly: num(plan.ActualStaffMonthly),
      premisesMonthly: num(plan.ActualPremisesMonthly),
      utilitiesMonthly: num(plan.ActualUtilitiesMonthly),
      otherMonthly: num(plan.ActualOtherMonthly),
    },
    plan: {
      revenueAnnual: num(plan.PlanRevenueAnnual),
      cogsRatioPercent: num(plan.PlanCogsRatioPercent),
      depreciationAnnual: num(plan.PlanDepreciationAnnual),
      taxAnnual: num(plan.PlanTaxAnnual),
      staffMonthly: num(plan.PlanStaffMonthly),
      premisesMonthly: num(plan.PlanPremisesMonthly),
      utilitiesMonthly: num(plan.PlanUtilitiesMonthly),
      otherMonthly: num(plan.PlanOtherMonthly),
    },
    debts: (debts || []).map(d => ({
      label: d.Label,
      principal: num(d.Principal),
      rateAnnualPercent: num(d.RateAnnualPercent),
      scope: d.Scope,
    })),
    requestedLimitActual: num(plan.RequestedLimitActual),
    requestedLimitPlan: num(plan.RequestedLimitPlan),
    household: {
      otherIncomeMonthly: num(plan.OtherIncomeMonthly),
      livingExpenseMonthly: num(plan.LivingExpenseMonthly),
      existingDebtPaymentMonthly: num(plan.ExistingDebtPaymentMonthly),
      maxDtiPercent: num(plan.MaxDtiPercent),
    },
    eachTime: {
      projectCost: num(plan.ProjectCost),
      ownFunds: num(plan.OwnFunds),
      tenorMonths: num(plan.TenorMonths),
      rateAnnualPercent: num(plan.RateAnnualPercent),
      collateralCapacity: num(collateralCapacity),
    },
  };
}

export function computeBusinessPlan(input: BusinessPlanInput): BusinessPlanResult {
  const balance = computeBalanceSheet(input.balanceSheet);

  const actual = computePeriod(
    input.actual, interestAnnualOf(input.debts, 'actual'), balance.currentAssets
  );
  const plan = computePeriod(
    input.plan, interestAnnualOf(input.debts, 'plan'), planCurrentAssets(input, balance.currentAssets)
  );

  const result: BusinessPlanResult = { balance, actual, plan };

  if (input.kind === 'limit') {
    result.limit = {
      actual: computeLimit(actual, input.requestedLimitActual),
      plan: computeLimit(plan, input.requestedLimitPlan),
    };
  } else {
    result.eachTime = computeEachTime(input, actual);
  }

  return result;
}
