import { pvAnnuityFactor, dtiMaxMonthlyPayment } from './calcMath';

export const DEFAULT_MAX_DTI_PERCENT = 60;
export const DEFAULT_GROWTH_FACTOR = 1.5;

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
  cogsAnnual: number;
  depreciationAnnual: number;
  taxAnnual: number;
  staffMonthly: number;
  premisesMonthly: number;
  utilitiesMonthly: number;
  otherMonthly: number;
}

export const PERIOD_DRIVER_KEYS: (keyof PeriodDrivers)[] = [
  'revenueAnnual', 'cogsAnnual', 'depreciationAnnual', 'taxAnnual',
  'staffMonthly', 'premisesMonthly', 'utilitiesMonthly', 'otherMonthly',
];

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
  actualYear: number;
  planYear: number;
  balanceSheetDate: string;
  balanceSheet: BalanceSheetInput;
  actual: PeriodDrivers;
  growthFactor: number;
  planOverrides: Partial<PeriodDrivers>;
  debts: DebtItem[];
  requestedLimitActual: number;
  requestedLimitPlan: number;
  household: HouseholdInput;
  eachTime: EachTimeInput;
  basis: Partial<Record<BasisKey, string>>;
}

export type BasisKey =
  | 'revenue' | 'cogs' | 'staff' | 'premises' | 'utilities'
  | 'interest' | 'depreciation' | 'other' | 'tax' | 'profit';

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

export function planDriversOf(input: BusinessPlanInput): PeriodDrivers {
  const factor = num(input.growthFactor);
  const overrides = input.planOverrides || {};
  const out = {} as PeriodDrivers;

  for (const key of PERIOD_DRIVER_KEYS) {
    const daoDe = overrides[key];
    out[key] = daoDe === null || daoDe === undefined || isNaN(daoDe)
      ? num(input.actual[key]) * factor
      : daoDe;
  }
  return out;
}

export function revenueGrowthOf(input: BusinessPlanInput): number {
  const base = num(input.actual.revenueAnnual);
  if (base === 0) return 0;
  return num(planDriversOf(input).revenueAnnual) / base - 1;
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
    cogs: num(d.cogsAnnual),
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

export function emptyBusinessPlanInput(todayStr: string): BusinessPlanInput {
  const year = parseInt((todayStr || '').slice(0, 4), 10) || new Date().getFullYear();
  const drivers: PeriodDrivers = {
    revenueAnnual: 0, cogsAnnual: 0, depreciationAnnual: 0, taxAnnual: 0,
    staffMonthly: 0, premisesMonthly: 0, utilitiesMonthly: 0, otherMonthly: 0,
  };

  return {
    kind: 'limit',
    actualYear: year,
    planYear: year + 1,
    balanceSheetDate: todayStr,
    balanceSheet: {
      cash: 0, inventory: 0, receivables: 0, otherCurrentAssets: 0,
      longTermReceivables: 0, fixedAssets: 0, otherLongTermAssets: 0,
      shortTermDebt: 0, otherShortTermDebt: 0, longTermDebt: 0, otherLongTermDebt: 0,
    },
    actual: drivers,
    growthFactor: DEFAULT_GROWTH_FACTOR,
    planOverrides: {},
    debts: [],
    requestedLimitActual: 0,
    requestedLimitPlan: 0,
    household: {
      otherIncomeMonthly: 0, livingExpenseMonthly: 0,
      existingDebtPaymentMonthly: 0, maxDtiPercent: DEFAULT_MAX_DTI_PERCENT,
    },
    eachTime: {
      projectCost: 0, ownFunds: 0, tenorMonths: 0,
      rateAnnualPercent: 0, collateralCapacity: 0,
    },
    basis: {},
  };
}

export function computeBusinessPlan(input: BusinessPlanInput): BusinessPlanResult {
  const balance = computeBalanceSheet(input.balanceSheet);

  const actual = computePeriod(
    input.actual, interestAnnualOf(input.debts, 'actual'), balance.currentAssets
  );
  const plan = computePeriod(
    planDriversOf(input),
    interestAnnualOf(input.debts, 'plan'),
    planCurrentAssets(input, balance.currentAssets)
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