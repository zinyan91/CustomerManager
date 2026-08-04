import React, { useState, useMemo } from 'react';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { calcStkPledge, TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import type { TenorUnit } from '../../lib/stkPledge';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool2StkSingleCalcProps {
  styles: ThemeStyles;
}

export const Tool2StkSingleCalc: React.FC<Tool2StkSingleCalcProps> = ({ styles }) => {
  const [savingsAmountStr, setSavingsAmountStr] = useState('450.000.000');
  const [loanAmountStr, setLoanAmountStr] = useState('150.000.000');
  const [depositDate, setDepositDate] = useState('2026-05-20');
  const [tenorStr, setTenorStr] = useState('6');
  const [tenorUnit, setTenorUnit] = useState<TenorUnit>('thang');
  const [savingsRateStr, setSavingsRateStr] = useState('8.2');
  const [loanRateStr, setLoanRateStr] = useState('11.0');
  const [disbursementDate, setDisbursementDate] = useState('2026-07-27');
  const [useOwnLoanDue, setUseOwnLoanDue] = useState(false);
  const [loanDueDate, setLoanDueDate] = useState('2026-11-20');

  const savingsAmount = parseMoneyInput(savingsAmountStr);
  const loanAmount = parseMoneyInput(loanAmountStr);
  const pledgeRatio = savingsAmount > 0 ? loanAmount / savingsAmount : 0;

  const result = useMemo(() => calcStkPledge({
    savingsAmount,
    pledgeRatio,
    depositDate,
    tenor: parseInt(tenorStr, 10) || 0,
    tenorUnit,
    savingsRateAnnual: (parseFloat(savingsRateStr) || 0) / 100,
    loanRateAnnual: (parseFloat(loanRateStr) || 0) / 100,
    disbursementDate,
    loanDueDate: useOwnLoanDue ? loanDueDate : undefined,
  }), [
    savingsAmount, pledgeRatio, depositDate, tenorStr, tenorUnit,
    savingsRateStr, loanRateStr, disbursementDate, useOwnLoanDue, loanDueDate,
  ]);

  const overPledged = savingsAmount > 0 && loanAmount > savingsAmount;
  const labelCls = `block mb-1 ${styles.labelStyle}`;
  const inputCls = `w-full rounded-xl p-2 ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Layers className="w-4 h-4" />
          <span>BẢNG TÍNH LÃI CẦM CỐ SỔ TIẾT KIỆM (ACTUAL/365)</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-amber-500 text-[11px] uppercase">THÔNG TIN SỔ TIẾT KIỆM</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={labelCls}>Giá trị sổ tiết kiệm (VNĐ)</label>
              <input type="text" value={savingsAmountStr}
                onChange={e => setSavingsAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-amber-600 dark:text-amber-400`} />
            </div>
            <div>
              <label className={labelCls}>Ngày gửi sổ</label>
              <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Lãi suất sổ (%/năm)</label>
              <input type="number" step="0.01" value={savingsRateStr}
                onChange={e => setSavingsRateStr(e.target.value)}
                className={`${inputCls} font-mono font-bold`} />
            </div>
            <div>
              <label className={labelCls}>Kỳ hạn</label>
              <input type="number" min={1} value={tenorStr} onChange={e => setTenorStr(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Đơn vị kỳ hạn</label>
              <select value={tenorUnit} onChange={e => setTenorUnit(e.target.value as TenorUnit)} className={inputCls}>
                {(Object.keys(TENOR_UNIT_LABELS) as TenorUnit[]).map(u => (
                  <option key={u} value={u}>{TENOR_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ngày đáo hạn sổ</label>
              <div className={`${inputCls} font-mono font-bold text-amber-600 dark:text-amber-400`}>
                {result.savingsDueDate ? fmtDate(result.savingsDueDate) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-[11px] uppercase">THÔNG TIN KHOẢN VAY CẦM CỐ</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={labelCls}>Số tiền vay (VNĐ)</label>
              <input type="text" value={loanAmountStr}
                onChange={e => setLoanAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-sky-600 dark:text-sky-400`} />
            </div>
            <div>
              <label className={labelCls}>Tỷ lệ cầm cố</label>
              <div className={`${inputCls} font-mono font-bold ${overPledged ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                {savingsAmount > 0 ? `${(pledgeRatio * 100).toFixed(2)}%` : '—'}
              </div>
            </div>
            <div>
              <label className={labelCls}>Lãi suất vay (%/năm)</label>
              <input type="number" step="0.01" value={loanRateStr}
                onChange={e => setLoanRateStr(e.target.value)}
                className={`${inputCls} font-mono font-bold text-sky-600 dark:text-sky-400`} />
            </div>
            <div>
              <label className={labelCls}>Ngày giải ngân</label>
              <input type="date" value={disbursementDate} onChange={e => setDisbursementDate(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Ngày đáo hạn vay</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center space-x-1.5 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={useOwnLoanDue} onChange={e => setUseOwnLoanDue(e.target.checked)} />
                  <span className="text-[11px]">Khác ngày đáo hạn sổ</span>
                </label>
                {useOwnLoanDue ? (
                  <input type="date" value={loanDueDate} onChange={e => setLoanDueDate(e.target.value)} className={`${inputCls} font-mono`} />
                ) : (
                  <div className={`${inputCls} font-mono`}>{result.loanDueDate ? fmtDate(result.loanDueDate) : '—'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {overPledged && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-[11px] font-bold text-rose-700 dark:text-rose-300">
            ⚠ Số tiền vay lớn hơn giá trị sổ tiết kiệm — tỷ lệ cầm cố vượt 100%.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase">LÃI SỔ TIẾT KIỆM NHẬN ĐƯỢC</div>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
              {fmtMoney(result.savingsInterest)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {fmtMoney(savingsAmount)} × {savingsRateStr}% × {result.savingsDays} ngày / 365
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase">TIỀN LÃI VAY PHẢI TRẢ</div>
            <div className="text-xl font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
              {fmtMoney(result.loanInterest)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {fmtMoney(result.loanAmount)} × {loanRateStr}% × {result.loanDays} ngày / 365
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          result.netGain >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {result.netGain >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                : <TrendingDown className="w-5 h-5 text-rose-500" />}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {result.netGain >= 0 ? 'CHÊNH LỆCH — KHÁCH HÀNG CÒN LỢI' : 'CHÊNH LỆCH — KHÁCH HÀNG CHỊU THIỆT'}
              </span>
            </div>
            <span className={`text-2xl font-extrabold font-mono ${
              result.netGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fmtMoney(result.netGain)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            Lãi sổ {fmtMoney(result.savingsInterest)} − Lãi vay {fmtMoney(result.loanInterest)}.
            Tổng tiền trả nợ khi đáo hạn: <strong className="font-mono">{fmtMoney(result.totalRepayment)}</strong>
            {' '}(gốc vay {fmtMoney(result.loanAmount)} + lãi vay {fmtMoney(result.loanInterest)}).
          </div>
        </div>
      </div>
    </div>
  );
};
