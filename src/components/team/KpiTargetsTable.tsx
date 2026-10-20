import type { KpiTargetRow } from '../../types/kpi';

const number = (amount: number | null) => amount === null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(amount);
const th = 'px-4 py-3 font-medium whitespace-nowrap';
const td = 'px-4 py-3 tabular-nums whitespace-nowrap text-right';

export function KpiTargetsTable({ rows, viewTeam }: { rows: KpiTargetRow[]; viewTeam: boolean }) {
  return <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="bg-surface text-ink-muted"><tr>
        <th className={th}>Chỉ tiêu</th><th className={th}>Đơn vị</th>
        <th className={`${th} text-right`}>Kế hoạch team</th>
        {viewTeam && <><th className={`${th} text-right`}>Đã phân bổ</th><th className={`${th} text-right`}>Còn lại</th></>}
        <th className={`${th} text-right`}>Kế hoạch của tôi</th>
      </tr></thead>
      <tbody className="divide-y divide-line">
        {rows.map(row => <tr key={row.definition.Code}>
          <td className="px-4 py-3 font-medium">{row.definition.Name}</td>
          <td className="px-4 py-3 text-ink-muted">{row.definition.Unit === 'VND' ? 'VND' : 'Số lượng'}</td>
          <td className={td}>{number(row.budget)}</td>
          {viewTeam && <><td className={td}>{number(row.allocated)}</td><td className={td}>{number(row.remaining)}</td></>}
          <td className={td}>{number(row.own)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
