import { CalendarClock, FileCheck2, FileSpreadsheet, Landmark, Printer, RefreshCw, Loader2, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { useAlertReports } from '../../hooks/useAlertReports';
import { ALERT_REPORTS, type AlertReportId } from '../../lib/reports/alertData';
import { DUE_FILTER_LABELS, type DueFilter } from '../../lib/dueList';
import { fmtNumber } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/Field';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import type { XlsxCell } from '../../lib/xlsxWriter';

type Props = { ctrl: ReturnType<typeof useAlertReports> };

const ALERT_METRIC_META: Record<
  AlertReportId,
  { tone: 'warn' | 'accent' | 'cust' | 'collateral'; icon: LucideIcon; valueClass: string; iconClass: string; selectedIconClass: string }
> = {
  due: {
    tone: 'warn',
    icon: CalendarClock,
    valueClass: 'text-warn',
    iconClass: 'bg-warn-soft text-warn',
    selectedIconClass: 'bg-warn text-surface',
  },
  kunn: {
    tone: 'accent',
    icon: FileCheck2,
    valueClass: 'text-accent',
    iconClass: 'bg-accent-soft text-accent',
    selectedIconClass: 'bg-accent text-accent-ink',
  },
  credit: {
    tone: 'cust',
    icon: Landmark,
    valueClass: 'text-kpi-cust',
    iconClass: 'bg-kpi-cust/15 text-kpi-cust',
    selectedIconClass: 'bg-kpi-cust text-surface',
  },
  collateral: {
    tone: 'collateral',
    icon: ShieldAlert,
    valueClass: 'text-kpi-collateral',
    iconClass: 'bg-kpi-collateral/15 text-kpi-collateral',
    selectedIconClass: 'bg-kpi-collateral text-surface',
  },
};

export function AlertReportWorkspace({ ctrl }: Props) {
  const sheet = ctrl.output?.sheet;
  const columns: ColumnDef<XlsxCell[]>[] = (sheet?.rows[0] ?? []).map((cell, i) => ({
    key: String(i),
    label: String(cell.value ?? ''),
    priority: i <= 3 ? 2 : 1,
    align: cell.style?.align,
    render: row => (row[i]?.numeric ? fmtNumber(Number(row[i].value)) : String(row[i]?.value ?? '')),
  }));

  return (
    <section aria-label="Báo cáo đến hạn">
      <div data-workspace-metrics className="customer-summary-strip grid grid-cols-2 xl:grid-cols-4 border-b border-line">
        {ALERT_REPORTS.map(item => {
          const meta = ALERT_METRIC_META[item.id];
          const Icon = meta.icon;
          const selected = ctrl.report === item.id;
          const count = ctrl.loading ? '—' : ctrl.rows?.[item.id].length ?? '—';
          return (
            <button
              type="button"
              key={item.id}
              data-workspace-panel
              data-metric-tone={meta.tone}
              aria-pressed={selected}
              onClick={() => ctrl.setReport(item.id)}
              className="text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <div className="flex items-start justify-between gap-2 min-h-9">
                <span className={`text-[11px] font-semibold leading-4 ${selected ? 'text-ink' : 'text-ink-muted'}`}>
                  {item.label}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-control)] ${
                    selected ? meta.selectedIconClass : meta.iconClass
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className={`customer-summary-value mt-1.5 font-mono ${meta.valueClass}`}>{count}</div>
            </button>
          );
        })}
      </div>

      <div className="workspace-toolbar flex flex-wrap items-end gap-3 px-4 py-3 border-b border-line">
        <label className="space-y-1 min-w-36 flex-1 sm:flex-none">
          <span className="block text-xs font-medium text-ink-muted">Trạng thái</span>
          <Select value={ctrl.filter} onChange={e => ctrl.setFilter(e.target.value as DueFilter)}>
            {(['all', 'upcoming', 'expired'] as const).map(value => (
              <option key={value} value={value}>
                {DUE_FILTER_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        {ctrl.report !== 'collateral' && (
          <label className="space-y-1 min-w-36 flex-1 sm:flex-none">
            <span className="block text-xs font-medium text-ink-muted">Nhóm nợ</span>
            <Select value={ctrl.onlyGroup1 ? '1' : 'all'} onChange={e => ctrl.setOnlyGroup1(e.target.value === '1')}>
              <option value="1">Chỉ nhóm 1</option>
              <option value="all">Tất cả nhóm nợ</option>
            </Select>
          </label>
        )}
        <label className="space-y-1 flex-1 min-w-48">
          <span className="block text-xs font-medium text-ink-muted">Khách hàng, CIF, số hồ sơ</span>
          <Input value={ctrl.search} onChange={e => ctrl.setSearch(e.target.value)} />
        </label>
        <Button
          variant="secondary"
          onClick={() => void ctrl.reload()}
          disabled={ctrl.loading}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Làm mới
        </Button>
      </div>

      {ctrl.error ? (
        <div role="alert" className="p-4 text-neg">
          {ctrl.error}
        </div>
      ) : ctrl.loading ? (
        <div role="status" className="flex items-center justify-center gap-2 p-12 text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang nạp báo cáo
        </div>
      ) : (
        <>
          <div
            data-workspace-panel
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-panel"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {ALERT_REPORTS.find(r => r.id === ctrl.report)?.label}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent font-mono text-[11px] font-semibold">
                {ctrl.rows?.[ctrl.report].length ?? 0} hồ sơ
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={!ctrl.rows?.[ctrl.report].length}
                onClick={ctrl.print}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                In / PDF
              </Button>
              <Button
                disabled={!ctrl.rows?.[ctrl.report].length}
                onClick={ctrl.exportExcel}
                leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              >
                Xuất Excel
              </Button>
            </div>
          </div>
          {ctrl.actionError && (
            <div role="alert" className="p-4 text-neg">
              {ctrl.actionError}
            </div>
          )}
          <DataTable
            columns={columns}
            rows={sheet?.rows.slice(1) ?? []}
            rowKey={row => String(row[0]?.value)}
            cardTitle={row => String(row[1]?.value ?? '')}
            cardSubtitle={row => String(row[3]?.value ?? '')}
            maxHeight="65vh"
            emptyText="Không có hồ sơ phù hợp bộ lọc."
          />
        </>
      )}
    </section>
  );
}
