import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createKpiPeriod, fetchKpiDefinitions, fetchKpiPeriods, fetchKpiTargets, saveKpiTarget, setKpiPeriodStatus } from '../lib/api/kpiTargetsApi';
import type { KpiTargetInput, KpiTargetsData } from '../types/kpi';

export function useKpiTargets(teamId: string) {
  const { user, role } = useAuth();
  const userId = user?.id ?? '';
  const identity = `${userId}:${role ?? ''}:${teamId}`;
  const [data, setData] = useState<(KpiTargetsData & { identity: string }) | null>(null);
  const [selectedPeriod, selectPeriod] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => setRefresh(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    if (!teamId || !userId || !role) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const [definitions, periods] = await Promise.all([fetchKpiDefinitions(), fetchKpiPeriods(teamId)]);
      const periodId = periods.find(period => period.Id === selectedPeriod)?.Id ?? periods[0]?.Id ?? '';
      const targets = periodId ? await fetchKpiTargets(periodId) : { teamTargets: [], memberTargets: [] };
      if (cancelled) return;
      setData({ identity, definitions, periods, periodId, ...targets });
      setLoading(false);
    };
    void load().catch(cause => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [teamId, identity, selectedPeriod, refresh, userId, role]);

  const create = useCallback(async (month: string) => {
    const id = await createKpiPeriod(teamId, month);
    selectPeriod(id);
    reload();
  }, [teamId, reload]);
  const save = useCallback(async (input: KpiTargetInput) => {
    await saveKpiTarget(input);
    reload();
  }, [reload]);
  const changeStatus = useCallback(async (periodId: string, status: 'open' | 'closed', reason: string) => {
    await setKpiPeriodStatus(periodId, status, reason);
    reload();
  }, [reload]);
  return { data: data?.identity === identity ? data : null, loading, error, selectPeriod, create, save, changeStatus, reload };
}
