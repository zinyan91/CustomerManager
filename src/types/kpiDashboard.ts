import type { KpiBatch, KpiDefinition, KpiMembershipPeriod, KpiObservation, KpiPeriod, MemberKpiTarget, TeamKpiTarget } from './kpi';

export type KpiReportMode = 'month' | 'ytd';

export interface KpiDashboardSource {
  definitions: KpiDefinition[];
  periods: KpiPeriod[];
  batches: KpiBatch[];
  observations: KpiObservation[];
  memberships: KpiMembershipPeriod[];
  teamTargets: TeamKpiTarget[];
  memberTargets: MemberKpiTarget[];
}

export interface KpiDashboardCard {
  definition: KpiDefinition;
  actual: number | null;
  target: number | null;
  completion: number | null;
}

export interface KpiDashboardChartPoint {
  id: string;
  name: string;
  actual: number | null;
  target: number | null;
  completion: number | null;
}

export interface KpiDashboardMonthRow {
  month: string;
  values: Record<string, number | null>;
}

export interface KpiDashboardMonthlyResult extends KpiDashboardChartPoint {
  ytdActual: number | null;
  ytdTarget: number | null;
}

export interface KpiDashboardModel {
  cards: KpiDashboardCard[];
  trends: Record<string, KpiDashboardChartPoint[]>;
  comparisons: Record<string, KpiDashboardChartPoint[]>;
  months: KpiDashboardMonthRow[];
  monthlyReports: Record<string, KpiDashboardMonthlyResult[]>;
  asOf: string | null;
}
