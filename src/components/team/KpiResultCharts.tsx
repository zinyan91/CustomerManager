import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KpiSeriesPoint } from '../../types/kpi';

export function KpiResultCharts({ series, comparison, unit }: {
  series: KpiSeriesPoint[]; comparison: { name: string; actual: number | null }[]; unit: 'VND' | 'count';
}) {
  const divisor = unit === 'VND' ? 1000000 : 1;
  const monthData = series.map(row => ({ name: row.month.slice(5), actual: row.actual === null ? null : row.actual / divisor }));
  const memberData = comparison.map(row => ({ ...row, actual: row.actual === null ? null : row.actual / divisor }));
  if (!monthData.some(row => row.actual !== null)) return <p className="py-8 text-center text-sm text-ink-muted">Chưa có dữ liệu biểu đồ.</p>;
  return <div className="space-y-6 mt-5">
    <div>
      <h3 className="text-sm font-medium mb-3">So sánh các tháng ({unit === 'VND' ? 'triệu VND' : 'số lượng'})</h3>
      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthData}><CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" /><YAxis /><Tooltip />
          <Line dataKey="actual" name="Thực hiện" stroke="var(--color-accent)" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer></div>
    </div>
    {memberData.some(row => row.actual !== null) && <div>
      <h3 className="text-sm font-medium mb-3">So sánh thành viên ({unit === 'VND' ? 'triệu VND' : 'số lượng'})</h3>
      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={memberData}><CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" /><YAxis /><Tooltip />
          <Bar dataKey="actual" name="Thực hiện" fill="var(--color-accent)" maxBarSize={56} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer></div>
    </div>}
  </div>;
}
