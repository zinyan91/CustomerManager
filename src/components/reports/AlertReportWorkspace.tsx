import { FileSpreadsheet, Printer, RefreshCw, Loader2 } from 'lucide-react';
import type { useAlertReports } from '../../hooks/useAlertReports';
import { ALERT_REPORTS } from '../../lib/reports/alertData';
import { DUE_FILTER_LABELS, type DueFilter } from '../../lib/dueList';
import { fmtNumber } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/Field';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import type { XlsxCell } from '../../lib/xlsxWriter';

type Props = {ctrl: ReturnType<typeof useAlertReports>};

export function AlertReportWorkspace({ctrl}:Props) {
  const sheet=ctrl.output?.sheet;
  const columns:ColumnDef<XlsxCell[]>[]=(sheet?.rows[0] ?? []).map((cell,i) => ({
    key:String(i), label:String(cell.value ?? ''), priority:i<=3 ? 2 : 1,
    align:cell.style?.align, render:row => row[i]?.numeric ? fmtNumber(Number(row[i].value)) : String(row[i]?.value ?? ''),
  }));
  return <section aria-label="Báo cáo đến hạn">
    <div className="grid grid-cols-2 xl:grid-cols-4 border-b border-line">
      {ALERT_REPORTS.map(item => <button type="button" key={item.id} onClick={() => ctrl.setReport(item.id)}
        aria-pressed={ctrl.report===item.id}
        className={`flex items-center justify-between gap-3 px-4 py-4 text-left text-xs border-b-2 border-r border-line focus-visible:outline-2 focus-visible:outline-accent ${ctrl.report===item.id?'border-b-accent bg-accent-soft font-semibold text-ink':'border-b-transparent text-ink-muted hover:bg-surface'}`}>
        <span>{item.label}</span><span className="font-mono">{ctrl.loading?'—':ctrl.rows?.[item.id].length ?? '—'}</span>
      </button>)}
    </div>
    <div className="flex flex-wrap items-end gap-3 p-4 border-b border-line">
      <label className="space-y-1 min-w-36 flex-1 sm:flex-none"><span className="block text-xs text-ink-muted">Trạng thái</span>
        <Select value={ctrl.filter} onChange={e=>ctrl.setFilter(e.target.value as DueFilter)}>
          {(['all','upcoming','expired'] as const).map(value=><option key={value} value={value}>{DUE_FILTER_LABELS[value]}</option>)}
        </Select>
      </label>
      {ctrl.report!=='collateral' && <label className="space-y-1 min-w-36 flex-1 sm:flex-none"><span className="block text-xs text-ink-muted">Nhóm nợ</span>
        <Select value={ctrl.onlyGroup1?'1':'all'} onChange={e=>ctrl.setOnlyGroup1(e.target.value==='1')}>
          <option value="1">Chỉ nhóm 1</option><option value="all">Tất cả nhóm nợ</option>
        </Select>
      </label>}
      <label className="space-y-1 flex-1 min-w-48"><span className="block text-xs text-ink-muted">Khách hàng, CIF, số hồ sơ</span>
        <Input value={ctrl.search} onChange={e=>ctrl.setSearch(e.target.value)} />
      </label>
      <Button variant="secondary" onClick={()=>void ctrl.reload()} disabled={ctrl.loading} leftIcon={<RefreshCw className="w-4 h-4" />}>Làm mới</Button>
    </div>
    {ctrl.error ? <div role="alert" className="p-4 text-neg">{ctrl.error}</div>
      : ctrl.loading ? <div role="status" className="flex items-center justify-center gap-2 p-12 text-ink-muted"><Loader2 className="w-4 h-4 animate-spin" />Đang nạp báo cáo</div>
      : <>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <h2 className="text-sm font-semibold">{ALERT_REPORTS.find(r=>r.id===ctrl.report)?.label} <span className="text-ink-muted font-normal">({ctrl.rows?.[ctrl.report].length ?? 0})</span></h2>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!ctrl.rows?.[ctrl.report].length} onClick={ctrl.print} leftIcon={<Printer className="w-4 h-4" />}>In / PDF</Button>
            <Button disabled={!ctrl.rows?.[ctrl.report].length} onClick={ctrl.exportExcel} leftIcon={<FileSpreadsheet className="w-4 h-4" />}>Xuất Excel</Button>
          </div>
        </div>
        {ctrl.actionError && <div role="alert" className="p-4 text-neg">{ctrl.actionError}</div>}
        <DataTable columns={columns} rows={sheet?.rows.slice(1) ?? []} rowKey={row=>String(row[0]?.value)}
          cardTitle={row=>String(row[1]?.value ?? '')} cardSubtitle={row=>String(row[3]?.value ?? '')}
          maxHeight="65vh" emptyText="Không có hồ sơ phù hợp bộ lọc." />
      </>}
  </section>;
}
