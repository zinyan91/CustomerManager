import React, { useState } from 'react';
import { RefreshCw, Percent } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { effectiveAnnualRate, flatToReducingApprox } from '../../lib/calcMath';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';

interface Tool8Props {
  styles: UiClasses;
}

export const Tool8InterestRateConversionCalc: React.FC<Tool8Props> = () => {
  const [flatRateMonthlyStr, setFlatRateMonthlyStr] = useState('0.8');
  const [flatTenorMonths, setFlatTenorMonths] = useState<number>(24);
  const [sampleLoanAmtStr, setSampleLoanAmtStr] = useState('100.000.000');

  const [nominalRateAnnualStr, setNominalRateAnnualStr] = useState('10.0');
  const [compoundingFreq, setCompoundingFreq] = useState<number>(12);

  const flatRateMonthly = (parseFloat(flatRateMonthlyStr) || 0) / 100;
  const sampleLoanAmt = parseMoneyInput(sampleLoanAmtStr) || 100000000;

  const flatMonthlyInterest = sampleLoanAmt * flatRateMonthly;
  const flatMonthlyPrincipal = sampleLoanAmt / (flatTenorMonths || 1);
  const flatTotalMonthlyPayment = flatMonthlyPrincipal + flatMonthlyInterest;
  const flatTotalInterest = flatMonthlyInterest * flatTenorMonths;

  const flatRateAnnual = flatRateMonthly * 12;
  const approxReducingRateAnnual = flatToReducingApprox(flatRateAnnual, flatTenorMonths);

  const nominalRateAnnual = (parseFloat(nominalRateAnnualStr) || 0) / 100;
  const earRateAnnual = effectiveAnnualRate(nominalRateAnnual, compoundingFreq);

  const cardBg = UI.containerCardBg;

  return (
    <div className="space-y-5">

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-accent flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-pos" />
          <span>QUY ĐỔI LÃI SUẤT PHẲNG ↔ LÃI SUẤT DƯ NỢ GIẢM DẦN & LÃI SUẤT HIỆU LỰC (EAR/APR)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-accent uppercase tracking-wider flex items-center space-x-1.5 border-b border-line pb-2">
            <Percent className="w-4 h-4" />
            <span>1. LÃI PHẲNG (FLAT) → DƯ NỢ GIẢM DẦN</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Lãi suất phẳng (%/tháng) *</label>
              <input
                type="number"
                step="0.01"
                value={flatRateMonthlyStr}
                onChange={e => setFlatRateMonthlyStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-accent bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Thời hạn khoản vay (tháng) *</label>
              <input
                type="number"
                min={1}
                value={flatTenorMonths}
                onChange={e => setFlatTenorMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Số tiền vay ví dụ (VND)</label>
              <input
                type="text"
                value={sampleLoanAmtStr}
                onChange={e => setSampleLoanAmtStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-pos-soft  border border-pos/30  space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">Lãi phẳng {flatRateMonthlyStr}%/tháng tương đương:</span>
              <strong className="font-mono text-xl font-extrabold text-pos">
                {(approxReducingRateAnnual * 100).toFixed(2)} %/năm
              </strong>
            </div>
            <div className="text-[11px] text-pos pt-2 border-t border-pos/30  space-y-0.5">
              <div>• Tiền gốc + lãi trả đều hàng tháng: <strong>{fmtMoney(flatTotalMonthlyPayment)}</strong> / tháng</div>
              <div>• Tổng tiền lãi phẳng cả kỳ: <strong>{fmtMoney(flatTotalInterest)}</strong></div>
            </div>
          </div>
        </div>

        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-accent uppercase tracking-wider flex items-center space-x-1.5 border-b border-line pb-2">
            <RefreshCw className="w-4 h-4" />
            <span>2. LS DANH NGHĨA → LS HIỆU LỰC (EAR / APR)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Lãi suất danh nghĩa (%/năm) *</label>
              <input
                type="number"
                step="0.1"
                value={nominalRateAnnualStr}
                onChange={e => setNominalRateAnnualStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-accent bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Tần suất ghép lãi (Compounding Frequency)</label>
              <select
                value={compoundingFreq}
                onChange={e => setCompoundingFreq(parseInt(e.target.value, 10))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
              >
                <option value={12}>Hàng tháng (12 lần/năm)</option>
                <option value={4}>Hàng quý (4 lần/năm)</option>
                <option value={2}>Bán niên (2 lần/năm)</option>
                <option value={365}>Hàng ngày (365 lần/năm)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-accent-soft  border border-accent/30  space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">Lãi suất hiệu lực thực tế (EAR):</span>
              <strong className="font-mono text-xl font-extrabold text-accent">
                {(earRateAnnual * 100).toFixed(2)} %/năm
              </strong>
            </div>
            <div className="text-[11px] text-accent  pt-2 border-t border-accent/30 ">
              💡 Do ghép lãi {compoundingFreq} lần/năm, chi phí vốn thực tế khách hàng gánh chịu là <strong>{(earRateAnnual * 100).toFixed(2)}%/năm</strong> thay vì <strong>{nominalRateAnnualStr}%/năm</strong> danh nghĩa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
