import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchKpiDashboard } from '../lib/api/kpiDashboardApi';
import type { KpiDashboardSource } from '../types/kpiDashboard';

interface ReportState {
  key: string;
  data: KpiDashboardSource | null;
  error: string | null;
}

export function useTeamKpiDashboard(teamId: string,year: string) {
  const { user,role } = useAuth();
  const identity = `${user?.id ?? ''}:${role ?? ''}:${teamId}:${year}`;
  const [revision,setRevision] = useState(0);
  const key = `${identity}:${revision}`;
  const [state,setState] = useState<ReportState | null>(null);
  const reload = useCallback(() => setRevision(value => value+1),[]);
  useEffect(() => {
    let cancelled = false;
    void fetchKpiDashboard(teamId,year).then(data => {
      if (!cancelled) setState({ key,data,error:null });
    }).catch(cause => {
      if (!cancelled) setState({ key,data:null,error:cause instanceof Error ? cause.message : String(cause) });
    });
    return () => { cancelled = true; };
  },[teamId,year,key]);
  const current = state?.key === key ? state : null;
  return { data:current?.data ?? null,error:current?.error ?? null,loading:current === null,reload };
}
