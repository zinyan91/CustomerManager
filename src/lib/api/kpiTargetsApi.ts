import { supabase } from '../supabase';
import type { KpiDefinition, KpiPeriod, KpiTargetInput, MemberKpiTarget, TeamKpiTarget } from '../../types/kpi';

const PAGE_SIZE = 500;

export async function fetchKpiDefinitions(): Promise<KpiDefinition[]> {
  const { data, error } = await supabase.from('KpiDefinitions').select('*').order('SortOrder');
  if (error) throw new Error(error.message);
  return data as KpiDefinition[];
}

export async function fetchKpiPeriods(teamId: string): Promise<KpiPeriod[]> {
  const result: KpiPeriod[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('KpiPeriods').select('Id, TeamId, Month, Status')
      .eq('TeamId', teamId).order('Month', { ascending: false }).order('Id').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    result.push(...data as KpiPeriod[]);
    if (data.length < PAGE_SIZE) return result;
  }
}

async function fetchTargets<T>(table: 'TeamKpiTargets' | 'MemberKpiTargets', periodId: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from(table).select('*').eq('PeriodId', periodId).order('MetricCode');
    if (table === 'MemberKpiTargets') query = query.order('UserId');
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    result.push(...data as T[]);
    if (data.length < PAGE_SIZE) return result;
  }
}

export async function fetchKpiTargets(periodId: string) {
  const [teamTargets, memberTargets] = await Promise.all([
    fetchTargets<TeamKpiTarget>('TeamKpiTargets', periodId),
    fetchTargets<MemberKpiTarget>('MemberKpiTargets', periodId),
  ]);
  return { teamTargets, memberTargets };
}

export async function createKpiPeriod(teamId: string, month: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_kpi_period', { p_team: teamId, p_month: `${month}-01` });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function saveKpiTarget(input: KpiTargetInput): Promise<void> {
  const { error } = await supabase.rpc('save_kpi_target', {
    p_period: input.periodId, p_metric: input.metricCode, p_user: input.userId,
    p_amount: input.amount, p_version: input.version, p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function setKpiPeriodStatus(periodId: string, status: 'open' | 'closed', reason: string): Promise<void> {
  const { error } = await supabase.rpc('set_kpi_period_status', { p_period: periodId, p_status: status, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
}
