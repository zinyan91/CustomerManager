import { useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeamKpiDashboard } from '../../hooks/useTeamKpiDashboard';
import { buildKpiDashboard } from '../../lib/kpiDashboard';
import { todayIso } from '../../lib/utils';
import type { TeamMember } from '../../types/team';
import type { KpiReportMode } from '../../types/kpiDashboard';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';
import { TeamKpiSummaryCards } from './TeamKpiSummaryCards';
import { TeamKpiReportCharts } from './TeamKpiReportCharts';
import { TeamKpiMonthlyReport } from './TeamKpiMonthlyReport';
import { TeamProgressReport } from '../loanProgress/TeamProgressReport';

export function TeamKpiDashboard({ teamId,members,viewTeam }: { teamId:string; members:TeamMember[]; viewTeam:boolean }) {
  const { user } = useAuth();
  const [month,setMonth] = useState(todayIso().slice(0,7));
  const [mode,setMode] = useState<KpiReportMode>('month');
  const [metric,setMetric] = useState('net_loan');
  const [progressRevision,setProgressRevision] = useState(0);
  const report = useTeamKpiDashboard(teamId,month.slice(0,4));
  const model = report.data ? buildKpiDashboard(report.data,members,month,mode,viewTeam ? null : user?.id ?? '') : null;
  const selected = model?.cards.find(card => card.definition.Code === metric)?.definition ?? model?.cards[0]?.definition;
  return <div className="space-y-4 md:space-y-4.5 w-full pb-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-line/60">
      <h1 className="text-base sm:text-lg font-bold tracking-tight text-ink flex items-center gap-2.5">
        <span className="p-2 rounded-[var(--r-control)] bg-accent-soft text-accent"><BarChart3 className="w-4 h-4" /></span>
        Báo cáo KPI{viewTeam ? ' team' : ''}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="kpi-report-month">Tháng báo cáo</label>
        <div className="w-40"><Input id="kpi-report-month" type="month" value={month}
          onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} /></div>
        <Button variant="secondary" onClick={()=>{report.reload();setProgressRevision(value=>value+1);}} disabled={report.loading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>Làm mới</Button>
      </div>
    </div>
    <Tabs value={mode} onValueChange={value => setMode(value as KpiReportMode)} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3">
        <TabsList aria-label="Kỳ báo cáo"><TabsTrigger value="month">Tháng</TabsTrigger><TabsTrigger value="ytd">Lũy kế năm</TabsTrigger></TabsList>
        {model?.asOf && <span className="text-xs text-ink-faint">Số liệu đến {model.asOf.split('-').reverse().join('/')}</span>}
      </div>
    <TabsContent value={mode} className="space-y-4">
    {report.error ? <div role="alert"><ErrorState message={report.error} onRetry={report.reload} /></div>
      : report.loading ? <div role="status"><LoadingState text="Đang tải báo cáo KPI…" /></div>
        : model && <TeamKpiSummaryCards cards={model.cards} />}
    <TeamProgressReport key={progressRevision} month={month} teamId={teamId} ytd={mode==='ytd'} />
    {!report.loading && !report.error && model && <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 px-3">
              <label htmlFor="kpi-report-metric" className="text-xs font-bold text-ink">Chỉ tiêu phân tích</label>
              <div className="w-full sm:w-80"><Select id="kpi-report-metric" value={selected?.Code ?? ''} onChange={event => setMetric(event.target.value)}>
                {model.cards.map(card => <option key={card.definition.Code} value={card.definition.Code}>{card.definition.Name}</option>)}
              </Select></div>
            </div>
          {selected && <>
            <TeamKpiReportCharts trend={model.trends[selected.Code]} unit={selected.Unit} />
            <TeamKpiMonthlyReport rows={model.monthlyReports[selected.Code]} unit={selected.Unit} stock={selected.Aggregation==='stock'} />
          </>}
        </>}
    </TabsContent>
    </Tabs>
  </div>;
}
