import React, { useState, useMemo } from 'react';
import { ShieldCheck, DollarSign, Building2, CheckCircle2 } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { pvAnnuityFactor, dtiMaxMonthlyPayment as calcDtiMaxMonthlyPayment } from '../../lib/calcMath';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';

interface Tool5Props {
  styles: UiClasses;
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

export const Tool5CreditCapacityCalc: React.FC<Tool5Props> = () => {
  const [monthlyIncomeStr, setMonthlyIncomeStr] = useState('35.000.000');
  const [livingExpenseStr, setLivingExpenseStr] = useState('10.000.000');
  const [existingDebtStr, setExistingDebtStr] = useState('0');
  const [maxDtiPercent, setMaxDtiPercent] = useState<number>(60);
  const [loanTenorMonths, setLoanTenorMonths] = useState<number>(120);
  const [interestRateAnnualStr, setInterestRateAnnualStr] = useState('10.5');

  const [assetValueStr, setAssetValueStr] = useState('3.500.000.000');
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('cat2');
  const [customLtvStr, setCustomLtvStr] = useState('70');

  const monthlyIncome = parseMoneyInput(monthlyIncomeStr);
  const livingExpense = parseMoneyInput(livingExpenseStr);
  const existingDebt = parseMoneyInput(existingDebtStr);
  const assetValue = parseMoneyInput(assetValueStr);
  const rateAnnual = (parseFloat(interestRateAnnualStr) || 0) / 100;
  const rateMonthly = rateAnnual / 12;

  const activeLtv = selectedAssetKey === 'custom'
    ? (parseFloat(customLtvStr) || 70) / 100
    : ASSET_LTV_MAP[selectedAssetKey]?.ltv || 0.70;

  const dtiMaxMonthlyPayment = useMemo(
    () => calcDtiMaxMonthlyPayment(monthlyIncome, livingExpense, existingDebt, maxDtiPercent),
    [monthlyIncome, livingExpense, existingDebt, maxDtiPercent]
  );

  const maxLoanAmountByDti = useMemo(() => {
    if (dtiMaxMonthlyPayment <= 0 || loanTenorMonths <= 0) return 0;
    return Math.round(dtiMaxMonthlyPayment * pvAnnuityFactor(rateMonthly, loanTenorMonths));
  }, [dtiMaxMonthlyPayment, loanTenorMonths, rateMonthly]);

  const maxLoanAmountByLtv = Math.round(assetValue * activeLtv);

  const finalRecommendedLimit = Math.min(maxLoanAmountByDti, maxLoanAmountByLtv);

  const cardBg = UI.containerCardBg;

  return (
    <div className="space-y-5">

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-accent flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <span>TÍNH HẠN MỨC VAY TỐI ĐA THEO THU NHẬP (DTI/DSR) & TÀI SẢN BẢO ĐẢM (LTV)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-accent uppercase tracking-wider flex items-center space-x-1.5 border-b border-line pb-2">
            <DollarSign className="w-4 h-4" />
            <span>1. NĂNG LỰC TÀI CHÍNH & THU NHẬP (DTI)</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Thu nhập thực tế hàng tháng (VND) *</label>
              <input
                type="text"
                value={monthlyIncomeStr}
                onChange={e => setMonthlyIncomeStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-pos bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Chi phí sinh hoạt gia đình hàng tháng (VND)</label>
              <input
                type="text"
                value={livingExpenseStr}
                onChange={e => setLivingExpenseStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Nghĩa vụ trả nợ khác hàng tháng (nếu có)</label>
              <input
                type="text"
                value={existingDebtStr}
                onChange={e => setExistingDebtStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono text-neg bg-transparent border-line"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Tỷ lệ DTI tối đa (%)</label>
                <select
                  value={maxDtiPercent}
                  onChange={e => setMaxDtiPercent(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
                >
                  <option value={50}>50% (An toàn)</option>
                  <option value={60}>60% (Chuẩn)</option>
                  <option value={70}>70% (Tối đa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Thời hạn dự kiến</label>
                <input
                  type="number"
                  min={1}
                  value={loanTenorMonths}
                  onChange={e => setLoanTenorMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Lãi suất (%/năm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRateAnnualStr}
                  onChange={e => setInterestRateAnnualStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-warn bg-transparent border-line"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent-soft  border border-accent/30  space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Khả năng trả nợ nợ gốc+lãi hàng tháng:</span>
              <strong className="font-mono text-accent">{fmtMoney(dtiMaxMonthlyPayment)} / tháng</strong>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-accent/30 ">
              <span className="font-bold text-accent ">👉 HẠN MỨC VAY TỐI ĐA THEO DTI:</span>
              <strong className="font-mono font-extrabold text-accent text-sm">{fmtMoney(maxLoanAmountByDti)}</strong>
            </div>
          </div>
        </div>

        <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3.5`}>
          <div className="font-bold text-xs text-warn uppercase tracking-wider flex items-center space-x-1.5 border-b border-line pb-2">
            <Building2 className="w-4 h-4" />
            <span>2. TÀI SẢN BẢO ĐẢM & TỶ LỆ LTV</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Giá trị định giá TSBĐ (VND) *</label>
              <input
                type="text"
                value={assetValueStr}
                onChange={e => setAssetValueStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-warn bg-transparent border-line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">Phân loại TSBĐ theo quy định</label>
              <select
                value={selectedAssetKey}
                onChange={e => setSelectedAssetKey(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-medium bg-transparent border-line"
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
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Nhập Tỷ lệ LTV tùy chỉnh (%)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={customLtvStr}
                  onChange={e => setCustomLtvStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-line"
                />
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-warn-soft  border border-warn/30  space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Tỷ lệ LTV áp dụng:</span>
              <strong className="font-mono text-warn">{(activeLtv * 100).toFixed(0)}% Giá trị TS</strong>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-warn/30 ">
              <span className="font-bold text-warn">👉 HẠN MỨC VAY TỐI ĐA THEO TSBĐ:</span>
              <strong className="font-mono font-extrabold text-warn text-sm">{fmtMoney(maxLoanAmountByLtv)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-pos-soft  border border-pos/30  space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-pos flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-pos uppercase tracking-wider">
                ĐỀ XUẤT HẠN MỨC CẤP TÍN DỤNG TỐI ĐA AN TOÀN (MIN DTI & LTV):
              </div>
              <div className="text-2xl font-extrabold text-pos font-mono mt-0.5">
                {fmtMoney(finalRecommendedLimit)}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-pos space-y-0.5">
            <div>• Theo DTI (Thu nhập): <strong className="font-mono">{fmtMoney(maxLoanAmountByDti)}</strong></div>
            <div>• Theo LTV (TSBĐ): <strong className="font-mono">{fmtMoney(maxLoanAmountByLtv)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
