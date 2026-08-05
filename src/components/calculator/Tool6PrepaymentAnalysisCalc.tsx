import React, { useState, useMemo } from 'react';
import { ShieldAlert, DollarSign, Award, CheckCircle } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool6Props {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool6PrepaymentAnalysisCalc: React.FC<Tool6Props> = ({ isLight }) => {
  const [balanceStr, setBalanceStr] = useState('800.000.000');
  const [prepayAmountStr, setPrepayAmountStr] = useState('800.000.000');
  const [rateAnnualStr, setRateAnnualStr] = useState('11.5');
  const [remainingTenorMonths, setRemainingTenorMonths] = useState<number>(60);
  const [loanAgeYear, setLoanAgeYear] = useState<number>(2);

  const [penaltyYear1, setPenaltyYear1] = useState<string>('2.0');
  const [penaltyYear2, setPenaltyYear2] = useState<string>('1.5');
  const [penaltyYear3, setPenaltyYear3] = useState<string>('1.0');
  const [penaltyYear4Plus, setPenaltyYear4Plus] = useState<string>('0.0');

  const balance = parseMoneyInput(balanceStr);
  const prepayAmt = parseMoneyInput(prepayAmountStr) || balance;
  const rateAnnual = (parseFloat(rateAnnualStr) || 0) / 100;

  const activePenaltyPercent = useMemo(() => {
    if (loanAgeYear === 1) return parseFloat(penaltyYear1) || 0;
    if (loanAgeYear === 2) return parseFloat(penaltyYear2) || 0;
    if (loanAgeYear === 3) return parseFloat(penaltyYear3) || 0;
    return parseFloat(penaltyYear4Plus) || 0;
  }, [loanAgeYear, penaltyYear1, penaltyYear2, penaltyYear3, penaltyYear4Plus]);

  const penaltyFee = Math.round(prepayAmt * (activePenaltyPercent / 100));

  const monthlyPrincipal = balance / (remainingTenorMonths || 1);
  let totalRemainingInterestWithoutPrepay = 0;
  let curBal = balance;
  for (let m = 1; m <= remainingTenorMonths; m++) {
    totalRemainingInterestWithoutPrepay += Math.round(curBal * (rateAnnual / 12));
    curBal = Math.max(0, curBal - monthlyPrincipal);
  }

  const prepayRatio = balance > 0 ? Math.min(1, prepayAmt / balance) : 0;
  const totalInterestSaved = Math.round(totalRemainingInterestWithoutPrepay * prepayRatio);
  const netSavings = totalInterestSaved - penaltyFee;

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';

  return (
    <div className="space-y-5">

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
          <Award className="w-5 h-5 text-emerald-500" />
          <span>TÍNH PHÍ TRẢ NỢ TRƯỚC HẠN</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <DollarSign className="w-4 h-4" />
            <span>1. KHOẢN VAY & SỐ TIỀN TRẢ TRƯỚC HẠN</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Dư nợ gốc hiện tại (VND) *</label>
              <input
                type="text"
                value={balanceStr}
                onChange={e => {
                  const val = formatMoneyInput(e.target.value);
                  setBalanceStr(val);
                  setPrepayAmountStr(val);
                }}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tiền đăng ký trả trước hạn (VND) *</label>
              <input
                type="text"
                value={prepayAmountStr}
                onChange={e => setPrepayAmountStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất (%/năm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rateAnnualStr}
                  onChange={e => setRateAnnualStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Thời hạn còn lại (tháng)</label>
                <input
                  type="number"
                  min={1}
                  value={remainingTenorMonths}
                  onChange={e => setRemainingTenorMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Thời gian đã vay</label>
                <select
                  value={loanAgeYear}
                  onChange={e => setLoanAgeYear(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                >
                  <option value={1}>Năm thứ 1</option>
                  <option value={2}>Năm thứ 2</option>
                  <option value={3}>Năm thứ 3</option>
                  <option value={4}>Từ năm thứ 4+</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>2. KHUNG PHÍ PHẠT TRẢ NỢ TRƯỚC HẠN HỢP ĐỒNG (%)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Năm 1 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear1}
                onChange={e => setPenaltyYear1(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Năm 2 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear2}
                onChange={e => setPenaltyYear2(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Năm 3 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear3}
                onChange={e => setPenaltyYear3(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Từ năm 4+ (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear4Plus}
                onChange={e => setPenaltyYear4Plus(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Tỷ lệ phí phạt áp dụng (Năm thứ {loanAgeYear}):</span>
              <strong className="font-mono text-rose-600 dark:text-rose-400">{activePenaltyPercent}%</strong>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-rose-200 dark:border-rose-800/60">
              <span className="font-bold text-rose-800 dark:text-rose-300">👉 TIỀN PHẠT TRẢ TRƯỚC HẠN:</span>
              <strong className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">{fmtMoney(penaltyFee)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800/60 pb-3">
          <div>
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>BÀI TOÁN PHÂN TÍCH TIẾT KIỆM CHI PHÍ LÃI:</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              TIẾT KIỆM RÒNG: {fmtMoney(netSavings)}
            </div>
          </div>

          <div className="text-xs space-y-1 font-mono">
            <div className="text-slate-600 dark:text-slate-300">• Tổng lãi tiết kiệm được: <strong className="text-emerald-600 dark:text-emerald-400">{fmtMoney(totalInterestSaved)}</strong></div>
            <div className="text-slate-600 dark:text-slate-300">• Phí phạt trả trước hạn: <strong className="text-rose-600 dark:text-rose-400">-{fmtMoney(penaltyFee)}</strong></div>
          </div>
        </div>

        <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          💡 <strong>Kết luận tư vấn:</strong> Khách hàng nên trả nợ trước hạn ngay vì tổng tiền lãi tiết kiệm được trong {remainingTenorMonths} tháng tới ({fmtMoney(totalInterestSaved)}) vượt xa tiền phí phạt ({fmtMoney(penaltyFee)}), giúp khách hàng <strong>lời ròng {fmtMoney(netSavings)}</strong>!
        </div>
      </div>
    </div>
  );
};
