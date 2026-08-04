import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { buildStkRollover, TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import type { TenorUnit, StkCycleInput } from '../../lib/stkPledge';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool3StkMultiCycleCalcProps {
  styles: ThemeStyles;
  isLight: boolean;
}

interface CycleRowState extends StkCycleInput {
  key: number;
}

export const Tool3StkMultiCycleCalc: React.FC<Tool3StkMultiCycleCalcProps> = ({ styles }) => {
  const [loanAmountStr, setLoanAmountStr] = useState('500.000.000');
  const [loanRateStr, setLoanRateStr] = useState('10.5');
  const [disbursementDate, setDisbursementDate] = useState('2026-02-27');
  const [loanDueDate, setLoanDueDate] = useState('2027-02-27');
  const [savingsAmountStr, setSavingsAmountStr] = useState('500.000.000');
  const [firstDepositDate, setFirstDepositDate] = useState('2026-02-27');

  const [cycles, setCycles] = useState<CycleRowState[]>([
    { key: 1, tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.075, pledgeRatio: 1 },
    { key: 2, tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.068, pledgeRatio: 1 },
    { key: 3, tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.065, pledgeRatio: 1 },
  ]);
  const [nextKey, setNextKey] = useState(4);

  const patchCycle = (key: number, patch: Partial<CycleRowState>) =>
    setCycles(prev => prev.map(c => (c.key === key ? { ...c, ...patch } : c)));

  const addCycle = () => {
    const last = cycles[cycles.length - 1];
    setCycles(prev => [...prev, {
      key: nextKey, tenor: 6, tenorUnit: 'thang',
      savingsRateAnnual: last ? last.savingsRateAnnual : 0.06, pledgeRatio: 1,
    }]);
    setNextKey(k => k + 1);
  };

  const removeCycle = (key: number) =>
    setCycles(prev => (prev.length > 1 ? prev.filter(c => c.key !== key) : prev));

  const result = useMemo(() => buildStkRollover({
    loanAmount: parseMoneyInput(loanAmountStr),
    loanRateAnnual: (parseFloat(loanRateStr) || 0) / 100,
    disbursementDate,
    loanDueDate,
    initialSavingsAmount: parseMoneyInput(savingsAmountStr),
    firstDepositDate,
    cycles,
  }), [loanAmountStr, loanRateStr, disbursementDate, loanDueDate, savingsAmountStr, firstDepositDate, cycles]);

  const labelCls = `block mb-1 ${styles.labelStyle}`;
  const inputCls = `w-full rounded-xl p-2 ${styles.inputStyle}`;
  const cellCls = `w-full rounded-lg p-1.5 text-[11px] font-mono ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <TrendingUp className="w-4 h-4" />
          <span>BẢNG TÍNH LÃI SỔ TIẾT KIỆM TÁI TỤC NHIỀU KỲ (ACTUAL/365)</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-[11px] uppercase">THÔNG TIN KHOẢN VAY</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className={labelCls}>Số tiền vay (VNĐ)</label>
              <input type="text" value={loanAmountStr}
                onChange={e => setLoanAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-sky-600 dark:text-sky-400`} />
            </div>
            <div>
              <label className={labelCls}>Lãi suất vay (%/năm)</label>
              <input type="number" step="0.01" value={loanRateStr}
                onChange={e => setLoanRateStr(e.target.value)} className={`${inputCls} font-mono font-bold`} />
            </div>
            <div>
              <label className={labelCls}>Ngày giải ngân</label>
              <input type="date" value={disbursementDate} onChange={e => setDisbursementDate(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Ngày đáo hạn vay</label>
              <input type="date" value={loanDueDate} onChange={e => setLoanDueDate(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Số ngày vay: <strong className="font-mono">{result.loanDays}</strong> ngày · Tiền lãi vay:{' '}
            <strong className="font-mono text-sky-600 dark:text-sky-400">{fmtMoney(result.loanInterest)}</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-amber-500 text-[11px] uppercase">SỔ TIẾT KIỆM KỲ ĐẦU</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Giá trị gốc kỳ đầu (VNĐ)</label>
              <input type="text" value={savingsAmountStr}
                onChange={e => setSavingsAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-amber-600 dark:text-amber-400`} />
            </div>
            <div>
              <label className={labelCls}>Ngày gửi kỳ đầu</label>
              <input type="date" value={firstDepositDate} onChange={e => setFirstDepositDate(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Gốc kỳ sau tự lấy bằng gốc cộng lãi kỳ trước; ngày gửi kỳ sau lấy bằng ngày đáo hạn kỳ trước.
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="font-bold text-[11px] uppercase text-slate-500">CHI TIẾT CÁC KỲ SỔ TIẾT KIỆM</div>
          <button type="button" onClick={addCycle}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>THÊM KỲ</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-[940px]">
            <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2 text-center">KỲ</th>
                <th className="p-2 text-right">GỐC KỲ NÀY</th>
                <th className="p-2">NGÀY GỬI</th>
                <th className="p-2 text-center w-20">KỲ HẠN</th>
                <th className="p-2 w-24">ĐƠN VỊ</th>
                <th className="p-2">NGÀY ĐÁO HẠN</th>
                <th className="p-2 text-center w-24">LS SỔ (%)</th>
                <th className="p-2 text-center">SỐ NGÀY</th>
                <th className="p-2 text-right">LÃI KỲ NÀY</th>
                <th className="p-2 text-right">GỐC + LÃI</th>
                <th className="p-2 text-center w-20">TỶ LỆ CC</th>
                <th className="p-2 text-right">CẦM CỐ ĐƯỢC</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {result.rows.map((row, i) => {
                const c = cycles[i];
                return (
                  <tr key={c.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2 text-center font-bold">{row.index}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(row.openingPrincipal)}</td>
                    <td className="p-2 font-mono text-slate-500">{row.depositDate ? fmtDate(row.depositDate) : '—'}</td>
                    <td className="p-1.5">
                      <input type="number" min={1} value={c.tenor}
                        onChange={e => patchCycle(c.key, { tenor: parseInt(e.target.value, 10) || 1 })}
                        className={`${cellCls} text-center`} />
                    </td>
                    <td className="p-1.5">
                      <select value={c.tenorUnit}
                        onChange={e => patchCycle(c.key, { tenorUnit: e.target.value as TenorUnit })}
                        className={cellCls}>
                        {(Object.keys(TENOR_UNIT_LABELS) as TenorUnit[]).map(u => (
                          <option key={u} value={u}>{TENOR_UNIT_LABELS[u]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 font-mono text-slate-500">{row.dueDate ? fmtDate(row.dueDate) : '—'}</td>
                    <td className="p-1.5">
                      <input type="number" step="0.01" value={(c.savingsRateAnnual * 100).toFixed(2)}
                        onChange={e => patchCycle(c.key, { savingsRateAnnual: (parseFloat(e.target.value) || 0) / 100 })}
                        className={`${cellCls} text-center font-bold`} />
                    </td>
                    <td className="p-2 text-center font-mono">{row.days}</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{fmtMoney(row.interest)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(row.closingBalance)}</td>
                    <td className="p-1.5">
                      <input type="number" step="1" value={(c.pledgeRatio * 100).toFixed(0)}
                        onChange={e => patchCycle(c.key, { pledgeRatio: (parseFloat(e.target.value) || 0) / 100 })}
                        className={`${cellCls} text-center`} />
                    </td>
                    <td className="p-2 text-right font-mono text-sky-600 dark:text-sky-400">{fmtMoney(row.pledgeCapacity)}</td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeCycle(c.key)} disabled={cycles.length <= 1}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase">TỔNG LÃI STK CÁC KỲ</div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
              {fmtMoney(result.totalSavingsInterest)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Gốc + lãi cuối cùng: {fmtMoney(result.finalBalance)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase">TIỀN LÃI VAY PHẢI TRẢ</div>
            <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
              {fmtMoney(result.loanInterest)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tổng tiền trả nợ: {fmtMoney(result.totalRepayment)}
            </div>
          </div>
          <div className={`p-4 rounded-2xl border ${
            result.netGain >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
          }`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center space-x-1.5">
              {result.netGain >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
              <span>CHÊNH LỆCH</span>
            </div>
            <div className={`text-lg font-extrabold font-mono mt-1 ${
              result.netGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fmtMoney(result.netGain)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tổng lãi sổ − tiền lãi vay</div>
          </div>
        </div>
      </div>
    </div>
  );
};
