import { useMemo, useState } from 'react';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import { estimateSettlementLine, estimateTotals } from '../../lib/settlementEstimate';
import { CREDIT_CONTRACT_LOAN_METHODS } from '../../lib/loanProductRules';
import { fmtNumber, formatMoneyInput, parseDecimalNumber, parseMoneyInput, todayIso } from '../../lib/utils';
import { DateInput } from '../DateInput';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';

const LOAN_METHODS = CREDIT_CONTRACT_LOAN_METHODS.filter(m => m !== 'Hạn mức thẻ tín dụng');

interface Row {
  id: number;
  loanMethod: string;
  principal: string;
  rate: string;
  disbursementDate: string;
  interestFromDate: string;
  settlementDate: string;
  penaltyInput: string;
}

let nextRowId = 1;
const newRow = (settlementDate: string): Row => ({
  id: nextRowId++, loanMethod: 'Cho vay từng lần', principal: '', rate: '', disbursementDate: '', interestFromDate: '', settlementDate, penaltyInput: '',
});

const cellInput = 'w-full rounded-md border border-line bg-panel px-2 py-1 text-xs';

export function Tool10SettlementEstimateCalc({ styles = UI }: { styles?: UiClasses }) {
  const [commonDate, setCommonDate] = useState(() => todayIso());
  const [rows, setRows] = useState<Row[]>(() => [newRow(todayIso()), newRow(todayIso())]);

  const update = (id: number, patch: Partial<Row>) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: number) => setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));

  const lines = useMemo(() => rows.map(r => estimateSettlementLine({
    loanMethod: r.loanMethod,
    principal: parseMoneyInput(r.principal),
    rateAnnualPercent: parseDecimalNumber(r.rate) || 0,
    disbursementDate: r.disbursementDate,
    interestFromDate: r.interestFromDate,
    settlementDate: r.settlementDate,
    penaltyOverridePercent: r.penaltyInput.trim() === '' ? null : Math.max(0, parseDecimalNumber(r.penaltyInput) || 0),
  })), [rows]);
  const totals = useMemo(() => estimateTotals(lines), [lines]);

  const cardBg = styles.containerCardBg || UI.containerCardBg;

  return (
    <div data-workspace-panel className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 shadow-xs space-y-4 font-app`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <CalendarCheck className="w-4 h-4 text-accent" />
          <span>Ước tính tất toán nhiều khoản</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1" htmlFor="common-settlement-date">Ngày tất toán chung</label>
            <DateInput id="common-settlement-date" value={commonDate} onChange={setCommonDate} className={`${cellInput} w-36`} />
          </div>
          <button
            type="button"
            onClick={() => setRows(prev => prev.map(r => ({ ...r, settlementDate: commonDate })))}
            className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-panel-muted"
          >
            Áp cho mọi khoản
          </button>
          <button
            type="button"
            onClick={() => setRows(prev => [...prev, newRow(commonDate)])}
            className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm khoản vay
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-xs border-collapse">
          <thead className="bg-surface text-ink-muted font-semibold">
            <tr className="border-b border-line">
              <th className="p-2 w-8 text-center">#</th>
              <th className="p-2 text-left w-44">Hình thức vay</th>
              <th className="p-2 text-right w-36">Dư nợ gốc (VND)</th>
              <th className="p-2 text-right w-20">Lãi suất (%/năm)</th>
              <th className="p-2 text-center w-32">Ngày giải ngân</th>
              <th className="p-2 text-center w-32">Ngày trả lãi gần nhất</th>
              <th className="p-2 text-center w-32">Ngày tất toán</th>
              <th className="p-2 text-right w-32">Phí (%)</th>
              <th className="p-2 text-right">Lãi dồn tích</th>
              <th className="p-2 text-right">Phí trả trước</th>
              <th className="p-2 text-right">Tổng tất toán</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((r, idx) => {
              const line = lines[idx];
              const label = `khoản ${idx + 1}`;
              return (
                <tr key={r.id}>
                  <td className="p-2 text-center align-top text-ink-faint">{idx + 1}</td>
                  <td className="p-2 align-top">
                    <select aria-label={`Hình thức vay ${label}`} value={r.loanMethod} onChange={e => update(r.id, { loanMethod: e.target.value })} className={cellInput}>
                      {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {line.error && <div role="alert" className="mt-1 text-[11px] text-neg">{line.error}</div>}
                  </td>
                  <td className="p-2 align-top">
                    <input aria-label={`Dư nợ gốc ${label}`} inputMode="numeric" value={r.principal} onChange={e => update(r.id, { principal: formatMoneyInput(e.target.value) })} className={`${cellInput} text-right font-mono`} />
                  </td>
                  <td className="p-2 align-top">
                    <input aria-label={`Lãi suất ${label}`} inputMode="decimal" value={r.rate} onChange={e => update(r.id, { rate: e.target.value })} className={`${cellInput} text-right font-mono`} />
                  </td>
                  <td className="p-2 align-top"><DateInput ariaLabel={`Ngày giải ngân ${label}`} value={r.disbursementDate} onChange={v => update(r.id, { disbursementDate: v })} className={cellInput} /></td>
                  <td className="p-2 align-top"><DateInput ariaLabel={`Ngày trả lãi gần nhất ${label}`} value={r.interestFromDate} onChange={v => update(r.id, { interestFromDate: v })} className={cellInput} /></td>
                  <td className="p-2 align-top"><DateInput ariaLabel={`Ngày tất toán ${label}`} value={r.settlementDate} onChange={v => update(r.id, { settlementDate: v })} className={cellInput} /></td>
                  <td className="p-2 align-top">
                    <input
                      aria-label={`Phí trả trước (%) ${label}`}
                      inputMode="decimal"
                      value={r.penaltyInput}
                      placeholder={String(line.fee.percent).replace('.', ',')}
                      onChange={e => update(r.id, { penaltyInput: e.target.value })}
                      className={`${cellInput} text-right font-mono`}
                    />
                    <div className="mt-1 text-[11px] text-ink-faint text-right whitespace-nowrap">{line.fee.reason}</div>
                  </td>
                  <td className="p-2 align-top text-right font-mono tabular-nums">
                    {line.error ? '—' : fmtNumber(line.accruedInterest)}
                    {!line.error && <div className="text-[11px] text-ink-faint">{line.accruedDays} ngày</div>}
                  </td>
                  <td className="p-2 align-top text-right font-mono tabular-nums">{line.error ? '—' : fmtNumber(line.penaltyFee)}</td>
                  <td className="p-2 align-top text-right font-mono tabular-nums font-semibold text-ink">{line.error ? '—' : fmtNumber(line.total)}</td>
                  <td className="p-2 align-top text-center">
                    <button type="button" onClick={() => remove(r.id)} disabled={rows.length === 1} aria-label={`Xoá ${label}`}
                      className="p-1 rounded-md text-ink-faint hover:text-neg hover:bg-neg-soft disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-line bg-surface font-bold text-ink">
              <td colSpan={2} className="p-2 text-right">TỔNG CỘNG ({totals.count} khoản)</td>
              <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.principal)}</td>
              <td colSpan={5} />
              <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.interest)}</td>
              <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.fee)}</td>
              <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
