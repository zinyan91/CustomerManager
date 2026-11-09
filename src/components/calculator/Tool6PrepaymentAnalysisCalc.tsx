import React, { useState, useMemo } from 'react';
import { ShieldAlert, DollarSign, Award, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';
import {
  calcPrepaymentAnalysis,
  DEFAULT_PREPAYMENT_PENALTY_BY_YEAR,
  PREPAYMENT_FEE_YEARS,
  PREPAYMENT_REPAY_METHOD_LABELS,
  type PrepaymentRepayMethod,
  type PrepaymentFeeScheduleType,
} from '../../lib/prepaymentAnalysis';

const LOAN_YEAR_OPTIONS = [
  ...Array.from({ length: PREPAYMENT_FEE_YEARS }, (_, i) => ({ val: i + 1, label: `Năm ${i + 1}` })),
  { val: PREPAYMENT_FEE_YEARS + 1, label: `Từ năm ${PREPAYMENT_FEE_YEARS + 1}` },
];

interface Tool6Props {
  styles?: UiClasses;
}

export const Tool6PrepaymentAnalysisCalc: React.FC<Tool6Props> = ({ styles = UI }) => {
  const [balanceStr, setBalanceStr] = useState('800.000.000');
  const [prepayAmountStr, setPrepayAmountStr] = useState('800.000.000');
  const [rateAnnualStr, setRateAnnualStr] = useState('11.5');
  const [remainingTenorMonths, setRemainingTenorMonths] = useState<number>(60);
  const [repayMethod, setRepayMethod] = useState<PrepaymentRepayMethod>('equal_principal');

  const [feeScheduleType, setFeeScheduleType] = useState<PrepaymentFeeScheduleType>('by_year');
  const [loanAgeYear, setLoanAgeYear] = useState<number>(2);
  const [customPenaltyPercentStr, setCustomPenaltyPercentStr] = useState<string>('1.5');
  const [minPenaltyFeeStr, setMinPenaltyFeeStr] = useState<string>('0');

  const [penaltyByYearStr, setPenaltyByYearStr] = useState<string[]>(
    () => DEFAULT_PREPAYMENT_PENALTY_BY_YEAR.map(rate => String(rate)),
  );
  const setPenaltyForYear = (index: number, value: string) =>
    setPenaltyByYearStr(prev => prev.map((rate, i) => (i === index ? value : rate)));

  const balance = parseMoneyInput(balanceStr);
  const prepayAmt = parseMoneyInput(prepayAmountStr);

  const result = useMemo(() => {
    return calcPrepaymentAnalysis({
      currentBalance: balance,
      prepayAmount: prepayAmt,
      rateAnnual: (parseFloat(rateAnnualStr) || 0) / 100,
      remainingTenorMonths: Math.max(1, remainingTenorMonths || 1),
      repayMethod,
      feeScheduleType,
      loanAgeYear,
      customPenaltyPercent: parseFloat(customPenaltyPercentStr) || 0,
      minPenaltyFee: parseMoneyInput(minPenaltyFeeStr),
      penaltyByYear: penaltyByYearStr.map(rate => parseFloat(rate) || 0),
    });
  }, [
    balance,
    prepayAmt,
    rateAnnualStr,
    remainingTenorMonths,
    repayMethod,
    feeScheduleType,
    loanAgeYear,
    customPenaltyPercentStr,
    minPenaltyFeeStr,
    penaltyByYearStr,
  ]);

  const handleFullPrepay = () => {
    setPrepayAmountStr(balanceStr);
  };

  const cardBg = styles.containerCardBg || UI.containerCardBg;
  const labelCls = 'block text-[11px] font-semibold text-ink-muted mb-1';
  const inputCls = 'w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent';

  return (
    <div className="space-y-4 font-app">
      {/* Title Header Card */}
      <div data-workspace-panel className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 shadow-xs specular-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150`}>
        <div className="text-xs font-bold tracking-tight text-accent flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <Award className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-xs">
            TÍNH PHÍ TRẢ NỢ TRƯỚC HẠN & TỐI ƯU CHI PHÍ LÃI
          </span>
        </div>

        <button
          type="button"
          onClick={handleFullPrepay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-ink hover:opacity-90 font-bold shadow-xs text-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tất toán 100%</span>
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Tổng tiền nộp đợt này */}
        <div data-workspace-panel className="p-4 rounded-2xl border border-line/70 bg-surface/90 shadow-xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>TỔNG TIỀN NỘP ĐỢT NÀY</span>
            <DollarSign className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="text-xl font-extrabold font-mono text-accent">
            {fmtMoney(result.totalPaymentRequired)}
          </div>
          <div className="text-[10px] text-ink-muted">
            Gốc: <strong className="font-mono text-ink">{fmtMoney(result.actualPrepayAmount)}</strong> + Phí: <strong className="font-mono text-neg">{fmtMoney(result.penaltyFee)}</strong>
          </div>
        </div>

        {/* KPI 2: Phí phạt trả trước */}
        <div data-workspace-panel className="p-4 rounded-2xl border border-neg/30 bg-neg-soft/20 shadow-xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neg flex items-center justify-between">
            <span>PHÍ PHẠT TRẢ TRƯỚC</span>
            <ShieldAlert className="w-3.5 h-3.5 text-neg" />
          </div>
          <div className="text-xl font-extrabold font-mono text-neg">
            {fmtMoney(result.penaltyFee)}
          </div>
          <div className="text-[10px] text-ink-muted">
            Tỷ lệ áp dụng: <strong className="font-mono text-neg">{result.activePenaltyPercent}%</strong>
          </div>
        </div>

        {/* KPI 3: Tiền lãi tiết kiệm được */}
        <div data-workspace-panel className="p-4 rounded-2xl border border-pos/30 bg-pos-soft/20 shadow-xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-pos flex items-center justify-between">
            <span>TỔNG LÃI TIẾT KIỆM</span>
            <TrendingUp className="w-3.5 h-3.5 text-pos" />
          </div>
          <div className="text-xl font-extrabold font-mono text-pos">
            {fmtMoney(result.totalInterestSaved)}
          </div>
          <div className="text-[10px] text-ink-muted">
            Trong {remainingTenorMonths} tháng còn lại
          </div>
        </div>

        {/* KPI 4: Lợi ích ròng */}
        <div data-workspace-panel className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
          result.netSavings >= 0 ? 'border-pos/40 bg-pos-soft/30' : 'border-neg/40 bg-neg-soft/30'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
            result.netSavings >= 0 ? 'text-pos' : 'text-neg'
          }`}>
            <span>LỢI ÍCH RÒNG</span>
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div className={`text-xl font-extrabold font-mono ${
            result.netSavings >= 0 ? 'text-pos' : 'text-neg'
          }`}>
            {result.netSavings >= 0 ? '+' : ''}{fmtMoney(result.netSavings)}
          </div>
          <div className="text-[10px] text-ink-muted">
            {result.netSavings >= 0 ? 'Tiết kiệm chi phí' : 'Phí phạt lớn hơn lãi'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cột 1: Thông tin Khoản vay & Số tiền trả trước */}
        <div data-workspace-panel className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-accent tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="uppercase tracking-wider text-[11px]">THÔNG TIN DƯ NỢ & TRẢ TRƯỚC HẠN</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Dư nợ gốc hiện tại (VNĐ) *</label>
              <input
                type="text"
                value={balanceStr}
                onChange={e => setBalanceStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} text-accent`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-ink-muted">Số tiền đăng ký trả trước hạn (VNĐ) *</label>
                <button
                  type="button"
                  onClick={handleFullPrepay}
                  className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                >
                  Tất toán hết
                </button>
              </div>
              <input
                type="text"
                value={prepayAmountStr}
                onChange={e => setPrepayAmountStr(formatMoneyInput(e.target.value))}
                className={`${inputCls} text-pos`}
              />
            </div>

            <div>
              <label className={labelCls}>Phương thức trả nợ hợp đồng</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {(Object.keys(PREPAYMENT_REPAY_METHOD_LABELS) as PrepaymentRepayMethod[]).map(method => {
                  const isSel = repayMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRepayMethod(method)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                        isSel
                          ? 'bg-accent text-accent-ink shadow-2xs ring-1 ring-accent'
                          : 'bg-surface border border-line text-ink-muted hover:text-ink hover:bg-panel'
                      }`}
                    >
                      {method === 'equal_principal' && 'Gốc đều'}
                      {method === 'equal_installment' && 'Niên kim'}
                      {method === 'bullet' && 'Gốc cuối kỳ'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Lãi suất vay (%/năm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={rateAnnualStr}
                  onChange={e => setRateAnnualStr(e.target.value)}
                  className={`${inputCls} text-warn`}
                />
              </div>

              <div>
                <label className={labelCls}>Thời gian vay còn lại (tháng)</label>
                <input
                  type="number"
                  min={1}
                  value={remainingTenorMonths}
                  onChange={e => setRemainingTenorMonths(parseInt(e.target.value, 10) || 1)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Khung phí phạt trả trước hạn */}
        <div data-workspace-panel className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-neg tracking-tight flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-neg-soft text-neg shrink-0 shadow-2xs">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <span className="uppercase tracking-wider text-[11px]">KHUNG PHÍ PHẠT TRẢ TRƯỚC HẠN</span>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setFeeScheduleType('by_year')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  feeScheduleType === 'by_year'
                    ? 'bg-neg text-white shadow-2xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Theo năm vay
              </button>
              <button
                type="button"
                onClick={() => setFeeScheduleType('custom_rate')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  feeScheduleType === 'custom_rate'
                    ? 'bg-neg text-white shadow-2xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Nhập % trực tiếp
              </button>
            </div>
          </div>

          {feeScheduleType === 'by_year' ? (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Thời gian hợp đồng đã vay</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {LOAN_YEAR_OPTIONS.map(item => {
                    const isSel = loanAgeYear === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setLoanAgeYear(item.val)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-neg text-white shadow-2xs ring-1 ring-neg'
                            : 'bg-surface border border-line text-ink-muted hover:text-ink hover:bg-panel'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {penaltyByYearStr.map((rate, index) => (
                  <div key={index}>
                    <label className={labelCls} htmlFor={`prepay-fee-year-${index + 1}`}>Năm {index + 1} (%)</label>
                    <input
                      id={`prepay-fee-year-${index + 1}`}
                      type="number"
                      step="0.1"
                      value={rate}
                      onChange={e => setPenaltyForYear(index, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div>
                  <span className={labelCls}>Từ năm {PREPAYMENT_FEE_YEARS + 1}</span>
                  <div className={`${inputCls} text-pos`}>Miễn phí</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Tỷ lệ phí phạt áp dụng (% số tiền trả trước)</label>
                <input
                  type="number"
                  step="0.05"
                  value={customPenaltyPercentStr}
                  onChange={e => setCustomPenaltyPercentStr(e.target.value)}
                  className={`${inputCls} text-neg text-sm`}
                  placeholder="VD: 1.5"
                />
              </div>
            </div>
          )}

          <div className="pt-1">
            <label className={labelCls}>Mức phí phạt tối thiểu (VNĐ, nếu có)</label>
            <input
              type="text"
              value={minPenaltyFeeStr}
              onChange={e => setMinPenaltyFeeStr(formatMoneyInput(e.target.value))}
              className={inputCls}
              placeholder="0"
            />
          </div>

          <div className="pl-4 border-l-2 border-line/40 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-ink-muted text-[11px]">
              <span>Dư nợ còn lại sau trả trước:</span>
              <strong className="font-mono text-accent font-bold">{fmtMoney(result.remainingBalanceAfterPrepay)}</strong>
            </div>
            <div className="flex justify-between items-center text-ink-muted text-[11px]">
              <span>Tỷ lệ hoàn trả gốc:</span>
              <strong className="font-mono text-ink font-bold">
                {result.isFullPrepayment ? '100% (Tất toán toàn bộ)' : `${Math.round((result.actualPrepayAmount / (result.currentBalance || 1)) * 100)}%`}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
