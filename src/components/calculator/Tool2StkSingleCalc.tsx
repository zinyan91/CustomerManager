import React, { useState, useMemo } from 'react';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { calcStkPledge, TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import type { TenorUnit } from '../../lib/stkPledge';
import type { UiClasses } from '../../lib/uiClasses';

interface Tool2StkSingleCalcProps {
  styles: UiClasses;
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
  const labelCls = `block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`;
  const inputCls = `w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 text-xs animate-in fade-in duration-150`}>
        <div className="font-bold text-accent uppercase tracking-wider text-xs flex items-center space-x-2 border-b border-line/60 pb-3">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <span>BẢNG TÍNH LÃI CẦM CỐ SỔ TIẾT KIỆM (ACTUAL/365)</span>
        </div>

        {/* Thông tin Sổ Tiết Kiệm */}
        <div className="p-4 rounded-2xl border border-line/60 bg-surface/60 backdrop-blur-md space-y-3 shadow-2xs">
          <div className="font-bold text-warn text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warn" />
            <span>THÔNG TIN SỔ TIẾT KIỆM</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Giá trị sổ tiết kiệm (VNĐ)</label>
              <input
                type="text"
                value={savingsAmountStr}
                onChange={e => setSavingsAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} font-mono font-bold text-warn`}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày gửi sổ</label>
              <input
                type="date"
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Lãi suất sổ (%/năm)</label>
              <input
                type="number"
                step="0.01"
                value={savingsRateStr}
                onChange={e => setSavingsRateStr(e.target.value)}
                className={`${inputCls} font-mono font-bold`}
              />
            </div>
            <div>
              <label className={labelCls}>Kỳ hạn</label>
              <input
                type="number"
                min={1}
                value={tenorStr}
                onChange={e => setTenorStr(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Đơn vị kỳ hạn</label>
              <select
                value={tenorUnit}
                onChange={e => setTenorUnit(e.target.value as TenorUnit)}
                className={`${inputCls} font-bold`}
              >
                {(Object.keys(TENOR_UNIT_LABELS) as TenorUnit[]).map(u => (
                  <option key={u} value={u}>{TENOR_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ngày đáo hạn sổ</label>
              <div className={`${inputCls} font-mono font-bold text-warn flex items-center`}>
                {result.savingsDueDate ? fmtDate(result.savingsDueDate) : '—'}
              </div>
            </div>
            <div>
              <label className={labelCls}>Số ngày gửi sổ</label>
              <div className={`${inputCls} font-mono font-bold text-warn flex items-center`}>
                {result.savingsDays > 0 ? `${result.savingsDays} ngày` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin Khoản Vay Cầm Cố */}
        <div className="p-4 rounded-2xl border border-line/60 bg-surface/60 backdrop-blur-md space-y-3 shadow-2xs">
          <div className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>THÔNG TIN KHOẢN VAY CẦM CỐ</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className={labelCls}>Tỷ lệ cầm cố</label>
              <div className={`${inputCls} font-mono font-bold flex items-center ${overPledged ? 'text-neg bg-neg-soft/30 border-neg/40' : 'text-accent'}`}>
                {savingsAmount > 0 ? `${(pledgeRatio * 100).toFixed(2)}%` : '—'}
              </div>
            </div>
            <div>
              <label className={labelCls}>Lãi suất vay (%/năm)</label>
              <input
                type="number"
                step="0.01"
                value={loanRateStr}
                onChange={e => setLoanRateStr(e.target.value)}
                className={`${inputCls} font-mono font-bold text-accent`}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày giải ngân</label>
              <input
                type="date"
                value={disbursementDate}
                onChange={e => setDisbursementDate(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày đáo hạn vay</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center space-x-1.5 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={useOwnLoanDue}
                    onChange={e => setUseOwnLoanDue(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="text-[11px] text-ink-muted">Khác ngày đáo hạn sổ</span>
                </label>
                {useOwnLoanDue ? (
                  <input
                    type="date"
                    value={loanDueDate}
                    onChange={e => setLoanDueDate(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                ) : (
                  <div className={`${inputCls} font-mono flex items-center`}>
                    {result.loanDueDate ? fmtDate(result.loanDueDate) : '—'}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Số ngày vay</label>
              <div className={`${inputCls} font-mono font-bold text-accent flex items-center`}>
                {result.loanDays > 0 ? `${result.loanDays} ngày` : '—'}
              </div>
            </div>
          </div>
        </div>

        {overPledged && (
          <div className="rounded-xl border border-neg/30 bg-neg-soft/30 p-3 text-xs font-bold text-neg flex items-center gap-2">
            <span>⚠</span>
            <span>Số tiền vay lớn hơn giá trị sổ tiết kiệm — tỷ lệ cầm cố vượt 100%.</span>
          </div>
        )}

        {/* Kết quả tính toán Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-warn-soft/25 border border-warn/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Lãi sổ tiết kiệm nhận được</span>
            <div className="text-base sm:text-lg font-bold text-warn font-mono mt-1">
              {fmtMoney(result.savingsInterest)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-warn-soft/25 border border-warn/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tổng gốc + lãi sổ nhận được</span>
            <div className="text-base sm:text-lg font-bold text-warn font-mono mt-1">
              {fmtMoney(result.savingsTotal)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-accent-soft/25 border border-accent/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tiền lãi vay phải trả</span>
            <div className="text-base sm:text-lg font-bold text-accent font-mono mt-1">
              {fmtMoney(result.loanInterest)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-accent-soft/25 border border-accent/30 specular-card shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tổng tiền trả nợ khi đáo hạn</span>
            <div className="text-base sm:text-lg font-bold text-accent font-mono mt-1">
              {fmtMoney(result.totalRepayment)}
            </div>
          </div>
        </div>

        {/* Chênh lệch net banner */}
        <div className={`p-4 sm:p-5 rounded-2xl border specular-card shadow-xs ${
          result.netGain >= 0
            ? 'bg-pos-soft/30 border-pos/30 text-pos'
            : 'bg-neg-soft/30 border-neg/30 text-neg'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl shrink-0 ${result.netGain >= 0 ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'}`}>
                {result.netGain >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold tracking-wider uppercase">
                  {result.netGain >= 0 ? 'CHÊNH LỆCH — KHÁCH HÀNG CÒN LỢI NHUẬN' : 'CHÊNH LỆCH — KHÁCH HÀNG CHỊU CHI PHÍ THIỆT HẠI'}
                </div>
                <div className="text-[11px] text-ink-faint mt-0.5">
                  (Tiền lãi sổ tiết kiệm thu về trừ Tổng tiền lãi vay phải trả)
                </div>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
              {fmtMoney(result.netGain)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
