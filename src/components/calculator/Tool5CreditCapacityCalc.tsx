import React, { useState, useMemo } from 'react';
import { ShieldCheck, DollarSign, Building2, CheckCircle2 } from 'lucide-react';
import { fmtMoney, formatMoneyInput } from '../../lib/utils';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool5Props {
  styles: ThemeStyles;
  isLight: boolean;
}

const ASSET_LTV_MAP: Record<string, { label: string; ltv: number }> = {
  cat1: { label: 'Bất động sản Loại 1 (Vị trí đẹp, mặt tiền hẻm rộng)', ltv: 0.80 },
  cat2: { label: 'Bất động sản Loại 2 (Hẻm nhỏ, ô tô vào được)', ltv: 0.70 },
  cat3: { label: 'Bất động sản Loại 3 (Hẻm xe máy, ngõ sâu)', ltv: 0.60 },
  cat4: { label: 'Bất động sản Loại 4 (Hạn chế giao dịch/ngoại thành)', ltv: 0.55 },
  vehicle: { label: 'Phương tiện vận tải / Ô tô / Xe cơ giới', ltv: 0.65 },
  stk: { label: 'Giấy tờ có giá / Sổ tiết kiệm / Trái phiếu ngân hàng', ltv: 0.95 },
  other: { label: 'Tài sản bảo đảm khác', ltv: 0.50 },
};

