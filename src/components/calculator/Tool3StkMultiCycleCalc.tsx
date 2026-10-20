import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { buildStkRollover, TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import type { TenorUnit, StkCycleInput } from '../../lib/stkPledge';
import type { UiClasses } from '../../lib/uiClasses';

interface Tool3StkMultiCycleCalcProps {
  styles: UiClasses;
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

  const labelCls = `block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`;
  const inputCls = `w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs ${styles.inputStyle}`;
  const cellCls = `w-full rounded-lg p-1.5 text-[11px] font-mono border border-line/70 bg-surface/90 focus:border-accent ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div data-workspace-panel className={`${styles.containerCardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 shadow-xs specular-card space-y-4 text-xs animate-in fade-in duration-150`}>
        <div className="font-bold text-accent uppercase tracking-wider text-xs flex items-center space-x-2 border-b border-line/60 pb-3">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>BẢNG TÍNH LÃI SỔ TIẾT KIỆM TÁI TỤC NHIỀU KỲ (ACTUAL/365)</span>
        </div>

        {/* Thông tin Khoản Vay */}
        <div className="pl-4 border-l-2 border-accent/40 space-y-3">
          <div className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>THÔNG TIN KHOẢN VAY</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Số tiền vay (VNĐ)</label>
              <input
                type="text"
                value={loanAmountStr}
                onChange={e => setLoanAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-accent`}
              />
            </div>
            <div>
              <label className={labelCls}>Lãi suất vay (%/năm)</label>
              <input
                type="number"
                step="0.01"
                value={loanRateStr}
                onChange={e => setLoanRateStr(e.target.value)}
                className={`${inputCls} font-mono font-bold`}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày giải ngân</label>
              <DateInput
                value={disbursementDate}
                onChange={setDisbursementDate}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày đáo hạn vay</label>
              <DateInput
                value={loanDueDate}
                onChange={setLoanDueDate}
                className={inputCls}
              />
            </div>
          </div>
          <div className="text-[11px] text-ink-faint flex items-center gap-2 pt-1">
            <span>Số ngày vay: <strong className="font-mono text-ink">{result.loanDays}</strong> ngày</span>
            <span>·</span>
            <span>Tiền lãi vay: <strong className="font-mono text-accent">{fmtMoney(result.loanInterest)}</strong></span>
          </div>
        </div>

        {/* Sổ Tiết Kiệm Kỳ Đầu */}
        <div className="pl-4 border-l-2 border-warn/40 space-y-3">
          <div className="font-bold text-warn text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warn" />
            <span>SỔ TIẾT KIỆM KỲ ĐẦU</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Giá trị gốc kỳ đầu (VNĐ)</label>
              <input
                type="text"
                value={savingsAmountStr}
                onChange={e => setSavingsAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-warn`}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày gửi kỳ đầu</label>
              <DateInput
                value={firstDepositDate}
                onChange={setFirstDepositDate}
                className={inputCls}
              />
            </div>
          </div>
          <div className="text-[11px] text-ink-faint">
            Gốc kỳ sau tự lấy bằng gốc cộng lãi kỳ trước; ngày gửi kỳ sau lấy bằng ngày đáo hạn kỳ trước.
          </div>
        </div>

        {/* Header bảng các kỳ tái tục */}
        <div className="flex items-center justify-between pt-1">
          <div className="font-bold text-[11px] uppercase tracking-wider text-ink-faint">
            CHI TIẾT CÁC KỲ SỔ TIẾT KIỆM ({cycles.length} KỲ)
          </div>
          <button
            type="button"
            onClick={addCycle}
            className="bg-accent hover:opacity-95 text-accent-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-accent/25 cursor-pointer transition-all active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>THÊM KỲ TÁI TỤC</span>
          </button>
        </div>

        {/* Bảng chi tiết các kỳ */}
        <div data-workspace-panel className="overflow-x-auto border border-line/70 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse min-w-[940px]">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
              <tr>
                <th className="px-3 py-2.5 text-center">KỲ</th>
                <th className="px-3 py-2.5 text-right">GỐC KỲ NÀY</th>
                <th className="px-3 py-2.5">NGÀY GỬI</th>
                <th className="px-3 py-2.5 text-center w-20">KỲ HẠN</th>
                <th className="px-3 py-2.5 w-24">ĐƠN VỊ</th>
                <th className="px-3 py-2.5">NGÀY ĐÁO HẠN</th>
                <th className="px-3 py-2.5 text-center w-24">LS SỔ (%)</th>
                <th className="px-3 py-2.5 text-center">SỐ NGÀY</th>
                <th className="px-3 py-2.5 text-right">LÃI KỲ NÀY</th>
                <th className="px-3 py-2.5 text-right">GỐC + LÃI</th>
                <th className="px-3 py-2.5 text-center w-20">TỶ LỆ CC</th>
                <th className="px-3 py-2.5 text-right">CẦM CỐ ĐƯỢC</th>
                <th className="px-3 py-2.5 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {result.rows.map((row, i) => {
                const c = cycles[i];
                return (
                  <tr key={c.key} className="hover:bg-accent/[0.04] transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold font-mono">#{row.index}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-ink">{fmtMoney(row.openingPrincipal)}</td>
                    <td className="px-3 py-2.5 font-mono text-ink-faint">{row.depositDate ? fmtDate(row.depositDate) : '—'}</td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min={1}
                        value={c.tenor}
                        onChange={e => patchCycle(c.key, { tenor: parseInt(e.target.value, 10) || 1 })}
                        className={`${cellCls} text-center`}
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={c.tenorUnit}
                        onChange={e => patchCycle(c.key, { tenorUnit: e.target.value as TenorUnit })}
                        className={cellCls}
                      >
                        {(Object.keys(TENOR_UNIT_LABELS) as TenorUnit[]).map(u => (
                          <option key={u} value={u}>{TENOR_UNIT_LABELS[u]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-ink-faint">{row.dueDate ? fmtDate(row.dueDate) : '—'}</td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={(c.savingsRateAnnual * 100).toFixed(2)}
                        onChange={e => patchCycle(c.key, { savingsRateAnnual: (parseFloat(e.target.value) || 0) / 100 })}
                        className={`${cellCls} text-center font-bold`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-ink-faint">{row.days}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-warn">{fmtMoney(row.interest)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-ink">{fmtMoney(row.closingBalance)}</td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="1"
                        value={(c.pledgeRatio * 100).toFixed(0)}
                        onChange={e => patchCycle(c.key, { pledgeRatio: (parseFloat(e.target.value) || 0) / 100 })}
                        className={`${cellCls} text-center`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-accent">{fmtMoney(row.pledgeCapacity)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeCycle(c.key)}
                        disabled={cycles.length <= 1}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg-soft disabled:opacity-30 transition-colors cursor-pointer"
                        title="Xóa kỳ này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Thẻ tổng kết Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div data-workspace-panel className="p-4 rounded-2xl bg-warn-soft/25 border border-warn/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tổng lãi STK các kỳ</span>
            <div className="text-base sm:text-lg font-bold text-warn font-mono mt-1">
              {fmtMoney(result.totalSavingsInterest)}
            </div>
            <div className="text-[11px] text-ink-faint mt-1">
              Gốc + lãi cuối cùng: <strong className="font-mono text-ink">{fmtMoney(result.finalBalance)}</strong>
            </div>
          </div>

          <div data-workspace-panel className="p-4 rounded-2xl bg-accent-soft/25 border border-accent/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tiền lãi vay phải trả</span>
            <div className="text-base sm:text-lg font-bold text-accent font-mono mt-1">
              {fmtMoney(result.loanInterest)}
            </div>
            <div className="text-[11px] text-ink-faint mt-1">
              Tổng tiền trả nợ: <strong className="font-mono text-ink">{fmtMoney(result.totalRepayment)}</strong>
            </div>
          </div>

          <div data-workspace-panel className={`p-4 rounded-2xl border specular-card shadow-xs flex flex-col justify-between ${
            result.netGain >= 0
              ? 'bg-pos-soft/25 border-pos/30 text-pos'
              : 'bg-neg-soft/25 border-neg/30 text-neg'
          }`}>
            <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider flex items-center space-x-1.5">
              {result.netGain >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-pos" />
                : <TrendingDown className="w-3.5 h-3.5 text-neg" />}
              <span>CHÊNH LỆCH LÃI RÒNG</span>
            </div>
            <div className={`text-base sm:text-lg font-black font-mono mt-1 ${
              result.netGain >= 0 ? 'text-pos' : 'text-neg'
            }`}>
              {fmtMoney(result.netGain)}
            </div>
            <div className="text-[11px] text-ink-faint mt-1">Tổng lãi sổ − tiền lãi vay</div>
          </div>
        </div>
      </div>
    </div>
  );
};
