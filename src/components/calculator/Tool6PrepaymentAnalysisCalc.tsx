import React, { useState, useMemo } from 'react';
import { ShieldAlert, DollarSign, Award, CheckCircle } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';

interface Tool6Props {
  styles: UiClasses;
}

export const Tool6PrepaymentAnalysisCalc: React.FC<Tool6Props> = () => {
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

  const cardBg = UI.containerCardBg;

  return (
    <div className="space-y-4 font-app">
      {/* Title Header Card */}
      <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150`}>
        <div className="text-xs font-bold tracking-tight text-accent flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <Award className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-xs">
            TÍNH PHÍ TRẢ NỢ TRƯỚC HẠN & BÀI TOÁN TỐI ƯU CHI PHÍ LÃI
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột 1: Khoản vay & Số tiền trả trước */}
        <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-accent tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="uppercase tracking-wider text-[11px]">1. KHOẢN VAY & SỐ TIỀN TRẢ TRƯỚC HẠN</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Dư nợ gốc hiện tại (VND) *
              </label>
              <input
                type="text"
                value={balanceStr}
                onChange={e => {
                  const val = formatMoneyInput(e.target.value);
                  setBalanceStr(val);
                  setPrepayAmountStr(val);
                }}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-accent bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Số tiền đăng ký trả trước hạn (VND) *
              </label>
              <input
                type="text"
                value={prepayAmountStr}
                onChange={e => setPrepayAmountStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-pos bg-surface/80 focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Lãi suất (%/năm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rateAnnualStr}
                  onChange={e => setRateAnnualStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold text-warn bg-surface/80 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Thời hạn còn lại (tháng)</label>
                <input
                  type="number"
                  min={1}
                  value={remainingTenorMonths}
                  onChange={e => setRemainingTenorMonths(parseInt(e.target.value, 10) || 12)}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Thời gian đã vay</label>
                <select
                  value={loanAgeYear}
                  onChange={e => setLoanAgeYear(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
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

        {/* Cột 2: Khung phí phạt */}
        <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4`}>
          <div className="font-bold text-xs text-neg tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
            <div className="p-1.5 rounded-lg bg-neg-soft text-neg shrink-0 shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span className="uppercase tracking-wider text-[11px]">2. KHUNG PHÍ PHẠT TRẢ NỢ TRƯỚC HẠN HỢP ĐỒNG (%)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Năm 1 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear1}
                onChange={e => setPenaltyYear1(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Năm 2 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear2}
                onChange={e => setPenaltyYear2(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Năm 3 phạt (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear3}
                onChange={e => setPenaltyYear3(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Từ năm 4+ (%)</label>
              <input
                type="number"
                step="0.1"
                value={penaltyYear4Plus}
                onChange={e => setPenaltyYear4Plus(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-line/70 text-xs font-mono font-bold bg-surface/80 focus:border-accent"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neg-soft/25 border border-neg/30 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted text-[11px]">Tỷ lệ phí phạt áp dụng (Năm thứ {loanAgeYear}):</span>
              <strong className="font-mono text-neg font-bold">{activePenaltyPercent}%</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-neg/25">
              <span className="font-bold text-neg text-[11px] uppercase tracking-wider">TIỀN PHẠT TRẢ TRƯỚC HẠN:</span>
              <strong className="font-mono font-extrabold text-neg text-sm">{fmtMoney(penaltyFee)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Phân tích bài toán tiết kiệm chi phí */}
      <div className={`p-5 rounded-2xl border specular-card shadow-xs space-y-3 ${
        netSavings >= 0 ? 'bg-pos-soft/30 border-pos/35' : 'bg-neg-soft/30 border-neg/35'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-pos/25 pb-3">
          <div>
            <div className="text-xs font-bold text-pos tracking-tight flex items-center space-x-1.5 uppercase">
              <CheckCircle className="w-4 h-4 text-pos" />
              <span>BÀI TOÁN PHÂN TÍCH TIẾT KIỆM CHI PHÍ LÃI:</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono mt-1 tracking-tight ${
              netSavings >= 0 ? 'text-pos' : 'text-neg'
            }`}>
              TIẾT KIỆM RÒNG: {fmtMoney(netSavings)}
            </div>
          </div>

          <div className="text-xs space-y-1 font-mono text-ink-muted">
            <div>• Tổng lãi tiết kiệm được: <strong className="text-pos">{fmtMoney(totalInterestSaved)}</strong></div>
            <div>• Phí phạt trả trước hạn: <strong className="text-neg">-{fmtMoney(penaltyFee)}</strong></div>
          </div>
        </div>

        <div className="text-xs text-ink-muted font-medium leading-relaxed">
          💡 <strong>Kết luận tư vấn:</strong>{' '}
          {netSavings >= 0 ? (
            <>
              Khách hàng nên trả nợ trước hạn ngay vì tổng tiền lãi tiết kiệm được trong {remainingTenorMonths} tháng tới ({fmtMoney(totalInterestSaved)}) vượt xa tiền phí phạt ({fmtMoney(penaltyFee)}), giúp khách hàng <strong className="text-pos">lời ròng {fmtMoney(netSavings)}</strong>!
            </>
          ) : (
            <>
              Khách hàng chưa nên trả nợ trước hạn vì tiền phí phạt ({fmtMoney(penaltyFee)}) cao hơn số tiền lãi tiết kiệm ({fmtMoney(totalInterestSaved)}), khiến khách hàng <strong className="text-neg">thiệt hại ròng {fmtMoney(Math.abs(netSavings))}</strong>.
            </>
          )}
        </div>
      </div>
    </div>
  );
};
