import { kpiCompletion, kpiSeries, kpiYtdTarget, latestKpiBatches } from './kpiReport';
import type { TeamMember } from '../types/team';
import type { KpiDashboardChartPoint, KpiDashboardModel, KpiDashboardSource, KpiReportMode } from '../types/kpiDashboard';

export function kpiChartData(points:KpiDashboardChartPoint[],unit:'VND'|'count') {
  const divisor = unit === 'VND' ? 1e6 : 1;
  return points.map(point => ({
    ...point,actual:point.actual === null ? null : point.actual/divisor,target:point.target === null ? null : point.target/divisor,
  }));
}

export function formatKpiAmount(amount: number | null, unit: 'VND' | 'count') {
  if (amount === null) return { value:'—',unit:'' };
  const divisor = unit === 'count' ? 1 : Math.abs(amount) >= 1e9 ? 1e9 : Math.abs(amount) >= 1e6 ? 1e6 : 1;
  return {
    value:new Intl.NumberFormat('vi-VN',{ maximumFractionDigits:2 }).format(amount/divisor),
    unit:unit === 'count' ? '' : divisor === 1e9 ? 'tỷ' : divisor === 1e6 ? 'triệu' : 'đ',
  };
}

export function formatKpiCompletion(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('vi-VN',{ maximumFractionDigits:1 }).format(value)}%`;
}

function monthlyTarget(source: KpiDashboardSource, month: string, metric: string, userId: string | null) {
  const period = source.periods.find(row => row.Month.slice(0,7) === month);
  return (userId === null
    ? source.teamTargets.find(row => row.PeriodId === period?.Id && row.MetricCode === metric)
    : source.memberTargets.find(row => row.PeriodId === period?.Id && row.MetricCode === metric && row.UserId === userId))?.Amount ?? null;
}

export function buildKpiDashboard(
  source: KpiDashboardSource,members: TeamMember[],month: string,mode: KpiReportMode,userId: string | null,
): KpiDashboardModel {
  const model: KpiDashboardModel = { cards:[],trends:{},comparisons:{},months:[],monthlyReports:{},asOf:null };
  const period = source.periods.find(row => row.Month.slice(0,7) === month);
  model.asOf = latestKpiBatches(source.batches).find(row => row.PeriodId === period?.Id)?.DataAsOf ?? null;
  const definitions = [...source.definitions].sort((a,b) => a.SortOrder-b.SortOrder);
  for (const definition of definitions) {
    const series = kpiSeries(source.periods,source.batches,source.observations,source.memberships,
      month,definition.Code,definition.Aggregation,userId);
    const current = series.at(-1);
    const actual = (mode === 'ytd' ? current?.ytd : current?.actual) ?? null;
    const target = mode === 'ytd'
      ? kpiYtdTarget(source.periods,source.teamTargets,source.memberTargets,month,definition.Code,definition.Aggregation,userId)
      : monthlyTarget(source,month,definition.Code,userId);
    model.cards.push({ definition,actual,target,completion:kpiCompletion(actual,target) });
    model.trends[definition.Code] = series.map(point => {
      const target = monthlyTarget(source,point.month,definition.Code,userId);
      return { id:point.month,name:`T${Number(point.month.slice(5,7))}`,actual:point.actual,target,
        completion:kpiCompletion(point.actual,target) };
    });
    model.monthlyReports[definition.Code] = series.flatMap((point,index) => source.periods.some(row => row.Month.slice(0,7)===point.month) ? [{
      ...model.trends[definition.Code][index],
      ytdActual:point.ytd,
      ytdTarget:kpiYtdTarget(source.periods,source.teamTargets,source.memberTargets,point.month,
        definition.Code,definition.Aggregation,userId),
    }] : []);
    model.comparisons[definition.Code] = userId !== null ? [] : members.map(member => {
      const point = kpiSeries(source.periods,source.batches,source.observations,source.memberships,
        month,definition.Code,definition.Aggregation,member.UserId).at(-1);
      const actual = (mode === 'ytd' ? point?.ytd : point?.actual) ?? null;
      const target = mode === 'ytd'
        ? kpiYtdTarget(source.periods,source.teamTargets,source.memberTargets,month,definition.Code,definition.Aggregation,member.UserId)
        : monthlyTarget(source,month,definition.Code,member.UserId);
      return { id:member.UserId,name:member.FullName,actual,target,completion:kpiCompletion(actual,target) };
    });
  }
  model.months = Array.from({ length:Number(month.slice(5,7)) },(_,index) => ({
    month:`${month.slice(0,4)}-${String(index+1).padStart(2,'0')}`,
    values:Object.fromEntries(definitions.map(definition => [definition.Code,model.trends[definition.Code][index]?.actual ?? null])),
  }));
  return model;
}
