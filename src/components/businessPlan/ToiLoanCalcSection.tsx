import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, Copy, Check, ShieldCheck } from 'lucide-react';
import {
  defaultToiLoanInputs, computeToiLoanSummary, type ToiLoanMonthInput,
} from '../../lib/toiMath';
import { fmtMoney, parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

export const ToiLoanCalcSection: React.FC = () => {
  const [inputs, setInputs] = useState<ToiLoanMonthInput[]>(defaultToiLoanInputs);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Global rates controls for fast editing across 12 months
  const [globalShortRate, setGlobalShortRate] = useState<string>('9.0');
  const [globalShortFtp, setGlobalShortFtp] = useState<string>('8.0');
  const [globalLongRate, setGlobalLongRate] = useState<string>('10.5');
  const [globalLongFtp, setGlobalLongFtp] = useState<string>('8.5');

  const summary = useMemo(() => computeToiLoanSummary(inputs), [inputs]);

  const applyGlobalRatesToAllMonths = () => {
    const sRate = parseMoneyDecimalInput(globalShortRate);
    const sFtp = parseMoneyDecimalInput(globalShortFtp);
    const lRate = parseMoneyDecimalInput(globalLongRate);
    const lFtp = parseMoneyDecimalInput(globalLongFtp);

    setInputs(prev =>
      prev.map(it => ({
        ...it,
        shortTermRate: sRate,
        shortTermFtp: sFtp,
        longTermRate: lRate,
        longTermFtp: lFtp,
      }))
    );
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const updateMonthInput = (monthIdx: number, patch: Partial<ToiLoanMonthInput>) => {
    setInputs(prev =>
      prev.map((it, idx) => (idx === monthIdx ? { ...it, ...patch } : it))
    );
  };

  const copyShortBalToAllMonths = (val: number) => {
    setInputs(prev => prev.map(it => ({ ...it, shortTermBal: val })));
  };

  const copyLongBalToAllMonths = (val: number) => {
    setInputs(prev => prev.map(it => ({ ...it, longTermBal: val })));
  };

  const cellInputCls =
    'w-full bg-transparent text-xs p-1 text-right rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className={`${UI.containerCardBg} rounded-lg p-4 border space-y-4`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              DỰ PHÓNG THU NHẬP TOI CHO VAY (TÍN DỤNG VNĐ)
            </h2>
            <p className="text-xs text-ink-faint">
              Tính toán tổng thu nhập hoạt động (Total Operating Income) từ dư nợ cho vay VND 12 tháng dựa trên Margin (Lãi suất KH − Giá vốn FTP)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={applyGlobalRatesToAllMonths}
          className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3 py-1.5 rounded font-bold flex items-center space-x-1.5 transition-colors self-end sm:self-auto"
        >
          {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Áp dụng lãi suất cho 12 tháng</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-panel-muted/60 rounded-lg p-3 border border-line flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">DƯ NỢ BÌNH QUÂN CẢ NĂM</div>
            <div className="text-lg font-extrabold text-ink mt-0.5 font-mono">
              {fmtMoney(summary.avgBalanceAnnual * 1000000)}
            </div>
            <div className="text-[11px] text-ink-faint font-mono mt-0.5">
              ({summary.avgBalanceAnnual.toLocaleString('vi-VN')} triệu VNĐ)
            </div>
          </div>
          <div className="p-2 bg-panel rounded-md text-ink-faint border border-line">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-pos-soft/40 rounded-lg p-3 border border-pos/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-pos uppercase">TỔNG TOI CHO VAY (12 THÁNG)</div>
            <div className="text-lg font-black text-pos mt-0.5 font-mono">
              {fmtMoney(summary.totalIncomeAnnual * 1000000)}
            </div>
            <div className="text-[11px] text-pos font-bold font-mono mt-0.5">
              ({summary.totalIncomeAnnual.toFixed(3)} triệu VNĐ)
            </div>
          </div>
          <div className="p-2 bg-pos/20 rounded-md text-pos">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-accent-soft/40 rounded-lg p-3 border border-accent/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-accent uppercase">HIỆU QUẢ TOI / DNBQ</div>
            <div className="text-xl font-black text-accent mt-0.5 font-mono">
              {(summary.toiOverAvgBalance * 100).toFixed(3)}% / năm
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">
              (Biên thu nhập thuần trên 1 đồng dư nợ)
            </div>
          </div>
          <div className="p-2 bg-accent/20 rounded-md text-accent">
            <Percent className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Global Rates Control Box */}
      <div className="bg-panel-muted/40 rounded-lg p-3 border border-line space-y-2">
        <div className="text-[11px] font-bold text-ink uppercase tracking-wide flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>Thông số Lãi suất & FTP áp dụng chung</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">LS Ngắn hạn (%/năm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={globalShortRate}
              onChange={e => setGlobalShortRate(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">FTP Ngắn hạn (%/năm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={globalShortFtp}
              onChange={e => setGlobalShortFtp(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">LS Trung dài hạn (%/năm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={globalLongRate}
              onChange={e => setGlobalLongRate(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">FTP Trung dài hạn (%/năm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={globalLongFtp}
              onChange={e => setGlobalLongFtp(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
            />
          </div>
        </div>
      </div>

      {/* 12 Months Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[850px]">
          <thead className="bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line">
            <tr>
              <th className="p-2 text-center w-14" rowSpan={2}>THÁNG</th>
              <th className="p-2 text-center w-14" rowSpan={2}>SỐ NGÀY</th>
              <th className="p-1.5 text-center border-l border-line bg-panel-muted/80" colSpan={3}>NGẮN HẠN (VND)</th>
              <th className="p-1.5 text-center border-l border-line bg-panel-muted/80" colSpan={3}>TRUNG DÀI HẠN (VND)</th>
              <th className="p-2 text-right border-l border-line bg-pos-soft text-pos font-bold" rowSpan={2}>TỔNG TOI THÁNG (Triệu VNĐ)</th>
            </tr>
            <tr>
              <th className="p-1.5 text-right border-l border-line">DNBQ (Triệu)</th>
              <th className="p-1.5 text-right">MARGIN %</th>
              <th className="p-1.5 text-right">THU NHẬP (Triệu)</th>
              <th className="p-1.5 text-right border-l border-line">DNBQ (Triệu)</th>
              <th className="p-1.5 text-right">MARGIN %</th>
              <th className="p-1.5 text-right">THU NHẬP (Triệu)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {summary.monthlyResults.map((r, idx) => {
              const inp = inputs[idx];
              return (
                <tr key={r.month} className="hover:bg-panel-muted/50 transition-colors">
                  <td className="p-2 text-center font-bold text-accent">T{r.month}</td>
                  <td className="p-2 text-center font-mono text-ink-faint">{r.days}</td>

                  {/* Short term */}
                  <td className="p-1 border-l border-line">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inp.shortTermBal === 0 ? '' : inp.shortTermBal.toLocaleString('vi-VN')}
                      onChange={e => {
                        const val = parseMoneyDecimalInput(e.target.value);
                        updateMonthInput(idx, { shortTermBal: val });
                        if (idx === 0) copyShortBalToAllMonths(val);
                      }}
                      className={`${cellInputCls} font-bold`}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2 text-right font-mono text-ink-faint">
                    {r.shortTermMargin.toFixed(2)}%
                  </td>
                  <td className="p-2 text-right font-mono font-semibold">
                    {r.shortTermIncome.toFixed(3)}
                  </td>

                  {/* Long term */}
                  <td className="p-1 border-l border-line">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inp.longTermBal === 0 ? '' : inp.longTermBal.toLocaleString('vi-VN')}
                      onChange={e => {
                        const val = parseMoneyDecimalInput(e.target.value);
                        updateMonthInput(idx, { longTermBal: val });
                        if (idx === 0) copyLongBalToAllMonths(val);
                      }}
                      className={`${cellInputCls} font-bold`}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2 text-right font-mono text-ink-faint">
                    {r.longTermMargin.toFixed(2)}%
                  </td>
                  <td className="p-2 text-right font-mono font-semibold">
                    {r.longTermIncome.toFixed(3)}
                  </td>

                  {/* Total Month TOI */}
                  <td className="p-2 text-right font-mono font-extrabold text-pos border-l border-line bg-pos-soft/30">
                    {r.totalIncome.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30">
            <tr>
              <td className="p-2 text-center" colSpan={2}>TỔNG CỘNG 12 THÁNG</td>
              <td className="p-2 text-right font-mono border-l border-line text-accent">
                DNBQ: {summary.avgBalanceAnnual.toLocaleString('vi-VN')}
              </td>
              <td className="p-2"></td>
              <td className="p-2 text-right font-mono text-accent">{summary.totalShortTermIncome.toFixed(3)}</td>
              <td className="p-2 text-right font-mono border-l border-line"></td>
              <td className="p-2"></td>
              <td className="p-2 text-right font-mono">{summary.totalLongTermIncome.toFixed(3)}</td>
              <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60 font-black">
                {summary.totalIncomeAnnual.toFixed(3)} triệu VNĐ
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
