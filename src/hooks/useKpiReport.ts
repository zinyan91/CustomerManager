import { useEffect, useState } from 'react';
import { fetchKpiBatches, fetchKpiMembershipHistory, fetchKpiObservations } from '../lib/api/kpiObservationApi';
import { latestKpiBatches } from '../lib/kpiReport';
import { fetchKpiTargets } from '../lib/api/kpiTargetsApi';
import type { KpiBatch, KpiMembershipPeriod, KpiObservation, KpiPeriod, MemberKpiTarget, TeamKpiTarget } from '../types/kpi';

export function useKpiReport(teamId: string, periods: KpiPeriod[], month: string, revision: number) {
  const [data, setData] = useState<{
    batches: KpiBatch[]; observations: KpiObservation[]; memberships: KpiMembershipPeriod[];
    teamTargets: TeamKpiTarget[]; memberTargets: MemberKpiTarget[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    const load = async () => {
      const relevant = periods.filter(period => period.Month.slice(0, 4) === month.slice(0, 4) && period.Month.slice(0, 7) <= month);
      const [batches, memberships, targets] = await Promise.all([
        fetchKpiBatches(relevant.map(period => period.Id)), fetchKpiMembershipHistory(teamId),
        Promise.all(relevant.map(period => fetchKpiTargets(period.Id))),
      ]);
      const latest = latestKpiBatches(batches);
      const observations = await fetchKpiObservations(latest.map(batch => batch.Id));
      if (cancelled) return;
      setData({ batches: latest, observations, memberships,
        teamTargets: targets.flatMap(row => row.teamTargets), memberTargets: targets.flatMap(row => row.memberTargets) });
      setLoading(false);
    };
    void load().catch(cause => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [teamId, periods, month, revision]);
  return { data, error, loading };
}
