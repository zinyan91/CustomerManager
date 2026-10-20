import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKpiTargets } from '../../hooks/useKpiTargets';
import { kpiTargetRows } from '../../lib/kpiTargets';
import type { TeamMember } from '../../types/team';
import { KpiPeriodForm, KpiTargetForm } from './KpiTargetForms';
import { KpiTargetsTable } from './KpiTargetsTable';
import { KpiImportPanel } from './KpiImportPanel';
import { KpiResultsPanel } from './KpiResultsPanel';
import { KpiPeriodStatusForm } from './KpiPeriodStatusForm';

export function KpiTargetsWorkspace({ teamId, members, manage, viewTeam }: {
  teamId: string; members: TeamMember[]; manage: boolean; viewTeam: boolean;
}) {
  const { user } = useAuth();
  const controller = useKpiTargets(teamId);
  const [revision, setRevision] = useState(0);
  const { data } = controller;
  const period = data?.periods.find(item => item.Id === data.periodId);
  return <div className="space-y-5"><section className="rounded-lg border border-line bg-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-line">
      <h2 className="font-semibold">Chỉ tiêu KPI</h2>
      {data && data.periods.length > 0 && <label className="flex items-center gap-2 text-sm">Kỳ
        <select className="rounded-md border border-line bg-surface px-3 py-2" value={data.periodId} onChange={event => controller.selectPeriod(event.target.value)}>
          {data.periods.map(item => <option key={item.Id} value={item.Id}>{item.Month.slice(5, 7)}/{item.Month.slice(0, 4)}{item.Status === 'closed' ? ' · Đã chốt' : ''}</option>)}
        </select>
      </label>}
    </div>
    {controller.error ? <div className="p-5 space-y-3">
      <p role="alert" className="text-sm text-red-700 dark:text-red-300">{controller.error}</p>
      <button className="text-sm font-medium cursor-pointer" onClick={controller.reload}>Thử lại</button>
    </div> : controller.loading ? <p role="status" className="p-8 text-center text-sm text-ink-muted">Đang tải chỉ tiêu…</p>
      : data && <>
        {manage && <div className="p-5 border-b border-line"><KpiPeriodForm onCreate={controller.create} /></div>}
        {period ? <>
          <KpiTargetsTable rows={kpiTargetRows(data, user?.id ?? '', viewTeam)} viewTeam={viewTeam} />
          {viewTeam && period.Status === 'open' && <KpiTargetForm key={period.Id} data={data} members={members} manageBudget={manage} onSave={controller.save} />}
          {manage && <KpiPeriodStatusForm key={`${period.Id}:${period.Status}`} period={period} onChange={controller.changeStatus} />}
        </> : <p className="p-8 text-center text-sm text-ink-muted">Chưa có kỳ KPI.</p>}
      </>}
  </section>
    {data && period && <KpiResultsPanel key={`results:${period.Id}`} teamId={teamId} targets={data} month={period.Month.slice(0, 7)}
      members={members} viewTeam={viewTeam} revision={revision} />}
    {manage && data && period?.Status === 'open' && <KpiImportPanel key={`import:${period.Id}`} periodId={period.Id} month={period.Month}
      definitions={data.definitions} members={members} onPublished={() => setRevision(value => value + 1)} />}
  </div>;
}
