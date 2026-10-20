export interface KpiDefinition {
  Code: string;
  Name: string;
  Unit: 'VND' | 'count';
  Aggregation: 'flow' | 'stock';
  SortOrder: number;
}

export interface KpiPeriod {
  Id: string;
  TeamId: string;
  Month: string;
  Status: 'open' | 'closed';
}

export interface TeamKpiTarget {
  PeriodId: string;
  MetricCode: string;
  Amount: number;
  Version: number;
}

export interface MemberKpiTarget extends TeamKpiTarget {
  UserId: string;
}

export interface KpiTargetsData {
  definitions: KpiDefinition[];
  periods: KpiPeriod[];
  periodId: string;
  teamTargets: TeamKpiTarget[];
  memberTargets: MemberKpiTarget[];
}

export interface KpiTargetInput {
  periodId: string;
  metricCode: string;
  userId: string | null;
  amount: number;
  version: number;
  reason: string;
}

export interface KpiTargetRow {
  definition: KpiDefinition;
  budget: number | null;
  allocated: number | null;
  remaining: number | null;
  own: number | null;
}

export const KPI_FEE_FIELDS = [
  'FeeNiceNumber', 'FeeNonLife', 'FeeLife', 'FeeCancellation', 'FeeCredit', 'FeeFx', 'FeeCounterDigital',
] as const;
export type KpiFeeField = typeof KPI_FEE_FIELDS[number];

export type KpiObservationInput = {
  UserId: string;
  MetricCode: string;
  Amount: number;
} & Partial<Record<KpiFeeField, number>>;

export interface KpiBatch {
  Id: string;
  PeriodId: string;
  Revision: number;
  DataAsOf: string;
  SourceName: string;
  Rows: number;
  PublishedAt: string;
}

export interface KpiObservation extends KpiObservationInput {
  BatchId: string;
}

export interface KpiImportDifference {
  userId: string;
  metricCode: string;
  before: number | null;
  after: number | null;
  change: 'added' | 'changed' | 'removed' | 'unchanged';
}

export interface KpiImportPreview {
  rows: KpiObservationInput[];
  errors: string[];
  differences: KpiImportDifference[];
  totals: { metricCode: string; before: number | null; after: number | null }[];
}

export interface KpiMembershipPeriod {
  UserId: string;
  EffectiveFrom: string;
  EffectiveTo: string | null;
}

export interface KpiSeriesPoint {
  month: string;
  actual: number | null;
  ytd: number | null;
}
