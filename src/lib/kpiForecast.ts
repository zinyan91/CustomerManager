import type {
  KpiForecastBonusTier,
  KpiForecastFeeId,
  KpiForecastInputs,
  KpiForecastFeeRow,
  KpiForecastMetricId,
  KpiForecastRank,
  KpiForecastRegion,
  KpiForecastResult,
  KpiForecastRow,
} from '../types/kpiForecast';

type MetricPolicy = Partial<Record<KpiForecastMetricId, number>>;

interface RankPolicy {
  targets: MetricPolicy;
  points: MetricPolicy;
}

const REGION_COEFFICIENT: Record<KpiForecastRegion, number> = { 'Khu vực 5': 1 };

const RBO_POLICY = [
  {
    rank: 'RBO1',
    targets: { netLoan: 1200, netDeposit: 900, netCasa: 140, managedLoan: 40000, fees: 17, cards: 3, activeCustomers: 18 },
    points: { netLoan: 41, netDeposit: 14, netCasa: 7, managedLoan: 204, fees: 132, cards: 12, activeCustomers: 18 },
  },
  {
    rank: 'RBO2',
    targets: { netLoan: 1300, netDeposit: 1000, netCasa: 160, managedLoan: 43100, fees: 18, cards: 3, activeCustomers: 20 },
    points: { netLoan: 44, netDeposit: 16, netCasa: 8, managedLoan: 220, fees: 144, cards: 12, activeCustomers: 20 },
  },
  {
    rank: 'RBO3',
    targets: { netLoan: 1700, netDeposit: 1300, netCasa: 210, managedLoan: 56000, fees: 24, cards: 3, activeCustomers: 26 },
    points: { netLoan: 58, netDeposit: 20, netCasa: 10, managedLoan: 286, fees: 188, cards: 12, activeCustomers: 26 },
  },
  {
    rank: 'RBO4',
    targets: { netLoan: 1900, netDeposit: 1400, netCasa: 230, managedLoan: 61600, fees: 26, cards: 4, activeCustomers: 29 },
    points: { netLoan: 65, netDeposit: 22, netCasa: 11, managedLoan: 314, fees: 208, cards: 16, activeCustomers: 29 },
  },
  {
    rank: 'RBO5',
    targets: { netLoan: 2200, netDeposit: 1600, netCasa: 260, managedLoan: 71000, fees: 38, cards: 4, activeCustomers: 34 },
    points: { netLoan: 75, netDeposit: 25, netCasa: 13, managedLoan: 362, fees: 304, cards: 16, activeCustomers: 34 },
  },
  {
    rank: 'RBO6',
    targets: { netLoan: 3000, netDeposit: 2000, netCasa: 310, managedLoan: 85000, fees: 50, cards: 5, activeCustomers: 41 },
    points: { netLoan: 102, netDeposit: 31, netCasa: 15, managedLoan: 434, fees: 400, cards: 20, activeCustomers: 41 },
  },
] as const;

const CSO_POLICY = [
  {
    rank: 'CSO1',
    targets: { netDeposit: 6400, netCasa: 150, managedDeposit: 410000, fees: 19, cards: 2, activeCustomers: 20 },
    points: { netDeposit: 99, netCasa: 7, managedDeposit: 318, fees: 154, cards: 8, activeCustomers: 20 },
  },
  {
    rank: 'CSO2',
    targets: { netDeposit: 8300, netCasa: 180, managedDeposit: 451800, fees: 25, cards: 3, activeCustomers: 25 },
    points: { netDeposit: 129, netCasa: 9, managedDeposit: 347, fees: 199, cards: 12, activeCustomers: 25 },
  },
  {
    rank: 'CSO3',
    targets: { netDeposit: 10800, netCasa: 200, managedDeposit: 496000, fees: 32, cards: 4, activeCustomers: 34 },
    points: { netDeposit: 153, netCasa: 10, managedDeposit: 383, fees: 238, cards: 16, activeCustomers: 34 },
  },
] as const;

const RANK_POLICY: Record<KpiForecastRank, RankPolicy> = Object.fromEntries(
  [...RBO_POLICY, ...CSO_POLICY].map(({ rank, targets, points }) => [rank, { targets, points }]),
) as Record<KpiForecastRank, RankPolicy>;

