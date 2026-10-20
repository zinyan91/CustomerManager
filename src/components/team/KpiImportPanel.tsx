import type { KpiDefinition } from '../../types/kpi';
import type { TeamMember } from '../../types/team';
import { useKpiImport } from '../../hooks/useKpiImport';

const format = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('vi-VN').format(value);
const changes = { added: 'Thêm', changed: 'Thay đổi', removed: 'Loại khỏi bản mới', unchanged: 'Không đổi' };
const field = 'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink';

export function KpiImportPanel({ periodId, month, definitions, members, onPublished }: {
  periodId: string; month: string; definitions: KpiDefinition[]; members: TeamMember[]; onPublished: () => void;
}) {
  const controller = useKpiImport(periodId, definitions, members, onPublished);
  const preview = controller.preview;
  return <section className="rounded-lg border border-line bg-panel p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold">Nhập kết quả KPI từ Excel</h2>
      <button className={`${field} cursor-pointer`} onClick={() => void controller.download()}>Tải mẫu Excel</button>
    </div>
    <label className="block text-sm">Tệp Excel
      <input className={`${field} block mt-1.5 max-w-full`} type="file" accept=".xlsx,.xlsm" disabled={controller.busy}
        onChange={event => { const file = event.target.files?.[0]; if (file) void controller.read(file); event.target.value = ''; }} />
    </label>
    {controller.busy && <p role="status" className="text-sm text-ink-muted">Đang xử lý…</p>}
    {controller.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{controller.error}</p>}
    {controller.notice && <p role="status" className="text-sm">{controller.notice}</p>}
    {preview && <>
      <div className="flex flex-wrap gap-5 text-sm">
        <span>{preview.rows.length} dòng hợp lệ</span>
        <span>{preview.errors.length} lỗi</span>
        <span>Thay thế revision {controller.revision}</span>
      </div>
      {preview.errors.length > 0 && <div role="alert" className="max-h-48 overflow-auto text-sm text-red-700 dark:text-red-300">
        {preview.errors.map((message, index) => <p key={index}>{message}</p>)}
      </div>}
      <div className="overflow-auto border border-line rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface"><tr><th className="px-3 py-2 font-medium">Đối soát theo chỉ tiêu</th>
            <th className="px-3 py-2 font-medium">Đã công bố</th><th className="px-3 py-2 font-medium">Bản mới</th></tr></thead>
          <tbody className="divide-y divide-line">{preview.totals.map(row => <tr key={row.metricCode}>
            <td className="px-3 py-2">{definitions.find(item => item.Code === row.metricCode)?.Name ?? row.metricCode}</td>
            <td className="px-3 py-2 tabular-nums">{format(row.before)}</td><td className="px-3 py-2 tabular-nums">{format(row.after)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="max-h-80 overflow-auto border border-line rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface"><tr>{['Thành viên', 'Chỉ tiêu', 'Đã công bố', 'Bản mới', 'Thay đổi'].map(label => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{preview.differences.map(row => <tr key={`${row.userId}:${row.metricCode}`}>
            <td className="px-3 py-2">{members.find(member => member.UserId === row.userId)?.FullName ?? row.userId}</td>
            <td className="px-3 py-2">{definitions.find(item => item.Code === row.metricCode)?.Name ?? row.metricCode}</td>
            <td className="px-3 py-2 tabular-nums">{format(row.before)}</td><td className="px-3 py-2 tabular-nums">{format(row.after)}</td>
            <td className="px-3 py-2">{changes[row.change]}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void controller.publish(); }}>
        <label className="text-sm">Mốc dữ liệu<input className={`${field} block mt-1.5`} type="date" min={month} required value={controller.asOf} onChange={event => controller.setAsOf(event.target.value)} /></label>
        <label className="text-sm flex-1 min-w-56">Lý do công bố<input className={`${field} block mt-1.5 w-full`} required maxLength={1000} value={controller.reason} onChange={event => controller.setReason(event.target.value)} /></label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white font-semibold disabled:opacity-50 cursor-pointer"
          disabled={controller.busy || preview.errors.length > 0 || preview.rows.length === 0}>Công bố bản thay thế</button>
      </form>
    </>}
  </section>;
}
