import React, { useState } from 'react';
import { RefreshCw, Percent } from 'lucide-react';
import { fmtMoney, formatMoneyInput } from '../../lib/utils';
import { effectiveAnnualRate, flatToReducingApprox } from '../../lib/calcMath';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool8Props {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool8InterestRateConversionCalc: React.FC<Tool8Props> = ({ isLight }) => {
  // Flat rate inputs
  const [flatRateMonthlyStr, setFlatRateMonthlyStr] = useState('0.8'); // 0.8%/tháng
  const [flatTenorMonths, setFlatTenorMonths] = useState<number>(24); // 24 tháng
  const [sampleLoanAmtStr, setSampleLoanAmtStr] = useState('100.000.000');

  // Nominal to Effective inputs
  const [nominalRateAnnualStr, setNominalRateAnnualStr] = useState('10.0');
  const [compoundingFreq, setCompoundingFreq] = useState<number>(12); // Hàng tháng (12 lần/năm)

  // Calculations:
  // 1. Flat Rate to Effective Reducing Balance Rate (IRR / PMT estimation)
  const flatRateMonthly = (parseFloat(flatRateMonthlyStr) || 0) / 100;
  const sampleLoanAmt = parseFloat(sampleLoanAmtStr.replace(/\D/g, '')) || 100000000;

  // Monthly interest under Flat Rate = LoanAmt * FlatRateMonthly
  const flatMonthlyInterest = sampleLoanAmt * flatRateMonthly;
  const flatMonthlyPrincipal = sampleLoanAmt / (flatTenorMonths || 1);
  const flatTotalMonthlyPayment = flatMonthlyPrincipal + flatMonthlyInterest;
  const flatTotalInterest = flatMonthlyInterest * flatTenorMonths;

  // Find effective monthly interest rate r where PMT(r, n, PV=LoanAmt) = flatTotalMonthlyPayment
  // Approximate reducing rate %/năm:
  // Reducing Annual Rate ≈ (Flat Annual Rate * 2 * n) / (n + 1)
  const flatRateAnnual = flatRateMonthly * 12;
  const approxReducingRateAnnual = flatToReducingApprox(flatRateAnnual, flatTenorMonths);

  // 2. Nominal to EAR (Effective Annual Rate)
  const nominalRateAnnual = (parseFloat(nominalRateAnnualStr) || 0) / 100;
  const earRateAnnual = effectiveAnnualRate(nominalRateAnnual, compoundingFreq);

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-emerald-500" />
          <span>QUY ĐỔI LÃI SUẤT PHẲNG ↔ LÃI SUẤT DƯ NỢ GIẢM DẦN & LÃI SUẤT HIỆU LỰC (EAR/APR)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL 1: QUY ĐỔI LÃI SUẤT PHẲNG -> LÃI SUẤT DƯ NỢ GIẢM DẦN */}
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Percent className="w-4 h-4" />
            <span>1. LÃI PHẲNG (FLAT) → DƯ NỢ GIẢM DẦN</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất phẳng (%/tháng) *</label>
              <input
                type="number"
                step="0.01"
                value={flatRateMonthlyStr}
                onChange={e => setFlatRateMonthlyStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Thời hạn khoản vay (tháng) *</label>
              <input
                type="number"
                min={1}
                value={flatTenorMonths}
                onChange={e => setFlatTenorMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tiền vay ví dụ (VND)</label>
              <input
                type="text"
                value={sampleLoanAmtStr}
                onChange={e => setSampleLoanAmtStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Lãi phẳng {flatRateMonthlyStr}%/tháng tương đương:</span>
              <strong className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {(approxReducingRateAnnual * 100).toFixed(2)} %/năm
              </strong>
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 space-y-0.5">
              <div>• Tiền gốc + lãi trả đều hàng tháng: <strong>{fmtMoney(flatTotalMonthlyPayment)}</strong> / tháng</div>
              <div>• Tổng tiền lãi phẳng cả kỳ: <strong>{fmtMoney(flatTotalInterest)}</strong></div>
            </div>
          </div>
        </div>

        {/* PANEL 2: QUY ĐỔI LÃI SUẤT DANH NGHĨA -> LÃI SUẤT HIỆU LỰC (EAR / APR) */}
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <RefreshCw className="w-4 h-4" />
            <span>2. LS DANH NGHĨA → LS HIỆU LỰC (EAR / APR)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất danh nghĩa (%/năm) *</label>
              <input
                type="number"
                step="0.1"
                value={nominalRateAnnualStr}
                onChange={e => setNominalRateAnnualStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Tần suất ghép lãi (Compounding Frequency)</label>
              <select
                value={compoundingFreq}
                onChange={e => setCompoundingFreq(parseInt(e.target.value, 10))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
              >
                <option value={12}>Hàng tháng (12 lần/năm)</option>
                <option value={4}>Hàng quý (4 lần/năm)</option>
                <option value={2}>Bán niên (2 lần/năm)</option>
                <option value={365}>Hàng ngày (365 lần/năm)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Lãi suất hiệu lực thực tế (EAR):</span>
              <strong className="font-mono text-xl font-extrabold text-purple-600 dark:text-purple-400">
                {(earRateAnnual * 100).toFixed(2)} %/năm
              </strong>
            </div>
            <div className="text-[11px] text-purple-800 dark:text-purple-300 pt-2 border-t border-purple-200 dark:border-purple-800/60">
              💡 Do ghép lãi {compoundingFreq} lần/năm, chi phí vốn thực tế khách hàng gánh chịu là <strong>{(earRateAnnual * 100).toFixed(2)}%/năm</strong> thay vì <strong>{nominalRateAnnualStr}%/năm</strong> danh nghĩa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