export const Tool5CreditCapacityCalc: React.FC<Tool5Props> = ({ isLight }) => {
  // DTI / Income Inputs
  const [monthlyIncomeStr, setMonthlyIncomeStr] = useState('35.000.000');
  const [livingExpenseStr, setLivingExpenseStr] = useState('10.000.000');
  const [existingDebtStr, setExistingDebtStr] = useState('0');
  const [maxDtiPercent, setMaxDtiPercent] = useState<number>(60); // 60%
  const [loanTenorMonths, setLoanTenorMonths] = useState<number>(120); // 10 năm
  const [interestRateAnnualStr, setInterestRateAnnualStr] = useState('10.5');

  // LTV / Collateral Inputs
  const [assetValueStr, setAssetValueStr] = useState('3.500.000.000');
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('cat2');
  const [customLtvStr, setCustomLtvStr] = useState('70');

  // Parse Inputs
  const monthlyIncome = parseFloat(monthlyIncomeStr.replace(/\D/g, '')) || 0;
  const livingExpense = parseFloat(livingExpenseStr.replace(/\D/g, '')) || 0;
  const existingDebt = parseFloat(existingDebtStr.replace(/\D/g, '')) || 0;
  const assetValue = parseFloat(assetValueStr.replace(/\D/g, '')) || 0;
  const rateAnnual = (parseFloat(interestRateAnnualStr) || 0) / 100;
  const rateMonthly = rateAnnual / 12;

  const activeLtv = selectedAssetKey === 'custom'
    ? (parseFloat(customLtvStr) || 70) / 100
    : ASSET_LTV_MAP[selectedAssetKey]?.ltv || 0.70;

  // 1. Calculate DTI Capacity
  const dtiMaxMonthlyPayment = useMemo(() => {
    const netDisposable = Math.max(0, monthlyIncome - livingExpense - existingDebt);
    const dtiLimit = Math.max(0, (monthlyIncome * (maxDtiPercent / 100)) - existingDebt);
    return Math.min(netDisposable, dtiLimit);
  }, [monthlyIncome, livingExpense, existingDebt, maxDtiPercent]);

  const maxLoanAmountByDti = useMemo(() => {
    if (dtiMaxMonthlyPayment <= 0 || loanTenorMonths <= 0) return 0;
    if (rateMonthly <= 0) {
      return dtiMaxMonthlyPayment * loanTenorMonths;
    }
    // Present Value formula for Equal Monthly Installment (EMI)
    // PV = PMT * [1 - (1+r)^(-n)] / r
    const pvFactor = (1 - Math.pow(1 + rateMonthly, -loanTenorMonths)) / rateMonthly;
    return Math.round(dtiMaxMonthlyPayment * pvFactor);
  }, [dtiMaxMonthlyPayment, loanTenorMonths, rateMonthly]);

  // 2. Calculate LTV Capacity
  const maxLoanAmountByLtv = Math.round(assetValue * activeLtv);

  // 3. Final Combined Recommendation
  const finalRecommendedLimit = Math.min(maxLoanAmountByDti, maxLoanAmountByLtv);

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-sky-500" />
          <span>TÍNH HẠN MỨC VAY TỐI ĐA THEO THU NHẬP (DTI/DSR) & TÀI SẢN BẢO ĐẢM (LTV)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Thẩm định nhanh khả năng trả nợ và xác định hạn mức cấp tín dụng tối đa an toàn cho khách hàng
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL 1: THẨM ĐỊNH NĂNG LỰC TÀI CHÍNH / THU NHẬP (DTI) */}
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <DollarSign className="w-4 h-4" />
            <span>1. NĂNG LỰC TÀI CHÍNH & THU NHẬP (DTI)</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Thu nhập thực tế hàng tháng (VND) *</label>
              <input
                type="text"
                value={monthlyIncomeStr}
                onChange={e => setMonthlyIncomeStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Chi phí sinh hoạt gia đình hàng tháng (VND)</label>
              <input
                type="text"
                value={livingExpenseStr}
                onChange={e => setLivingExpenseStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Nghĩa vụ trả nợ khác hàng tháng (nếu có)</label>
              <input
                type="text"
                value={existingDebtStr}
                onChange={e => setExistingDebtStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono text-rose-500 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tỷ lệ DTI tối đa (%)</label>
                <select
                  value={maxDtiPercent}
                  onChange={e => setMaxDtiPercent(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                >
                  <option value={50}>50% (An toàn)</option>
                  <option value={60}>60% (Chuẩn)</option>
                  <option value={70}>70% (Tối đa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Thời hạn dự kiến</label>
                <input
                  type="number"
                  min={1}
                  value={loanTenorMonths}
                  onChange={e => setLoanTenorMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất (%/năm)</label>
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

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Khả năng trả nợ nợ gốc+lãi hàng tháng:</span>
              <strong className="font-mono text-sky-600 dark:text-sky-400">{fmtMoney(dtiMaxMonthlyPayment)} / tháng</strong>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-sky-200 dark:border-sky-800/60">
              <span className="font-bold text-sky-800 dark:text-sky-300">👉 HẠN MỨC VAY TỐI ĐA THEO DTI:</span>
              <strong className="font-mono font-extrabold text-sky-600 dark:text-sky-400 text-sm">{fmtMoney(maxLoanAmountByDti)}</strong>
            </div>
          </div>
        </div>

        {/* PANEL 2: ĐỊNH GIÁ & HẠN MỨC THEO TSBĐ (LTV) */}
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Building2 className="w-4 h-4" />
            <span>2. TÀI SẢN BẢO ĐẢM & TỶ LỆ LTV</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Giá trị định giá TSBĐ (VND) *</label>
              <input
                type="text"
                value={assetValueStr}
                onChange={e => setAssetValueStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Phân loại TSBĐ theo quy định</label>
              <select
                value={selectedAssetKey}
                onChange={e => setSelectedAssetKey(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-medium bg-transparent border-slate-200 dark:border-slate-800"
              >
                {Object.entries(ASSET_LTV_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label} (LTV: {(v.ltv * 100).toFixed(0)}%)
                  </option>
                ))}
                <option value="custom">Tùy chỉnh tỷ lệ LTV khác...</option>
              </select>
            </div>

            {selectedAssetKey === 'custom' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nhập Tỷ lệ LTV tùy chỉnh (%)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={customLtvStr}
                  onChange={e => setCustomLtvStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Tỷ lệ LTV áp dụng:</span>
              <strong className="font-mono text-amber-600 dark:text-amber-400">{(activeLtv * 100).toFixed(0)}% Giá trị TS</strong>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-amber-200 dark:border-amber-800/60">
              <span className="font-bold text-amber-800 dark:text-amber-300">👉 HẠN MỨC VAY TỐI ĐA THEO TSBĐ:</span>
              <strong className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-sm">{fmtMoney(maxLoanAmountByLtv)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL RECOMMENDATION RESULT CARD */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                ĐỀ XUẤT HẠN MỨC CẤP TÍN DỤNG TỐI ĐA AN TOÀN (MIN DTI & LTV):
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {fmtMoney(finalRecommendedLimit)}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
            <div>• Theo DTI (Thu nhập): <strong className="font-mono">{fmtMoney(maxLoanAmountByDti)}</strong></div>
            <div>• Theo LTV (TSBĐ): <strong className="font-mono">{fmtMoney(maxLoanAmountByLtv)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
