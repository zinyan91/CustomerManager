import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKpiReport } from '../../hooks/useKpiReport';
import { kpiCompletion, kpiSeries, kpiYtdTarget } from '../../lib/kpiReport';
import type { KpiTargetsData } from '../../types/kpi';
import type { TeamMember } from '../../types/team';
import { KpiResultCharts } from './KpiResultCharts';

const format = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);

export function KpiResultsPanel({ teamId, targets, month, members, viewTeam, revision }: {
  teamId: string; targets: KpiTargetsData; month: string; members: TeamMember[]; viewTeam: boolean; revision: number;
}) {
  const { user } = useAuth();
  const [scope, setScope] = useState(viewTeam ? 'team' : user?.id ?? '');
  const [metric, setMetric] = useState(targets.definitions[0]?.Code ?? '');
  const controller = useKpiReport(teamId, targets.periods, month, revision);
  const selectedUser = viewTeam && scope === 'team' ? null : viewTeam ? scope : user?.id ?? '';
  const data = controller.data;
  const rows = data ? targets.definitions.map(definition => {
    const point = kpiSeries(targets.periods, data.batches, data.observations, data.memberships, month,
      definition.Code, definition.Aggregation, selectedUser).at(-1);
    const target = selectedUser === null ? targets.teamTargets.find(row => row.MetricCode === definition.Code)?.Amount
      : targets.memberTargets.find(row => row.MetricCode === definition.Code && row.UserId === selectedUser)?.Amount;
    const ytdTarget = kpiYtdTarget(targets.periods, data.teamTargets, data.memberTargets, month,
      definition.Code, definition.Aggregation, selectedUser);
    return { definition, actual: point?.actual ?? null, ytd: point?.ytd ?? null, target: target ?? null,
      ytdTarget, completion: kpiCompletion(point?.actual ?? null, target ?? null) };
  }) : [];
  const definition = targets.definitions.find(row => row.Code === metric);
  const series = data && definition ? kpiSeries(targets.periods, data.batches, data.observations, data.memberships,
    month, metric, definition.Aggregation, selectedUser) : [];
  const comparison = data && definition ? members.map(member => ({
    name: member.FullName,
    actual: kpiSeries(targets.periods, data.batches, data.observations, data.memberships, month,
      metric, definition.Aggregation, member.UserId).at(-1)?.actual ?? null,
  })) : [];
  const currentBatch = data?.batches.find(batch => batch.PeriodId === targets.periodId);
  return <section className="rounded-lg border border-line bg-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-line">
      <h2 className="font-semibold">Kết quả KPI</h2>
      {viewTeam && <label className="text-sm flex items-center gap-2">Phạm vi
        <select className="border border-line rounded-md bg-surface px-3 py-2" value={scope} onChange={event => setScope(event.target.value)}>
          <option value="team">Toàn team</option>
          {members.map(member => <option key={member.UserId} value={member.UserId}>{member.FullName}</option>)}
        </select>
      </label>}
    </div>
    {controller.error ? <p role="alert" className="p-5 text-sm text-red-700 dark:text-red-300">{controller.error}</p>
      : controller.loading ? <p role="status" className="p-8 text-center text-sm text-ink-muted">Đang tải kết quả…</p>
        : <>
          {currentBatch ? <div className="px-5 py-3 text-sm text-ink-muted flex flex-wrap gap-5">
            <span>Mốc dữ liệu: {currentBatch.DataAsOf.split('-').reverse().join('/')}</span><span>Revision {currentBatch.Revision}</span>
          </div> : <p className="p-5 text-sm text-ink-muted">Chưa có dữ liệu KPI được công bố trong kỳ.</p>}
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-surface"><tr>{['Chỉ tiêu', 'Đơn vị', 'KH tháng', 'TH tháng', '% tháng', 'KH lũy kế / cuối kỳ', 'TH lũy kế / cuối kỳ'].map(label => <th key={label} className="px-4 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map(row => <tr key={row.definition.Code}>
              <td className="px-4 py-3 font-medium">{row.definition.Name}</td><td className="px-4 py-3">{row.definition.Unit === 'VND' ? 'VND' : 'Số lượng'}</td>
              <td className="px-4 py-3 tabular-nums">{format(row.target)}</td><td className="px-4 py-3 tabular-nums">{format(row.actual)}</td>
              <td className="px-4 py-3 tabular-nums">{row.completion === null ? '—' : `${format(row.completion)}%`}</td>
              <td className="px-4 py-3 tabular-nums">{format(row.ytdTarget)}</td>
              <td className="px-4 py-3 tabular-nums">{format(row.ytd)}</td>
            </tr>)}</tbody>
          </table></div>
          <div className="p-5 border-t border-line">
            <label className="text-sm flex flex-wrap items-center gap-3">Biểu đồ chỉ tiêu
              <select className="border border-line rounded-md bg-surface px-3 py-2 max-w-full" value={metric} onChange={event => setMetric(event.target.value)}>
                {targets.definitions.map(row => <option key={row.Code} value={row.Code}>{row.Name}</option>)}
              </select>
            </label>
            <KpiResultCharts series={series} comparison={viewTeam ? comparison : []} unit={definition?.Unit ?? 'VND'} />
          </div>
        </>}
  </section>;
}
