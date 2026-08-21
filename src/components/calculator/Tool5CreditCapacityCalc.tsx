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

  const customLtv = parseFloat(customLtvStr);
  const activeLtv = selectedAssetKey === 'custom'
    ? (Number.isNaN(customLtv) ? 70 : customLtv) / 100
    : ASSET_LTV_MAP[selectedAssetKey]?.ltv ?? 0.70;

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
    <div className="space-y-4 font-app">
      {/* Title Header Card */}
      <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150`}>
        <div className="text-xs font-bold tracking-tight text-accent flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-xs">
            TÍNH HẠN MỨC VAY TỐI ĐA THEO THU NHẬP (DTI/DSR) & TÀI SẢN BẢO ĐẢM (LTV)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột 1: DTI & Thu nhập */}
        <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-accent tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="uppercase tracking-wider text-[11px]">1. NĂNG LỰC TÀI CHÍNH & THU NHẬP (DTI)</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Thu nhập thực tế hàng tháng (VND) *
              </label>
              <input
                type="text"
                value={monthlyIncomeStr}
                onChange={e => setMonthlyIncomeStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-pos bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Chi phí sinh hoạt gia đình hàng tháng (VND)
              </label>
              <input
                type="text"
                value={livingExpenseStr}
                onChange={e => setLivingExpenseStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Nghĩa vụ trả nợ khác hàng tháng (nếu có)
              </label>
              <input
                type="text"
                value={existingDebtStr}
                onChange={e => setExistingDebtStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono text-neg bg-surface/80 focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Tỷ lệ DTI tối đa (%)</label>
                <select
                  value={maxDtiPercent}
                  onChange={e => setMaxDtiPercent(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
                >
                  <option value={50}>50% (An toàn)</option>
                  <option value={60}>60% (Chuẩn)</option>
                  <option value={70}>70% (Tối đa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Thời hạn dự kiến</label>
                <input
                  type="number"
                  min={1}
                  value={loanTenorMonths}
                  onChange={e => setLoanTenorMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Lãi suất (%/năm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRateAnnualStr}
                  onChange={e => setInterestRateAnnualStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-warn bg-surface/80 focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-accent-soft/25 border border-accent/30 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted text-[11px]">Khả năng trả nợ gốc+lãi hàng tháng:</span>
              <strong className="font-mono text-accent font-bold">{fmtMoney(dtiMaxMonthlyPayment)} / tháng</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-accent/25">
              <span className="font-bold text-accent text-[11px] uppercase tracking-wider">HẠN MỨC VAY TỐI ĐA THEO DTI:</span>
              <strong className="font-mono font-extrabold text-accent text-sm">{fmtMoney(maxLoanAmountByDti)}</strong>
            </div>
          </div>
        </div>

        {/* Cột 2: TSBĐ & LTV */}
        <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-warn tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
            <div className="p-1.5 rounded-lg bg-warn-soft text-warn shrink-0 shadow-2xs">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="uppercase tracking-wider text-[11px]">2. TÀI SẢN BẢO ĐẢM & TỶ LỆ LTV</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Giá trị định giá TSBĐ (VND) *
              </label>
              <input
                type="text"
                value={assetValueStr}
                onChange={e => setAssetValueStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-warn bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Phân loại TSBĐ theo quy định
              </label>
              <select
                value={selectedAssetKey}
                onChange={e => setSelectedAssetKey(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-medium bg-surface/80 focus:border-accent"
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
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Nhập Tỷ lệ LTV tùy chỉnh (%)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={customLtvStr}
                  onChange={e => setCustomLtvStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
                />
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-warn-soft/25 border border-warn/30 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted text-[11px]">Tỷ lệ LTV áp dụng:</span>
              <strong className="font-mono text-warn font-bold">{(activeLtv * 100).toFixed(0)}% Giá trị TS</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-warn/25">
              <span className="font-bold text-warn text-[11px] uppercase tracking-wider">HẠN MỨC VAY TỐI ĐA THEO TSBĐ:</span>
              <strong className="font-mono font-extrabold text-warn text-sm">{fmtMoney(maxLoanAmountByLtv)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Final Recommendation Banner */}
      <div className="p-5 rounded-2xl bg-pos-soft/30 border border-pos/35 specular-card shadow-xs space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-pos-soft text-pos shrink-0 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-pos tracking-tight uppercase">
                ĐỀ XUẤT HẠN MỨC CẤP TÍN DỤNG TỐI ĐA AN TOÀN (MIN DTI & LTV):
              </div>
              <div className="text-2xl sm:text-3xl font-black text-pos font-mono mt-0.5 tracking-tight">
                {fmtMoney(finalRecommendedLimit)}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-ink-muted space-y-1">
            <div>• Theo DTI (Thu nhập): <strong className="font-mono text-ink">{fmtMoney(maxLoanAmountByDti)}</strong></div>
            <div>• Theo LTV (TSBĐ): <strong className="font-mono text-ink">{fmtMoney(maxLoanAmountByLtv)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