const METRIC_META: Record<KpiForecastMetricId, Pick<KpiForecastRow, 'label' | 'unit'>> = {
  netLoan: { label: 'Tăng ròng dư nợ', unit: 'Triệu đồng' },
  netDeposit: { label: 'Tăng ròng huy động CKH', unit: 'Triệu đồng' },
  netCasa: { label: 'Tăng ròng CASA bình quân', unit: 'Triệu đồng' },
  managedLoan: { label: 'Quy mô dư nợ quản lý', unit: 'Triệu đồng' },
  fees: { label: 'Doanh số phí', unit: 'Triệu đồng' },
  cards: { label: 'Số lượng thẻ tín dụng active', unit: 'Thẻ' },
  activeCustomers: { label: 'Số lượng khách hàng active', unit: 'Khách hàng' },
  managedDeposit: { label: 'Quy mô huy động CKH chăm sóc', unit: 'Triệu đồng' },
};

const FEE_POINT_RATE: Record<KpiForecastFeeId, number> = {
  beautifulNumber: 8,
  nonLifeInsurance: 8,
  lifeInsurance: 4,
  cancelledInsurance: 6,
  creditActivity: 10,
  fx: 10,
  counterAndDigital: 10,
};

export const KPI_FORECAST_FEE_LABELS: Record<KpiForecastFeeId, string> = {
  beautifulNumber: 'Số đẹp',
  nonLifeInsurance: 'Phi nhân thọ',
  lifeInsurance: 'Nhân thọ',
  cancelledInsurance: 'Hủy Bảo hiểm',
  creditActivity: 'Hoạt động tín dụng',
  fx: 'FX',
  counterAndDigital: 'Dịch vụ tại quầy & NHĐT',
};

export function kpiTenureCoefficient(months: number): number {
  if (months < 3) return 0.1;
  if (months < 6) return 0.2;
  if (months < 9) return 0.3;
  if (months < 12) return 0.4;
  if (months < 15) return 0.55;
  if (months < 18) return 0.7;
  if (months < 21) return 0.8;
  if (months < 24) return 0.95;
  return 1;
}

function nonNegativeCompletion(actual: number, plan: number, cap = Number.POSITIVE_INFINITY) {
  if (plan === 0) return 0;
  return Math.min(cap, Math.max(actual / plan, 0));
}

function adjustedValue(
  base: number,
  metric: KpiForecastMetricId,
  inputs: Pick<KpiForecastInputs, 'rank' | 'region' | 'tenureMonths'>,
) {
  const region = REGION_COEFFICIENT[inputs.region];
  const juniorLevelOne = inputs.rank.endsWith('1') && inputs.tenureMonths < 3;
  if (metric === 'managedLoan' || metric === 'managedDeposit') {
    return base * region * kpiTenureCoefficient(inputs.tenureMonths);
  }
  if (metric === 'activeCustomers') return base * (juniorLevelOne ? 0.7 : 1);
  if (metric === 'fees' || metric === 'cards') {
    return juniorLevelOne ? base * 0.7 : base * region;
  }
  return base * (juniorLevelOne ? 0.7 : 1) * region;
}

function feeActual(inputs: KpiForecastInputs) {
  return Object.values(inputs.fees).reduce((sum, value) => sum + value, 0);
}

function feePoints(inputs: KpiForecastInputs) {
  return (Object.entries(inputs.fees) as [KpiForecastFeeId, number][])
    .reduce((sum, [id, value]) => sum + value * FEE_POINT_RATE[id], 0);
}

function metricActual(inputs: KpiForecastInputs, id: KpiForecastMetricId) {
  return id === 'fees' ? feeActual(inputs) : inputs.actuals[id];
}

function actualPoints(inputs: KpiForecastInputs, id: KpiForecastMetricId, rawPlanPoints: number) {
  const actual = metricActual(inputs, id);
  if (id === 'netLoan') return inputs.rank.startsWith('RBO') ? actual * 34 / 1000 : 0;
  if (id === 'netDeposit') return actual * 16 / 1000;
  if (id === 'netCasa') return actual * 49 / 1000;
  if (id === 'managedLoan') {
    return inputs.rank.startsWith('RBO') ? Math.min(actual * 5 / 1000, rawPlanPoints * 1.3) : 0;
  }
  if (id === 'fees') return feePoints(inputs);
  if (id === 'cards') return actual * 4;
  if (id === 'activeCustomers') return actual;
  return inputs.rank.startsWith('CSO') ? Math.min(actual * 0.8 / 1000, rawPlanPoints * 1.3) : 0;
}

