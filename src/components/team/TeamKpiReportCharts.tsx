import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel, PanelHeader } from '../ui/Panel';
import type { KpiDashboardChartPoint } from '../../types/kpiDashboard';
import { kpiChartData } from '../../lib/kpiDashboard';

const tick = { fill:'var(--color-ink-muted)',fontSize:11 };
const tooltip = { backgroundColor:'var(--color-panel)',borderColor:'var(--color-line)',borderRadius:'var(--r-control)',color:'var(--color-ink)',fontSize:12 };

export function TeamKpiReportCharts({ trend,unit }: {
  trend:KpiDashboardChartPoint[]; unit:'VND'|'count';
}) {
  const label = unit === 'VND' ? 'Triệu đồng' : 'Số lượng';

  const months = kpiChartData(trend,unit);
  return <div className="space-y-4">
    <Panel role="region" aria-label="Kết quả theo tháng">
      <PanelHeader title="Kết quả theo tháng" icon={<TrendingUp className="w-4 h-4" />} actions={<span className="text-xs text-ink-faint">{label}</span>} bordered />
      <div className="h-72 mt-4">
        {months.some(row => row.actual !== null || row.target !== null) ? <ResponsiveContainer width="100%" height="100%">
          <LineChart data={months} margin={{ top:12,right:16,left:0,bottom:0 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltip} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Line name="Kế hoạch" dataKey="target" stroke="var(--color-ink-faint)" strokeDasharray="5 4" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
            <Line name="Thực hiện" dataKey="actual" stroke="var(--color-accent)" strokeWidth={2.5} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer> : <div className="h-full flex items-center justify-center text-xs text-ink-faint">Chưa có số liệu các tháng.</div>}
      </div>
    </Panel>
  </div>;
}
