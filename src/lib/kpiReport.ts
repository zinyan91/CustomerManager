import type { KpiBatch, KpiMembershipPeriod, KpiObservation, KpiPeriod, KpiSeriesPoint, MemberKpiTarget, TeamKpiTarget } from '../types/kpi';

export function kpiYtdTarget(
  periods: KpiPeriod[], teamTargets: TeamKpiTarget[], memberTargets: MemberKpiTarget[],
  throughMonth: string, metric: string, aggregation: 'flow' | 'stock', userId: string | null,
): number | null {
  const endMonth = Number(throughMonth.slice(5, 7));
  let sum = 0;
  for (let month = aggregation === 'stock' ? endMonth : 1; month <= endMonth; month++) {
    const key = `${throughMonth.slice(0, 4)}-${String(month).padStart(2, '0')}`;
    const period = periods.find(row => row.Month.slice(0, 7) === key);
    const target = userId === null
      ? teamTargets.find(row => row.PeriodId === period?.Id && row.MetricCode === metric)
      : memberTargets.find(row => row.PeriodId === period?.Id && row.MetricCode === metric && row.UserId === userId);
    if (!target) return null;
    sum += target.Amount;
  }
  return Math.round(sum * 100) / 100;
}

export function kpiCompletion(actual: number | null, target: number | null): number | null {
  return actual === null || target === null || target <= 0 ? null : Math.round(actual / target * 10000) / 100;
}

export function latestKpiBatches(batches: KpiBatch[]): KpiBatch[] {
  const latest = new Map<string, KpiBatch>();
  for (const batch of batches) {
    if ((latest.get(batch.PeriodId)?.Revision ?? 0) < batch.Revision) latest.set(batch.PeriodId, batch);
  }
  return [...latest.values()];
}

export function kpiSeries(
  periods: KpiPeriod[], batches: KpiBatch[], observations: KpiObservation[], memberships: KpiMembershipPeriod[],
  throughMonth: string, metric: string, aggregation: 'flow' | 'stock', userId: string | null,
): KpiSeriesPoint[] {
  const latest = latestKpiBatches(batches);
  const endMonth = Number(throughMonth.slice(5, 7));
  const year = throughMonth.slice(0, 4);
  let running: number | null = 0;
  return Array.from({ length: endMonth }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    const period = periods.find(item => item.Month.slice(0, 7) === month);
    const batch = latest.find(item => item.PeriodId === period?.Id);
    const endOfSourceDay = batch ? Date.parse(`${batch.DataAsOf}T00:00:00+07:00`) + 86400000 : 0;
    const users = userId ? [userId] : [...new Set(memberships.filter(member =>
      Date.parse(member.EffectiveFrom) < endOfSourceDay
      && (member.EffectiveTo === null || Date.parse(member.EffectiveTo) >= endOfSourceDay)).map(member => member.UserId))];
    const rows = batch ? observations.filter(row => row.BatchId === batch.Id && row.MetricCode === metric && users.includes(row.UserId)) : [];
    const complete = Boolean(batch) && users.length > 0 && users.every(id => rows.some(row => row.UserId === id));
    const actual = complete ? Math.round(rows.reduce((sum, row) => sum + row.Amount, 0) * 100) / 100 : null;
    running = running !== null && actual !== null ? Math.round((running + actual) * 100) / 100 : null;
    return { month, actual, ytd: aggregation === 'stock' ? actual : running };
  });
}
