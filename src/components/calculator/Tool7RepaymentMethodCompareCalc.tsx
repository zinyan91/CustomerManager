import React, { useState, useMemo } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { fmtMoney, formatMoneyInput } from '../../lib/utils';
import { emiMonthlyPayment } from '../../lib/calcMath';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool7Props {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool7RepaymentMethodCompareCalc: React.FC<Tool7Props> = ({ isLight }) => {
  const [loanAmountStr, setLoanAmountStr] = useState('1.000.000.000');
  const [tenorMonths, setTenorMonths] = useState<number>(60);
  const [interestRateAnnualStr, setInterestRateAnnualStr] = useState('10.5');

  const loanAmt = parseFloat(loanAmountStr.replace(/\D/g, '')) || 0;
  const rateAnnual = (parseFloat(interestRateAnnualStr) || 0) / 100;
  const rateMonthly = rateAnnual / 12;

  const option1Data = useMemo(() => {
    if (!loanAmt || !tenorMonths) return { month1Payment: 0, lastMonthPayment: 0, totalInterest: 0 };
    const monthlyPrincipal = loanAmt / tenorMonths;
    let totalInterest = 0;
    let month1Payment = 0;
    let lastMonthPayment = 0;

    let curBal = loanAmt;
    for (let m = 1; m <= tenorMonths; m++) {
      const interestM = Math.round(curBal * rateMonthly);
      const paymentM = monthlyPrincipal + interestM;
      if (m === 1) month1Payment = paymentM;
      if (m === tenorMonths) lastMonthPayment = paymentM;
      totalInterest += interestM;
      curBal = Math.max(0, curBal - monthlyPrincipal);
    }
    return { month1Payment, lastMonthPayment, totalInterest };
  }, [loanAmt, tenorMonths, rateMonthly]);

  const option2Data = useMemo(() => {
    if (!loanAmt || !tenorMonths || rateMonthly <= 0) return { fixedMonthlyPayment: 0, totalInterest: 0 };
    const fixedMonthlyPayment = emiMonthlyPayment(loanAmt, rateMonthly, tenorMonths);
    const totalPayment = fixedMonthlyPayment * tenorMonths;
    const totalInterest = Math.max(0, totalPayment - loanAmt);

    return { fixedMonthlyPayment, totalInterest };
  }, [loanAmt, tenorMonths, rateMonthly]);

  const interestDifference = option2Data.totalInterest - option1Data.totalInterest;

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';

  return (
    <div className="space-y-5">

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-purple-500" />
          <span>SO SÁNH 2 PHƯƠNG THỨC TRẢ NỢ: GỐC ĐỀU VS NIÊN KIM (EMI/LÃI CỐ ĐỊNH)</span>
        </h2>
      </div>

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tiền vay (VND) *</label>
            <input
              type="text"
              value={loanAmountStr}
              onChange={e => setLoanAmountStr(formatMoneyInput(e.target.value))}
              className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-transparent border-slate-200 dark:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Thời hạn vay (tháng) *</label>
            <input
              type="number"
              min={1}
              value={tenorMonths}
              onChange={e => setTenorMonths(parseInt(e.target.value, 10) || 12)}
              className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất vay (%/năm) *</label>
            <input
              type="number"
              step="0.1"
              value={interestRateAnnualStr}
              onChange={e => setInterestRateAnnualStr(e.target.value)}
              className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 bg-transparent border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} rounded-2xl p-4 border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-3`}>
          <div className="flex items-center justify-between border-b border-sky-100 dark:border-sky-900/40 pb-2">
            <span className="font-bold text-xs uppercase text-sky-600 dark:text-sky-400">
              PHƯƠNG ÁN 1: GỐC TRẢ ĐỀU (LÃI GIẢM DẦN)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-600 border border-sky-200">
              Tiết kiệm lãi hơn
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Trả tháng đầu tiên (Cao nhất):</span>
              <strong className="font-mono text-sky-600 dark:text-sky-400">{fmtMoney(option1Data.month1Payment)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trả tháng cuối cùng (Thấp nhất):</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">{fmtMoney(option1Data.lastMonthPayment)}</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">TỔNG TỔNG TIỀN LÃI PHẢI TRẢ:</span>
              <strong className="font-mono text-base font-extrabold text-sky-600 dark:text-sky-400">{fmtMoney(option1Data.totalInterest)}</strong>
            </div>
          </div>
        </div>

        <div className={`${cardBg} rounded-2xl p-4 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-3`}>
          <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-2">
            <span className="font-bold text-xs uppercase text-purple-600 dark:text-purple-400">
              PHƯƠNG ÁN 2: NIÊN KIM EMI (CỐ ĐỊNH HÀNG THÁNG)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200">
              Dòng tiền ổn định
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền cố định trả hàng tháng:</span>
              <strong className="font-mono text-purple-600 dark:text-purple-400 text-sm">{fmtMoney(option2Data.fixedMonthlyPayment)} / tháng</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số kỳ thanh toán:</span>
              <strong className="font-mono">{tenorMonths} tháng</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">TỔNG TỔNG TIỀN LÃI PHẢI TRẢ:</span>
              <strong className="font-mono text-base font-extrabold text-purple-600 dark:text-purple-400">{fmtMoney(option2Data.totalInterest)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1 text-xs">
        <div className="flex items-center space-x-1.5 font-bold text-sky-800 dark:text-sky-300">
          <CheckCircle2 className="w-4 h-4 text-sky-500" />
          <span>SO SÁNH TỔNG QUAN DÀNH CHO TƯ VẤN:</span>
        </div>
        <div>
          • Phương án **Gốc trả đều** giúp khách hàng tiết kiệm hơn <strong className="font-mono text-emerald-600 dark:text-emerald-400">{fmtMoney(interestDifference)}</strong> tiền lãi so với Phương án Niên kim EMI.
        </div>
      </div>
    </div>
  );
};
