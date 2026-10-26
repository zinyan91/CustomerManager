import { Fragment } from 'react';
import { fmtDecimals, fmtPercent } from '../../lib/utils';
import type { KpiForecastFeeId, KpiForecastMetricId, KpiForecastResult } from '../../types/kpiForecast';
import { Input } from '../ui/Field';

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-[minmax(210px,1.5fr)_110px_repeat(4,minmax(110px,1fr))] md:items-center';

export function KpiForecastTable({
  result,
  onActualChange,
  onFeeChange,
}: {
  result: KpiForecastResult;
  onActualChange: (id: Exclude<KpiForecastMetricId, 'fees'>, value: number) => void;
  onFeeChange: (id: KpiForecastFeeId, value: number) => void;
}) {
  return (
    <section aria-labelledby="kpi-forecast-table-title" className="border-y border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="kpi-forecast-table-title" className="text-sm font-semibold text-ink">Chỉ tiêu dự kiến thực hiện</h2>
        <span className="text-xs text-ink-muted">Số tiền: triệu đồng</span>
      </div>
      <div role="table" aria-label="Dự báo điểm theo chỉ tiêu">
        <div role="row" className={`${GRID} hidden border-b border-line bg-panel-muted/55 px-4 py-2.5 text-xs font-medium text-ink-muted md:grid`}>
          <span role="columnheader">Chỉ tiêu</span>
          <span role="columnheader">Đơn vị</span>
          <span role="columnheader" className="text-right">Kế hoạch</span>
          <span role="columnheader" className="text-right">Thực hiện</span>
          <span role="columnheader" className="text-right">Hoàn thành</span>
          <span role="columnheader" className="text-right">Điểm thực hiện</span>
        </div>
        <div role="rowgroup" className="divide-y divide-line/65">
          {result.rows.map(row => (
            <Fragment key={row.id}>
              <div role="row" className={`${GRID} px-4 py-3 hover:bg-accent-soft/40`}>
                <div role="rowheader" className="col-span-2 min-w-0 font-medium text-ink md:col-span-1">{row.label}</div>
                <div role="cell" className="hidden text-xs text-ink-muted md:block">{row.unit}</div>
                <div role="cell" className="text-right font-mono tabular-nums">
                  <span className="mb-1 block text-[11px] text-ink-faint md:hidden">Kế hoạch</span>
                  {fmtDecimals(row.plan, row.unit === 'Triệu đồng' ? 2 : 0, '0')}
                </div>
                <div role="cell">
                  <span className="mb-1 block text-right text-[11px] text-ink-faint md:hidden">Thực hiện</span>
                  {row.id === 'fees'
                    ? <div className="kpi-forecast-value rounded-[var(--r-control)] border px-3 py-2 text-right font-mono font-semibold tabular-nums text-ink">
                        {fmtDecimals(row.actual, 2, '0')}
                      </div>
                    : <Input aria-label={`Thực hiện ${row.label}`} type="number" step={row.unit === 'Triệu đồng' ? 0.01 : 1}
                        min={row.unit === 'Triệu đồng' && row.id.startsWith('net') ? undefined : 0}
                        inputMode="decimal" value={row.actual} onWheel={event => event.currentTarget.blur()}
                        onChange={event => onActualChange(row.id as Exclude<KpiForecastMetricId, 'fees'>, Number(event.target.value))}
                        className="kpi-forecast-number-input text-right font-mono" />}
                </div>
                <div role="cell" className="text-right font-mono tabular-nums">
                  <span className="mb-1 block text-[11px] text-ink-faint md:hidden">Hoàn thành</span>
                  {fmtPercent(row.completion, '0%')}
                </div>
                <div role="cell" className="text-right font-mono font-semibold tabular-nums text-accent">
                  <span className="mb-1 block text-[11px] font-normal text-ink-faint md:hidden">Điểm thực hiện</span>
                  {fmtDecimals(row.actualPoints, 3, '0')}
                </div>
              </div>
              {row.id === 'fees' && result.feeRows.map(feeRow => (
                <div role="row" key={`fee:${feeRow.id}`} className={`${GRID} bg-surface px-4 py-2.5 hover:bg-accent-soft/40`}>
                  <div role="rowheader" className="col-span-2 min-w-0 pl-4 text-ink-muted md:col-span-1">{feeRow.label}</div>
                  <div role="cell" className="hidden text-xs text-ink-muted md:block">Triệu đồng</div>
                  <div role="cell" className="text-right font-mono tabular-nums text-ink-faint">—</div>
                  <div role="cell">
                    <Input aria-label={`Thực hiện ${feeRow.label}`} type="number" step={0.01} inputMode="decimal"
                      value={feeRow.actual} onWheel={event => event.currentTarget.blur()}
                      onChange={event => onFeeChange(feeRow.id, Number(event.target.value))}
                      className="kpi-forecast-number-input text-right font-mono" />
                  </div>
                  <div role="cell" className="text-right font-mono tabular-nums text-ink-faint">—</div>
                  <div role="cell" className="text-right font-mono tabular-nums text-accent">{fmtDecimals(feeRow.actualPoints, 3, '0')}</div>
                </div>
              ))}
            </Fragment>
          ))}
          <div role="row" className={`${GRID} bg-panel-muted/65 px-4 py-3 font-semibold text-ink`}>
            <div role="rowheader" className="col-span-2 md:col-span-2">TỔNG CỘNG</div>
            <div role="cell" className="hidden text-right font-mono tabular-nums md:block">{fmtDecimals(result.planPoints, 3, '0')} điểm</div>
            <div role="cell" className="hidden md:block" />
            <div role="cell" className="text-right font-mono tabular-nums">{fmtPercent(result.completion, '0%')}</div>
            <div role="cell" className="text-right font-mono tabular-nums text-accent">{fmtDecimals(result.actualPoints, 3, '0')} điểm</div>
          </div>
        </div>
      </div>
    </section>
  );
}
