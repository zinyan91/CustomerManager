import { useState } from 'react';
import type { SettlementEstimateImport } from '../../hooks/useSettlementEstimateImport';
import type { EstimateSourceLoan } from '../../lib/settlementEstimateSource';
import { fmtDate, fmtDecimals, fmtNumber } from '../../lib/utils';
import { CustomerPicker } from '../ui/CustomerPicker';

interface Props {
  source: SettlementEstimateImport;
  onAdd: (loans: EstimateSourceLoan[]) => void;
}

export function SettlementEstimateImportPanel({ source, onAdd }: Props) {
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const loans = source.loans;

  const toggle = (id: number) => setExcluded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const chosen = (loans ?? []).filter(l => !excluded.has(l.contractId));

  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-3">
      <div className="max-w-md">
        <CustomerPicker
          customers={source.customers}
          selectedCustomerId={source.customerId}
          onSelectCustomer={id => void source.selectCustomer(id)}
          placeholder="— Chọn khách hàng —"
        />
      </div>

      {source.error && <div role="alert" className="text-xs text-neg">{source.error}</div>}
      {source.loading && <div role="status" className="text-xs text-ink-muted">Đang tải khoản vay…</div>}

      {loans && loans.length === 0 && source.skipped.length === 0 && (
        <div className="text-xs text-ink-muted">Khách hàng không còn KUNN nào chưa tất toán.</div>
      )}

      {loans && loans.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-ink-muted">
            <tr className="border-b border-line">
              <th className="p-1.5 w-8"><span className="sr-only">Chọn</span></th>
              <th className="p-1.5 text-left">Số KUNN</th>
              <th className="p-1.5 text-left">Hình thức vay</th>
              <th className="p-1.5 text-right">Dư nợ gốc</th>
              <th className="p-1.5 text-right">Lãi suất</th>
              <th className="p-1.5 text-center">Tính lãi từ</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(l => (
              <tr key={l.contractId} className="border-b border-line/60">
                <td className="p-1.5 text-center">
                  <input type="checkbox" aria-label={`Chọn ${l.contractNumber}`} checked={!excluded.has(l.contractId)}
                    onChange={() => toggle(l.contractId)} className="accent-accent" />
                </td>
                <td className="p-1.5 font-mono">{l.contractNumber}</td>
                <td className="p-1.5">{l.loanMethod}</td>
                <td className="p-1.5 text-right font-mono">{fmtNumber(l.principal)}</td>
                <td className="p-1.5 text-right font-mono">{fmtDecimals(l.rateAnnualPercent, 2)}%</td>
                <td className="p-1.5 text-center">{fmtDate(l.interestFromDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {source.skipped.length > 0 && (
        <ul className="text-[11px] text-warn space-y-0.5">
          {source.skipped.map(s => <li key={s.contractId}>{s.contractNumber}: {s.reason}</li>)}
        </ul>
      )}

      {loans && loans.length > 0 && (
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() => onAdd(chosen)}
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold disabled:opacity-40"
        >
          Thêm {chosen.length} khoản vào bảng
        </button>
      )}
    </div>
  );
}
