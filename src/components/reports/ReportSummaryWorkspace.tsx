import { FileSpreadsheet, Layers, Loader2, RefreshCw } from 'lucide-react';
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

export function ReportSummaryWorkspace({ ctrl, portfolio }: Props) {
  const allSelected = ctrl.selected.length === REPORTS.length;

  return (
    <section aria-label="Báo cáo danh mục và tổng hợp" className="divide-y divide-line">
      <div
        data-workspace-panel
        className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 bg-panel"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-accent-soft text-accent">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-ink">Danh mục đang vay</h2>
              <span className="px-2 py-0.5 rounded-full bg-panel-muted text-ink-muted font-mono text-[11px] font-semibold">
                4 sheet · Vay có TSBĐ, Chi tiết TSBĐ, Cầm cố, Huy động
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={portfolio.loading}
            onClick={() => void portfolio.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Làm mới danh mục
          </Button>
          <Button
            loading={portfolio.loading}
            disabled={Boolean(portfolio.error || !portfolio.snapshot)}
            onClick={portfolio.exportPortfolio}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Xuất danh mục đang vay
          </Button>
        </div>
      </div>

      {portfolio.error && (
        <div role="alert" className="p-4 text-neg">
          {portfolio.error}
        </div>
      )}
      {portfolio.actionError && (
        <div role="alert" className="p-4 text-neg">
          {portfolio.actionError}
        </div>
      )}

      <div className="workspace-toolbar flex flex-wrap items-end justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 self-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-kpi-cust/15 text-kpi-cust">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-ink">Báo cáo tổng hợp</h2>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={allSelected ? ctrl.clearSelection : ctrl.selectAll}
              className="px-2.5 py-1 rounded-[var(--r-control)] border border-line bg-panel hover:bg-surface text-[11px] font-semibold text-ink cursor-pointer transition-colors"
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
        </div>

        <label className="space-y-1 w-52">
          <span className="block text-xs font-medium text-ink-muted">Kỳ hạn</span>
          <Select value={ctrl.filter} onChange={e => ctrl.setFilter(e.target.value as DueBucketFilter)}>
            <option value="all">Tất cả</option>
            {(['overdue', 'due', 'upcoming'] as const).map(value => (
              <option key={value} value={value}>
                {DUE_BUCKET_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="overflow-x-auto bg-panel">
        <table className="table-fintech w-full text-xs">
          <thead>
            <tr>
              <th className="w-14 text-center">
                <span className="sr-only">Chọn</span>
              </th>
              <th className="text-left">Báo cáo</th>
              <th className="text-left w-48">Tên sheet Excel</th>
              <th className="text-left w-64">Căn cứ kỳ hạn</th>
            </tr>
          </thead>
          <tbody>
            {REPORTS.map(report => {
              const checked = ctrl.selected.includes(report.id);
              return (
                <tr
                  key={report.id}
                  onClick={() => ctrl.toggle(report.id)}
                  className={`cursor-pointer ${checked ? 'bg-accent-soft/60' : ''}`}
                >
                  <td className="text-center" onClick={e => e.stopPropagation()}>
                    <input
                      id={`summary-report-${report.id}`}
                      type="checkbox"
                      aria-label={report.name}
                      checked={checked}
                      onChange={() => ctrl.toggle(report.id)}
                      className="w-4 h-4 accent-accent cursor-pointer"
                    />
                  </td>
                  <td className="font-semibold text-ink">
                    <label
                      htmlFor={`summary-report-${report.id}`}
                      onClick={e => e.stopPropagation()}
                      className="cursor-pointer block"
                    >
                      {report.name}
                    </label>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded-[var(--r-control)] bg-panel-muted text-ink font-mono text-[11px]">
                      {report.sheetName}
                    </span>
                  </td>
                  <td className="text-ink-muted">
                    {report.supportsDueFilter ? (
                      <span className="text-ink">{report.dueFieldLabel}</span>
                    ) : (
                      <span className="text-ink-faint">Toàn danh mục</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ctrl.error && (
        <div role="alert" className="p-4 text-neg">
          {ctrl.error}
        </div>
      )}

      <div
        data-workspace-panel
        className="px-4 py-3.5 bg-surface flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>
            Đã chọn <strong className="font-mono text-ink">{ctrl.selected.length}</strong> / {REPORTS.length} báo cáo
          </span>
        </div>
        <Button
          disabled={!ctrl.selected.length || ctrl.exporting}
          onClick={() => void ctrl.exportSelected()}
          leftIcon={
            ctrl.exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />
          }
        >
          {ctrl.exporting ? 'Đang xuất' : 'Xuất Excel tổng hợp'}
        </Button>
      </div>
    </section>
  );
}
