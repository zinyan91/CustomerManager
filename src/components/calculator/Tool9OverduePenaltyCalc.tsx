import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import {
  calcOverduePenalty,
  DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER,
  DEFAULT_INTEREST_PENALTY_RATE,
} from '../../lib/stkPledge';
import type { UiClasses } from '../../lib/uiClasses';

interface Props {
  styles: UiClasses;
}

interface PenaltyRow {
  key: number;
  contractCode: string;
  overduePrincipalStr: string;
  normalRateStr: string;
  principalDaysStr: string;
  unpaidInterestStr: string;
  interestPenaltyRateStr: string;
  interestDaysStr: string;
}

const newRow = (key: number): PenaltyRow => ({
  key,
  contractCode: `HD${String(key).padStart(3, '0')}`,
  overduePrincipalStr: '900.000.000',
  normalRateStr: '6.5',
  principalDaysStr: '15',
  unpaidInterestStr: '12.000.000',
  interestPenaltyRateStr: '10',
  interestDaysStr: '15',
});

export const Tool9OverduePenaltyCalc: React.FC<Props> = ({ styles }) => {
  const [rows, setRows] = useState<PenaltyRow[]>([newRow(1)]);
  const [nextKey, setNextKey] = useState(2);

  const patch = (key: number, p: Partial<PenaltyRow>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...p } : r)));

  const results = useMemo(() => rows.map(r => ({
    row: r,
    calc: calcOverduePenalty({
      overduePrincipal: parseMoneyInput(r.overduePrincipalStr),
      normalRateAnnual: (parseFloat(r.normalRateStr) || 0) / 100,
      principalOverdueDays: parseInt(r.principalDaysStr, 10) || 0,
      unpaidInterest: parseMoneyInput(r.unpaidInterestStr),
      interestPenaltyRateAnnual: r.interestPenaltyRateStr.trim() === ''
        ? DEFAULT_INTEREST_PENALTY_RATE
        : (parseFloat(r.interestPenaltyRateStr) || 0) / 100,
      interestOverdueDays: parseInt(r.interestDaysStr, 10) || 0,
    }),
  })), [rows]);

  const totals = results.reduce((a, x) => ({
    principalPenalty: a.principalPenalty + x.calc.principalPenalty,
    interestPenalty: a.interestPenalty + x.calc.interestPenalty,
    totalDue: a.totalDue + x.calc.totalDue,
  }), { principalPenalty: 0, interestPenalty: 0, totalDue: 0 });

  const cellCls = `w-full rounded-lg p-1.5 text-[11px] font-mono ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2">
          <div className="font-bold text-accent uppercase tracking-wider text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-neg" />
            <span>BẢNG TÍNH TIỀN PHẠT CHẬM TRẢ QUÁ HẠN</span>
          </div>
          <button
            type="button"
            onClick={() => { setRows(prev => [...prev, newRow(nextKey)]); setNextKey(k => k + 1); }}
            className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /><span>THÊM HỢP ĐỒNG</span>
          </button>
        </div>

        <div className="text-[11px] text-ink-faint">
          Phạt <strong>{(DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER * 100).toFixed(0)}%</strong> lãi suất trong hạn
          trên nợ gốc quá hạn, và <strong>{(DEFAULT_INTEREST_PENALTY_RATE * 100).toFixed(0)}%/năm</strong> trên
          số tiền lãi chậm trả. Tính theo số ngày thực tế chia 365.
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1080px]">
            <thead className="bg-panel-muted font-bold border-b border-line">
              <tr>
                <th className="p-2">MÃ HĐ</th>
                <th className="p-2 text-right min-w-[130px]">DƯ NỢ GỐC QUÁ HẠN</th>
                <th className="p-2 text-center w-24">LS TRONG HẠN</th>
                <th className="p-2 text-center w-24">LS PHẠT GỐC</th>
                <th className="p-2 text-center w-20">SỐ NGÀY</th>
                <th className="p-2 text-right">TIỀN PHẠT GỐC</th>
                <th className="p-2 text-right min-w-[120px]">LÃI CHẬM TRẢ</th>
                <th className="p-2 text-center w-24">LS PHẠT LÃI</th>
                <th className="p-2 text-center w-20">SỐ NGÀY</th>
                <th className="p-2 text-right">TIỀN PHẠT LÃI</th>
                <th className="p-2 text-right min-w-[140px]">TỔNG PHẢI TRẢ</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.map(({ row, calc }) => (
                <tr key={row.key} className="hover:bg-panel-muted">
                  <td className="p-1.5">
                    <input type="text" value={row.contractCode}
                      onChange={e => patch(row.key, { contractCode: e.target.value })} className={cellCls} />
                  </td>
                  <td className="p-1.5">
                    <input type="text" value={row.overduePrincipalStr}
                      onChange={e => patch(row.key, { overduePrincipalStr: formatMoneyInput(e.target.value) })}
                      className={`${cellCls} text-right font-bold`} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" step="0.01" value={row.normalRateStr}
                      onChange={e => patch(row.key, { normalRateStr: e.target.value })}
                      className={`${cellCls} text-center`} />
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-neg">
                    {(calc.principalPenaltyRate * 100).toFixed(2)}%
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} value={row.principalDaysStr}
                      onChange={e => patch(row.key, { principalDaysStr: e.target.value })}
                      className={`${cellCls} text-center`} />
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-neg">
                    {fmtMoney(calc.principalPenalty)}
                  </td>
                  <td className="p-1.5">
                    <input type="text" value={row.unpaidInterestStr}
                      onChange={e => patch(row.key, { unpaidInterestStr: formatMoneyInput(e.target.value) })}
                      className={`${cellCls} text-right`} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" step="0.01" value={row.interestPenaltyRateStr}
                      onChange={e => patch(row.key, { interestPenaltyRateStr: e.target.value })}
                      className={`${cellCls} text-center`} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} value={row.interestDaysStr}
                      onChange={e => patch(row.key, { interestDaysStr: e.target.value })}
                      className={`${cellCls} text-center`} />
                  </td>
                  <td className="p-2 text-right font-mono text-neg">
                    {fmtMoney(calc.interestPenalty)}
                  </td>
                  <td className="p-2 text-right font-mono font-extrabold text-accent">
                    {fmtMoney(calc.totalDue)}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== row.key) : prev))}
                      disabled={rows.length <= 1}
                      className="text-ink-faint hover:text-neg disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-accent-soft  font-bold border-t-2 border-accent/30">
              <tr>
                <td className="p-2" colSpan={5}>TỔNG</td>
                <td className="p-2 text-right font-mono text-neg">{fmtMoney(totals.principalPenalty)}</td>
                <td className="p-2" colSpan={3} />
                <td className="p-2 text-right font-mono text-neg">{fmtMoney(totals.interestPenalty)}</td>
                <td className="p-2 text-right font-mono text-accent text-sm">{fmtMoney(totals.totalDue)}</td>
                <td className="p-2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="text-[11px] text-ink-faint space-y-0.5 pt-2 border-t border-line">
          <div>• Tiền phạt gốc = Dư nợ gốc quá hạn × (LS trong hạn × 150%) × Số ngày / 365</div>
          <div>• Tiền phạt lãi = Tiền lãi chậm trả × LS phạt lãi × Số ngày / 365</div>
          <div>• Tổng phải trả = Nợ gốc quá hạn + Lãi chậm trả + Phạt gốc + Phạt lãi</div>
        </div>
      </div>
    </div>
  );
};
