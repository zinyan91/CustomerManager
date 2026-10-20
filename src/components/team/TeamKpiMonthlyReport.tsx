import { CalendarDays } from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import { formatKpiAmount, formatKpiCompletion } from '../../lib/kpiDashboard';
import type { KpiDashboardMonthlyResult } from '../../types/kpiDashboard';

export function TeamKpiMonthlyReport({ rows,unit,stock }: {
  rows:KpiDashboardMonthlyResult[]; unit:'VND'|'count'; stock:boolean;
}) {
  const amount = (value:number|null) => {
    const formatted = formatKpiAmount(value,unit);
    return <span className="font-mono tabular-nums">{formatted.value}{formatted.unit && ` ${formatted.unit}`}</span>;
  };
  const columns:ColumnDef<KpiDashboardMonthlyResult>[] = [
    { key:'month',label:'Tháng',render:row => row.name,width:'10%' },
    { key:'target',label:'Kế hoạch',align:'right',render:row => amount(row.target) },
    { key:'actual',label:'Thực hiện',align:'right',render:row => amount(row.actual) },
    { key:'completion',label:'Hoàn thành',align:'right',render:row => formatKpiCompletion(row.completion) },
    { key:'ytdTarget',label:stock ? 'KH cuối kỳ' : 'KH lũy kế',align:'right',render:row => amount(row.ytdTarget),priority:2 },
    { key:'ytdActual',label:stock ? 'TH cuối kỳ' : 'TH lũy kế',align:'right',render:row => amount(row.ytdActual),priority:2 },
  ];
  return <Panel role="region" aria-label="Báo cáo KPI theo tháng">
    <PanelHeader title="Báo cáo KPI theo tháng" icon={<CalendarDays className="w-4 h-4" />} bordered />
    <div className="mt-4"><DataTable columns={columns} rows={rows} rowKey={row => row.id} cardTitle={row => row.name} /></div>
  </Panel>;
}
