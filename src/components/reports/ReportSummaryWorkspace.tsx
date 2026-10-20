import { FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import type { useAlertReports } from '../../hooks/useAlertReports';
import type { useReportCenterController } from '../../hooks/useReportCenterController';
import { REPORTS } from '../../lib/reports/registry';
import { DUE_BUCKET_LABELS, type DueBucketFilter } from '../../lib/reports/dueBucket';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';

interface Props {
  ctrl: ReturnType<typeof useReportCenterController>;
  portfolio: ReturnType<typeof useAlertReports>;
}

export function ReportSummaryWorkspace({ctrl,portfolio}:Props) {
  return <section aria-label="Báo cáo danh mục và tổng hợp" className="divide-y divide-line">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <h2 className="text-sm font-semibold text-ink">Danh mục đang vay</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={portfolio.loading} onClick={()=>void portfolio.reload()} leftIcon={<RefreshCw className="w-4 h-4" />}>Làm mới danh mục</Button>
        <Button variant="secondary" loading={portfolio.loading} disabled={Boolean(portfolio.error || !portfolio.snapshot)}
          onClick={portfolio.exportPortfolio} leftIcon={<FileSpreadsheet className="w-4 h-4" />}>Xuất danh mục đang vay</Button>
      </div>
    </div>
    {portfolio.error && <div role="alert" className="p-4 text-neg">{portfolio.error}</div>}
    {portfolio.actionError && <div role="alert" className="p-4 text-neg">{portfolio.actionError}</div>}
    <div className="p-4 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-sm font-semibold self-center text-ink">Báo cáo tổng hợp</h2>
      <label className="space-y-1 w-48"><span className="block text-xs text-ink-muted">Kỳ hạn</span>
        <Select value={ctrl.filter} onChange={e=>ctrl.setFilter(e.target.value as DueBucketFilter)}>
          <option value="all">Tất cả</option>
          {(['overdue','due','upcoming'] as const).map(value=><option key={value} value={value}>{DUE_BUCKET_LABELS[value]}</option>)}
        </Select>
      </label>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-surface text-ink-muted text-left"><tr>
          <th className="p-3 w-12"><span className="sr-only">Chọn</span></th>
          <th className="p-3 font-semibold">Báo cáo</th>
          <th className="p-3 font-semibold">Căn cứ kỳ hạn</th>
        </tr></thead>
        <tbody>{REPORTS.map(report=><tr key={report.id} className="border-t border-line hover:bg-surface/60">
          <td className="p-3 text-center"><input id={`summary-report-${report.id}`} type="checkbox" aria-label={report.name} checked={ctrl.selected.includes(report.id)}
            onChange={()=>ctrl.toggle(report.id)} className="w-4 h-4 accent-accent" /></td>
          <td className="p-3 font-medium text-ink"><label htmlFor={`summary-report-${report.id}`} className="cursor-pointer">{report.name}</label></td>
          <td className="p-3 text-ink-muted">{report.supportsDueFilter?report.dueFieldLabel:'Toàn danh mục'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {ctrl.error && <div role="alert" className="p-4 text-neg">{ctrl.error}</div>}
    <div className="p-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">Đã chọn {ctrl.selected.length} báo cáo</span>
      <Button disabled={!ctrl.selected.length || ctrl.exporting} onClick={()=>void ctrl.exportSelected()}
        leftIcon={ctrl.exporting?<Loader2 className="w-4 h-4 animate-spin" />:<FileSpreadsheet className="w-4 h-4" />}>
        {ctrl.exporting?'Đang xuất':'Xuất Excel tổng hợp'}
      </Button>
    </div>
  </section>;
}
