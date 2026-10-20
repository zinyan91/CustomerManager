import type { KpiTargetRow, KpiTargetsData } from '../types/kpi';

export function kpiTargetRows(data: KpiTargetsData, userId: string, viewTeam: boolean): KpiTargetRow[] {
  return data.definitions.map(definition => {
    const budget = data.teamTargets.find(target => target.MetricCode === definition.Code)?.Amount ?? null;
    const own = data.memberTargets.find(target => target.MetricCode === definition.Code && target.UserId === userId)?.Amount ?? null;
    const allocated = viewTeam && budget !== null
      ? Math.round(data.memberTargets.filter(target => target.MetricCode === definition.Code)
        .reduce((sum, target) => sum + target.Amount, 0) * 100) / 100 : null;
    return {
      definition, budget, own, allocated,
      remaining: budget !== null && allocated !== null ? Math.round((budget - allocated) * 100) / 100 : null,
    };
  });
}