function makeRow(inputs: KpiForecastInputs, id: KpiForecastMetricId, policy: RankPolicy): KpiForecastRow | null {
  const rawTarget = policy.targets[id];
  const rawPlanPoints = policy.points[id];
  if (rawTarget === undefined || rawPlanPoints === undefined) return null;
  const plan = adjustedValue(rawTarget, id, inputs);
  const planPoints = adjustedValue(rawPlanPoints, id, inputs);
  const actual = metricActual(inputs, id);
  return {
    id,
    ...METRIC_META[id],
    plan,
    actual,
    completion: nonNegativeCompletion(actual, plan, id === 'managedLoan' || id === 'managedDeposit' ? 1.3 : undefined),
    planPoints,
    actualPoints: actualPoints(inputs, id, rawPlanPoints),
  };
}

function bonusTiers(planPoints: number, actualPointsValue: number, growthCompletion: number): KpiForecastBonusTier[] {
  const tier1Points = Math.max(0, Math.min(actualPointsValue - planPoints, planPoints * 0.2));
  const tier2Points = Math.max(0, Math.min(actualPointsValue - planPoints * 1.2, planPoints * 0.2));
  const tier3Points = Math.max(0, actualPointsValue - planPoints * 1.4);
  const tier2Rate = growthCompletion >= 0.6 ? 6000 : 4000;
  const tier3Rate = growthCompletion >= 1 ? 8000 : 6000;
  return [
    { id: 'tier1', label: 'Từ 100% đến dưới 120%', points: tier1Points, rate: 4000, amount: tier1Points * 4000 },
    { id: 'tier2', label: 'Từ 120% đến dưới 140%', points: tier2Points, rate: tier2Rate, amount: tier2Points * tier2Rate },
    { id: 'tier3', label: 'Trên 140%', points: tier3Points, rate: tier3Rate, amount: tier3Points * tier3Rate },
  ];
}

export function createKpiForecastInputs(): KpiForecastInputs {
  return {
    rank: 'RBO1',
    region: 'Khu vực 5',
    tenureMonths: 8,
    actuals: {
      netLoan: 0,
      netDeposit: 370,
      netCasa: 0,
      managedLoan: 2627,
      cards: 0,
      activeCustomers: 0,
      managedDeposit: 650000,
    },
    fees: {
      beautifulNumber: 2,
      nonLifeInsurance: 15,
      lifeInsurance: 0,
      cancelledInsurance: 0,
      creditActivity: 0.02,
      fx: 0,
      counterAndDigital: 0,
    },
  };
}

export function calculateKpiForecast(inputs: KpiForecastInputs): KpiForecastResult {
  const policy = RANK_POLICY[inputs.rank];
  const order: KpiForecastMetricId[] = [
    'netLoan',
    'netDeposit',
    'netCasa',
    'managedLoan',
    'fees',
    'cards',
    'activeCustomers',
    'managedDeposit',
  ];
  const rows = order.flatMap(id => {
    const row = makeRow(inputs, id, policy);
    return row ? [row] : [];
  });
  const feeRows: KpiForecastFeeRow[] = (Object.keys(KPI_FORECAST_FEE_LABELS) as KpiForecastFeeId[]).map(id => ({
    id,
    label: KPI_FORECAST_FEE_LABELS[id],
    actual: inputs.fees[id],
    actualPoints: inputs.fees[id] * FEE_POINT_RATE[id],
  }));
  const planPoints = rows.reduce((sum, row) => sum + row.planPoints, 0);
  const actualPointsValue = rows.reduce((sum, row) => sum + row.actualPoints, 0);
  const completion = planPoints === 0 ? 0 : Math.min(6, actualPointsValue / planPoints);
  const growthId: KpiForecastMetricId = inputs.rank.startsWith('RBO') ? 'netLoan' : 'netDeposit';
  const growthCompletion = rows.find(row => row.id === growthId)?.completion ?? 0;
  const tiers = bonusTiers(planPoints, actualPointsValue, growthCompletion);
  return {
    rows,
    feeRows,
    feeActual: feeActual(inputs),
    planPoints,
    actualPoints: actualPointsValue,
    completion,
    growthCompletion,
    bonusTiers: tiers,
    bonus: tiers.reduce((sum, tier) => sum + tier.amount, 0),
  };
}
