import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, ShieldCheck } from 'lucide-react';
import {
  defaultToiLoanInputs, computeToiLoanSummary, type ToiLoanMonthInput,
} from '../../lib/toiMath';
import { fmtMoney, fmtNumber, formatMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

export const ToiLoanCalcSection: React.FC = () => {
  const [inputs, setInputs] = useState<ToiLoanMonthInput[]>(defaultToiLoanInputs);

  // Master controls for instant real-time sync to all 12 months
  const [globalShortBal, setGlobalShortBal] = useState<string>('1250');
  const [globalShortRate, setGlobalShortRate] = useState<string>('9.0');
  const [globalShortFtp, setGlobalShortFtp] = useState<string>('8.0');

  const [globalLongBal, setGlobalLongBal] = useState<string>('0');
  const [globalLongRate, setGlobalLongRate] = useState<string>('10.5');
  const [globalLongFtp, setGlobalLongFtp] = useState<string>('8.5');

  const summary = useMemo(() => computeToiLoanSummary(inputs), [inputs]);

  // Master update handlers (Real-time auto sync across 12 months)
  const updateMasterShortBal = (valStr: string) => {
    setGlobalShortBal(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, shortTermBal: num })));
  };

  const updateMasterShortRate = (valStr: string) => {
    setGlobalShortRate(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, shortTermRate: num })));
  };

  const updateMasterShortFtp = (valStr: string) => {
    setGlobalShortFtp(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, shortTermFtp: num })));
  };

  const updateMasterLongBal = (valStr: string) => {
    setGlobalLongBal(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, longTermBal: num })));
  };

  const updateMasterLongRate = (valStr: string) => {
    setGlobalLongRate(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, longTermRate: num })));
  };

  const updateMasterLongFtp = (valStr: string) => {
    setGlobalLongFtp(valStr);
    const num = parseMoneyDecimalInput(valStr);
    setInputs(prev => prev.map(it => ({ ...it, longTermFtp: num })));
  };

  const updateMonthInput = (monthIdx: number, patch: Partial<ToiLoanMonthInput>) => {
    setInputs(prev =>
      prev.map((it, idx) => (idx === monthIdx ? { ...it, ...patch } : it))
    );
  };

  const cellInputCls =
    'w-full bg-transparent text-xs p-1 text-right rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className={`${UI.containerCardBg} rounded-lg p-4 border space-y-4`}>
      {/* Header (No subtitle text) */}
      <div className="flex items-center space-x-2.5 border-b border-line pb-3">
        <div className="p-2 bg-accent-soft rounded-lg text-accent">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
            DỰ PHÓNG THU NHẬP TOI CHO VAY (TÍN DỤNG VNĐ)
          </h2>
        </div>
      </div>

      {/* Master Input Control Box (Auto-syncs all 12 months) */}
      <div className="bg-panel-muted/50 rounded-lg p-3.5 border border-line space-y-3">
        <div className="text-[11px] font-bold text-ink uppercase tracking-wide flex items-center justify-between border-b border-line pb-2">
          <span className="flex items-center space-x-1.5 text-accent">
            <ShieldCheck className="w-4 h-4" />
            <span>Thông số chung (Tự động cập nhật 12 tháng)</span>
          </span>
          <span className="text-[10px] font-normal text-ink-faint lowercase">
            (thay đổi thông số tại đây sẽ áp dụng ngay cho toàn bộ 12 tháng)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ngắn hạn */}
          <div className="bg-panel rounded-md p-2.5 border border-line space-y-2">
            <div className="text-xs font-bold text-accent uppercase">Cho vay Ngắn hạn (VND)</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">DNBQ (Triệu VNĐ)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalShortBal}
                  onChange={e => updateMasterShortBal(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold text-accent`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Lãi suất (%/năm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalShortRate}
                  onChange={e => updateMasterShortRate(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">FTP (%/năm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalShortFtp}
                  onChange={e => updateMasterShortFtp(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
                />
              </div>
            </div>
          </div>

          {/* Trung dài hạn */}
          <div className="bg-panel rounded-md p-2.5 border border-line space-y-2">
            <div className="text-xs font-bold text-accent uppercase">Cho vay Trung dài hạn (VND)</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">DNBQ (Triệu VNĐ)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalLongBal}
                  onChange={e => updateMasterLongBal(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold text-accent`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Lãi suất (%/năm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalLongRate}
                  onChange={e => updateMasterLongRate(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">FTP (%/năm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalLongFtp}
                  onChange={e => updateMasterLongFtp(e.target.value)}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right font-bold`}
                />
              </div>
            </div>
          </div>
        </div>
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
              ({fmtNumber(summary.avgBalanceAnnual)} triệu VNĐ)
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
                      value={inp.shortTermBal === 0 ? '' : formatMoneyInput(String(inp.shortTermBal))}
                      onChange={e => {
                        const val = parseMoneyDecimalInput(e.target.value);
                        updateMonthInput(idx, { shortTermBal: val });
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
                      value={inp.longTermBal === 0 ? '' : formatMoneyInput(String(inp.longTermBal))}
                      onChange={e => {
                        const val = parseMoneyDecimalInput(e.target.value);
                        updateMonthInput(idx, { longTermBal: val });
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
                DNBQ: {fmtNumber(summary.avgBalanceAnnual)}
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
