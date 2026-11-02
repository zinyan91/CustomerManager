import { Fragment, useState } from 'react';
import { formatNumberWith, parseNumberWith } from '../../lib/formatSettings';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { fmtPercent } from '../../lib/utils';
import type { KpiForecastFeeId, KpiForecastMetricId } from '../../types/kpiForecast';
import type { KpiCampaignResult } from '../../types/kpiCampaign';
import { Input } from '../ui/Field';

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-[minmax(200px,1.5fr)_96px_repeat(6,minmax(92px,1fr))] md:items-center';

export function KpiCampaignTable({
  result,
  onActualChange,
  onFeeChange,
}: {
  result: KpiCampaignResult;
  onActualChange: (id: Exclude<KpiForecastMetricId, 'fees'>, value: number) => void;
  onFeeChange: (id: KpiForecastFeeId, value: number) => void;
}) {
  const { formatSettings } = useFormatSettings();
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const amountDigits = Math.max(formatSettings.decimalDigits, 2);
  const points = (value: number) => formatNumberWith(value, formatSettings.decimalDigits, formatSettings.numberStyle);
  const coefficient = (value: number) => `×${formatNumberWith(value, Number.isInteger(value) ? 0 : 1, formatSettings.numberStyle)}`;
  const formatInput = (value: number, digits: number) => value === 0 ? '' : formatNumberWith(value, digits, formatSettings.numberStyle);
  const inputValue = (key: string, value: number, digits: number) => (
    Object.prototype.hasOwnProperty.call(draftValues, key) ? draftValues[key] : formatInput(value, digits)
  );
  const commitInput = (key: string, rawValue: string, commit: (value: number) => void) => {
    setDraftValues(current => ({ ...current, [key]: rawValue }));
    commit(parseNumberWith(rawValue, formatSettings.numberStyle));
  };
  const formatCommittedInput = (key: string) => {
    setDraftValues(current => {
      if (!Object.prototype.hasOwnProperty.call(current, key)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  return (
    <section aria-labelledby="kpi-campaign-table-title" className="border-y border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <h2 id="kpi-campaign-table-title" className="text-sm font-semibold text-ink">Chỉ tiêu dự kiến thực hiện</h2>
        <span className="text-xs text-ink-muted">Số tiền: triệu đồng</span>
      </div>
      <div role="table" aria-label="Điểm theo chỉ tiêu và hệ số của đợt">
        <div role="row" className={`${GRID} hidden border-b border-line bg-panel-muted/45 px-3 py-2 text-xs font-medium text-ink-muted md:grid`}>
          <span role="columnheader">Chỉ tiêu</span>
          <span role="columnheader">Đơn vị</span>
          <span role="columnheader" className="text-right">Kế hoạch</span>
          <span role="columnheader" className="text-right">Thực hiện</span>
          <span role="columnheader" className="text-right">Hoàn thành</span>
          <span role="columnheader" className="text-right">Điểm QĐ 1799</span>
          <span role="columnheader" className="text-right">Hệ số</span>
          <span role="columnheader" className="text-right">Điểm quy đổi</span>
        </div>
        <div role="rowgroup" className="divide-y divide-line/65">
          {result.rows.map(row => (
            <Fragment key={row.id}>
              <div role="row" className={`${GRID} px-3 py-2 hover:bg-accent-soft/25`}>
                <div role="rowheader" className="col-span-2 min-w-0 font-medium text-ink md:col-span-1">{row.label}</div>
                <div role="cell" className="hidden text-xs text-ink-muted md:block">{row.unit}</div>
                <div role="cell" className="text-right font-mono tabular-nums">
                  <span className="mb-1 block text-[11px] text-ink-faint md:hidden">Kế hoạch</span>
                  {formatNumberWith(row.plan, row.unit === 'Triệu đồng' ? formatSettings.decimalDigits : 0, formatSettings.numberStyle)}
                </div>
                <div role="cell">
                  <span className="mb-1 block text-right text-[11px] text-ink-faint md:hidden">Thực hiện</span>
                  {row.id === 'fees'
                    ? <div className="kpi-forecast-value rounded-[var(--r-control)] border px-3 py-1.5 text-right font-mono font-semibold tabular-nums text-ink">
                        {formatNumberWith(row.actual, amountDigits, formatSettings.numberStyle)}
                      </div>
                    : <Input aria-label={`Thực hiện ${row.label}`} type="text"
                        inputMode={row.unit === 'Triệu đồng' ? 'decimal' : 'numeric'}
                        value={inputValue(`actual:${row.id}`, row.actual, row.unit === 'Triệu đồng' ? amountDigits : 0)}
                        onChange={event => commitInput(
                          `actual:${row.id}`,
                          event.target.value,
                          value => onActualChange(row.id as Exclude<KpiForecastMetricId, 'fees'>, value),
                        )}
                        onBlur={() => formatCommittedInput(`actual:${row.id}`)}
                        className="kpi-forecast-number-input text-right font-mono" />}
                </div>
                <div role="cell" className="text-right font-mono tabular-nums">
                  <span className="mb-1 block text-[11px] text-ink-faint md:hidden">Hoàn thành</span>
                  {fmtPercent(row.completion, '0%')}
                </div>
                <div role="cell" className="text-right font-mono tabular-nums">
                  <span className="mb-1 block text-[11px] text-ink-faint md:hidden">Điểm QĐ 1799</span>
                  {points(row.actualPoints)}
                </div>
                <div role="cell" className={`text-right font-mono tabular-nums ${row.coefficient === 1 ? 'text-ink-faint' : 'font-semibold text-ink'}`}>
                  <span className="mb-1 block text-[11px] font-normal text-ink-faint md:hidden">Hệ số</span>
                  {coefficient(row.coefficient)}
                </div>
                <div role="cell" className="text-right font-mono font-semibold tabular-nums text-accent">
                  <span className="mb-1 block text-[11px] font-normal text-ink-faint md:hidden">Điểm quy đổi</span>
                  {points(row.campaignPoints)}
                </div>
              </div>
              {row.id === 'fees' && result.feeRows.map(feeRow => (
                <div role="row" key={`fee:${feeRow.id}`} className={`${GRID} bg-panel px-3 py-1.5 hover:bg-accent-soft/25`}>
                  <div role="rowheader" className="col-span-2 min-w-0 pl-4 text-ink-muted md:col-span-1">{feeRow.label}</div>
                  <div role="cell" className="hidden text-xs text-ink-muted md:block">Triệu đồng</div>
                  <div role="cell" className="text-right font-mono tabular-nums text-ink-faint">—</div>
                  <div role="cell">
                    <Input aria-label={`Thực hiện ${feeRow.label}`} type="text" inputMode="decimal"
                      value={inputValue(`fee:${feeRow.id}`, feeRow.actual, amountDigits)}
                      onChange={event => commitInput(`fee:${feeRow.id}`, event.target.value, value => onFeeChange(feeRow.id, value))}
                      onBlur={() => formatCommittedInput(`fee:${feeRow.id}`)}
                      className="kpi-forecast-number-input text-right font-mono" />
                  </div>
                  <div role="cell" className="text-right font-mono tabular-nums text-ink-faint">—</div>
                  <div role="cell" className="text-right font-mono tabular-nums">{points(feeRow.actualPoints)}</div>
                  <div role="cell" className="text-right font-mono tabular-nums text-ink-faint">—</div>
                  <div role="cell" className="text-right font-mono tabular-nums text-accent">{points(feeRow.actualPoints)}</div>
                </div>
              ))}
            </Fragment>
          ))}
          <div role="row" className={`${GRID} bg-panel-muted/45 px-3 py-2 font-semibold text-ink`}>
            <div role="rowheader" className="col-span-2 md:col-span-2">TỔNG CỘNG</div>
            <div role="cell" className="hidden text-right font-mono tabular-nums md:block">{points(result.planPoints)} điểm</div>
            <div role="cell" className="hidden md:block" />
            <div role="cell" className="text-right font-mono tabular-nums">{fmtPercent(result.baseCompletion, '0%')}</div>
            <div role="cell" className="text-right font-mono tabular-nums">{points(result.basePoints)} điểm</div>
            <div role="cell" className="hidden md:block" />
            <div role="cell" className="text-right font-mono tabular-nums text-accent">{points(result.campaignPoints)} điểm</div>
          </div>
        </div>
      </div>
    </section>
  );
}
