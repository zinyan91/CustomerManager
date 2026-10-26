export const KPI_FORECAST_RANKS = [
  'RBO1', 'RBO2', 'RBO3', 'RBO4', 'RBO5', 'RBO6',
  'CSO1', 'CSO2', 'CSO3',
] as const;

export type KpiForecastRank = typeof KPI_FORECAST_RANKS[number];

export const KPI_FORECAST_REGIONS = [
  'Khu vực 5',
] as const;

export type KpiForecastRegion = typeof KPI_FORECAST_REGIONS[number];

export type KpiForecastMetricId =
  | 'netLoan'
  | 'netDeposit'
  | 'netCasa'
  | 'managedLoan'
  | 'fees'
  | 'cards'
  | 'activeCustomers'
  | 'managedDeposit';

export type KpiForecastFeeId =
  | 'beautifulNumber'
  | 'nonLifeInsurance'
  | 'lifeInsurance'
  | 'cancelledInsurance'
  | 'creditActivity'
  | 'fx'
  | 'counterAndDigital';

export interface KpiForecastInputs {
  rank: KpiForecastRank;
  region: KpiForecastRegion;
  tenureMonths: number;
  actuals: Record<Exclude<KpiForecastMetricId, 'fees'>, number>;
  fees: Record<KpiForecastFeeId, number>;
}

export interface KpiForecastRow {
  id: KpiForecastMetricId;
  label: string;
  unit: 'Triệu đồng' | 'Thẻ' | 'Khách hàng';
  plan: number;
  actual: number;
  completion: number;
  planPoints: number;
  actualPoints: number;
}

export interface KpiForecastFeeRow {
  id: KpiForecastFeeId;
  label: string;
  actual: number;
  actualPoints: number;
}

export interface KpiForecastBonusTier {
  id: 'tier1' | 'tier2' | 'tier3';
  label: string;
  points: number;
  rate: number;
  amount: number;
}

export interface KpiForecastResult {
  rows: KpiForecastRow[];
  feeRows: KpiForecastFeeRow[];
  feeActual: number;
  planPoints: number;
  actualPoints: number;
  completion: number;
  growthCompletion: number;
  bonusTiers: KpiForecastBonusTier[];
  bonus: number;
}
