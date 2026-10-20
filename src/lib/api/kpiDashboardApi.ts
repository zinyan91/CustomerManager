import { fetchKpiDefinitions, fetchKpiPeriods, fetchKpiTargets } from './kpiTargetsApi';
import { fetchKpiBatches, fetchKpiMembershipHistory, fetchKpiObservations } from './kpiObservationApi';
import { latestKpiBatches } from '../kpiReport';
import type { KpiDashboardSource } from '../../types/kpiDashboard';

export async function fetchKpiDashboard(teamId: string,year: string): Promise<KpiDashboardSource> {
  const [definitions,allPeriods,memberships] = await Promise.all([
    fetchKpiDefinitions(),fetchKpiPeriods(teamId),fetchKpiMembershipHistory(teamId),
  ]);
  const periods = allPeriods.filter(period => period.Month.startsWith(`${year}-`));
  const [allBatches,targets] = await Promise.all([
    fetchKpiBatches(periods.map(period => period.Id)),Promise.all(periods.map(period => fetchKpiTargets(period.Id))),
  ]);
  const batches = latestKpiBatches(allBatches);
  const observations = await fetchKpiObservations(batches.map(batch => batch.Id));
  return {
    definitions,periods,memberships,batches,observations,
    teamTargets:targets.flatMap(row => row.teamTargets),memberTargets:targets.flatMap(row => row.memberTargets),
  };
}
