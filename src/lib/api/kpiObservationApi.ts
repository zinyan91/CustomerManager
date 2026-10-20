import { supabase } from '../supabase';
import type { KpiBatch, KpiMembershipPeriod, KpiObservation, KpiObservationInput } from '../../types/kpi';

export async function fetchKpiMembershipHistory(teamId: string): Promise<KpiMembershipPeriod[]> {
  const result: KpiMembershipPeriod[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('TeamMemberships').select('UserId, EffectiveFrom, EffectiveTo')
      .eq('TeamId', teamId).order('Id').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    result.push(...data as KpiMembershipPeriod[]);
    if (data.length < 500) return result;
  }
}

export async function fetchKpiBatches(periodIds: string[]): Promise<KpiBatch[]> {
  const result: KpiBatch[] = [];
  for (let lot = 0; lot < periodIds.length; lot += 100) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('KpiInputBatches')
        .select('Id, PeriodId, Revision, DataAsOf, SourceName, Rows, PublishedAt')
        .in('PeriodId', periodIds.slice(lot, lot + 100)).order('PeriodId').order('Revision', { ascending: false })
        .range(offset, offset + 499);
      if (error) throw new Error(error.message);
      result.push(...data as KpiBatch[]);
      if (data.length < 500) break;
    }
  }
  return result;
}

export async function fetchKpiObservations(batchIds: string[]): Promise<KpiObservation[]> {
  const result: KpiObservation[] = [];
  for (let lot = 0; lot < batchIds.length; lot += 100) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('KpiObservations').select('*')
        .in('BatchId', batchIds.slice(lot, lot + 100)).order('BatchId').order('UserId').order('MetricCode')
        .range(offset, offset + 499);
      if (error) throw new Error(error.message);
      result.push(...data as KpiObservation[]);
      if (data.length < 500) break;
    }
  }
  return result;
}

export async function publishKpiImport(input: {
  periodId: string; revision: number; asOf: string; source: string; reason: string; rows: KpiObservationInput[];
}): Promise<void> {
  const { error } = await supabase.rpc('publish_kpi_import', {
    p_period: input.periodId, p_revision: input.revision, p_as_of: input.asOf,
    p_source: input.source, p_reason: input.reason, p_rows: input.rows,
  });
  if (error) throw new Error(error.message);
}
