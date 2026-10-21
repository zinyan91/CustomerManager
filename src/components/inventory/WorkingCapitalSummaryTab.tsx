import React, { useState } from 'react';
import { Link2, Boxes, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import type { InventorySummary } from '../../lib/inventory';
import type { ReceivableSummary } from '../../lib/debt';
import { fmtMoney, fmtPercent, formatMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface WorkingCapitalSummaryTabProps {
  invSummary: InventorySummary;
  recSummary: ReceivableSummary;
}

export const WorkingCapitalSummaryTab: React.FC<WorkingCapitalSummaryTabProps> = ({
  invSummary,
  recSummary,
}) => {
  const [creditLimitStr, setCreditLimitStr] = useState<string>('2000000000'); // Sample 2 billion VND credit limit

  const totalAssets = invSummary.totalEndingValue + recSummary.totalEndingDebit;
  const creditLimit = parseMoneyDecimalInput(creditLimitStr);
  const coverageRatio = creditLimit > 0 ? (totalAssets / creditLimit) * 100 : 0;

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center space-x-2.5 border-b border-line pb-3">
        <div className="p-2 bg-accent-soft rounded-lg text-accent">
          <Link2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
            BẢNG TỔNG HỢP LIÊN KẾT TÀI SẢN NGẮN HẠN & CÔNG NỢ PHẢI THU
          </h2>
          <p className="text-xs text-ink-faint">
            Tổng hợp dữ liệu liên kết giữa Giá trị Hàng tồn kho và Công nợ Phải thu Khách hàng
          </p>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div data-workspace-metrics className="workspace-metrics-wide grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div data-workspace-panel data-metric-tone="accent" className={`${UI.containerCardBg} rounded-lg p-3.5 border flex items-center justify-between`}>
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">1. HÀNG TỒN KHO CUỐI KỲ</div>
            <div className="text-lg font-black text-ink mt-1 font-mono">
              {fmtMoney(invSummary.totalEndingValue)}
            </div>
            <div className="text-xs text-ink-faint font-mono mt-0.5">
              {invSummary.totalItems} mặt hàng sản phẩm
            </div>
          </div>
          <div className="p-2.5 bg-panel-muted rounded-lg text-accent">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div data-workspace-panel data-metric-tone="cust" className={`${UI.containerCardBg} rounded-lg p-3.5 border flex items-center justify-between`}>
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">2. CÔNG NỢ PHẢI THU</div>
            <div className="text-lg font-black text-ink mt-1 font-mono">
              {fmtMoney(recSummary.totalEndingDebit)}
            </div>
            <div className="text-xs text-ink-faint font-mono mt-0.5">
              {recSummary.totalItems} khách hàng nợ
            </div>
          </div>
          <div className="p-2.5 bg-panel-muted rounded-lg text-accent">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div data-workspace-panel data-metric-tone="pos" className="rounded-lg p-3.5 border border-pos/40 bg-pos-soft flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-pos uppercase tracking-wide">
              3. TỔNG TÀI SẢN KINH DOANH NGẮN HẠN (1 + 2)
            </div>
            <div className="text-xl font-black text-pos mt-1 font-mono">
              {fmtMoney(totalAssets)}
            </div>
            <div className="text-xs font-semibold text-pos mt-0.5 font-mono">
              (Tồn kho + Phải thu)
            </div>
          </div>
          <div className="p-2.5 bg-pos/20 rounded-lg text-pos">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Credit Limit & Coverage Evaluation Box */}
      <div className={`${UI.containerCardBg} rounded-lg p-4 border space-y-3`}>
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center space-x-1.5 border-b border-line pb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Đánh giá Mức độ Đảm bảo Hạn mức Tín dụng Ngắn hạn</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
              Hạn mức Vay ngắn hạn Ngân hàng đề xuất (VND)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formatMoneyInput(creditLimitStr)}
              onChange={e => setCreditLimitStr(formatMoneyInput(e.target.value))}
              className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-mono text-right font-bold text-accent`}
            />
          </div>

          <div className="bg-panel-muted/50 rounded-lg p-3 border border-line">
            <div className="text-[10px] font-bold text-ink-faint uppercase">TỶ LỆ BAO PHỦ TÀI SẢN / HẠN MỨC</div>
            <div className="text-xl font-black text-accent mt-0.5 font-mono">
              {fmtPercent(coverageRatio > 1 ? coverageRatio / 100 : coverageRatio)}
            </div>
            <div className="text-xs text-ink-faint mt-0.5">
              (Tổng TS ngắn hạn / Hạn mức vay đề xuất)
            </div>
          </div>

          <div className={`rounded-lg p-3 border ${coverageRatio >= 100 ? 'bg-pos-soft/50 border-pos/30 text-pos' : 'bg-warn-soft/50 border-warn/30 text-warn'}`}>
            <div className="font-bold text-xs">
              {coverageRatio >= 100 ? '✅ ĐỦ KHẢ NĂNG ĐẢM BẢO' : '⚠️ CẦN XEM XÉT THÊM TSĐB KHÁC'}
            </div>
            <div className="text-xs mt-1">
              {coverageRatio >= 100
                ? `Tổng tài sản ngắn hạn (Tồn kho + Phải thu) gấp ${(totalAssets / Math.max(1, creditLimit)).toFixed(2)} lần hạn mức vay đề xuất.`
                : 'Tổng tài sản ngắn hạn kinh doanh nhỏ hơn hạn mức vay đề xuất.'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3 font-app animate-in fade-in duration-150`}>
        <div className="font-bold text-accent uppercase tracking-wider text-xs flex items-center gap-2">
          <span>Bảng Tổng hợp Liên kết Tài sản & Công nợ</span>
        </div>
        <div className="overflow-x-auto border border-line/70 rounded-xl">
          <table className="w-full text-left text-xs border-collapse font-app">
            <thead className="bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
              <tr>
                <th className="px-3.5 py-3">HẠNG MỤC TÀI SẢN KINH DOANH</th>
                <th className="px-3.5 py-3 text-center w-24">SỐ LƯỢNG</th>
                <th className="px-3.5 py-3 text-right w-44">GIÁ TRỊ ĐẦU KỲ (VND)</th>
                <th className="px-3.5 py-3 text-right w-48">PHÁT SINH KỲ (VND)</th>
                <th className="px-3.5 py-3 text-right w-48 bg-pos-soft/30 text-pos font-bold">GIÁ TRỊ CUỐI KỲ (VND)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 font-mono">
              <tr className="hover:bg-accent/[0.04] transition-colors">
                <td className="px-3.5 py-3 font-bold flex items-center space-x-2 font-app text-ink">
                  <div className="p-1 rounded bg-accent-soft text-accent">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                  <span>1. Hàng tồn kho</span>
                </td>
                <td className="px-3.5 py-3 text-center font-mono font-semibold text-ink-muted">{invSummary.totalItems} SP</td>
                <td className="px-3.5 py-3 text-right font-mono text-ink">{fmtMoney(invSummary.totalBeginningValue)}</td>
                <td className="px-3.5 py-3 text-right font-mono text-ink-faint text-[11px]">
                  + {fmtMoney(invSummary.totalImportValue)} / − {fmtMoney(invSummary.totalExportValue)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono font-bold text-pos bg-pos-soft/20">{fmtMoney(invSummary.totalEndingValue)}</td>
              </tr>
              <tr className="hover:bg-accent/[0.04] transition-colors">
                <td className="px-3.5 py-3 font-bold flex items-center space-x-2 font-app text-ink">
                  <div className="p-1 rounded bg-accent-soft text-accent">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>2. Công nợ Phải thu Khách hàng</span>
                </td>
                <td className="px-3.5 py-3 text-center font-mono font-semibold text-ink-muted">{recSummary.totalItems} KH</td>
                <td className="px-3.5 py-3 text-right font-mono text-ink">{fmtMoney(recSummary.totalBeginningDebit)}</td>
                <td className="px-3.5 py-3 text-right font-mono text-ink-faint text-[11px]">
                  + {fmtMoney(recSummary.totalOccurredDebit)} / − {fmtMoney(recSummary.totalOccurredCredit)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono font-bold text-pos bg-pos-soft/20">{fmtMoney(recSummary.totalEndingDebit)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-surface/95 backdrop-blur-md font-bold border-t-2 border-line/80">
              <tr>
                <td className="px-3.5 py-3 uppercase tracking-wider text-[10px] text-accent font-bold" colSpan={4}>TỔNG TÀI SẢN KINH DOANH NGẮN HẠN (1 + 2)</td>
                <td className="px-3.5 py-3 text-right font-mono text-pos text-sm bg-pos-soft/30 font-extrabold">{fmtMoney(totalAssets)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
