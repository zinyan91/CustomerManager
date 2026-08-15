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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3.5 border flex items-center justify-between`}>
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

        <div className={`${UI.containerCardBg} rounded-lg p-3.5 border flex items-center justify-between`}>
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">2. CÔNG NỢ PHẢI THU (TK 131)</div>
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

        <div className="rounded-lg p-3.5 border border-pos/40 bg-pos-soft flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-pos uppercase tracking-wide">
              3. TỔNG TÀI SẢN KINH DOANH NGẮN HẠN (1 + 2)
            </div>
            <div className="text-xl font-black text-pos mt-1 font-mono">
              {fmtMoney(totalAssets)}
            </div>
            <div className="text-xs font-semibold text-pos mt-0.5 font-mono">
              (Tồn kho + Phải thu 131)
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
      <div className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
        <div className="font-bold text-accent uppercase text-xs">Bảng Tổng hợp Liên kết Tài sản & Công nợ</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-panel-muted text-[10px] uppercase text-ink-faint border-b border-line">
              <tr>
                <th className="p-2">HẠNG MỤC TÀI SẢN KINH DOANH</th>
                <th className="p-2 text-center w-24">SỐ LƯỢNG</th>
                <th className="p-2 text-right w-40">GIÁ TRỊ ĐẦU KỲ (VND)</th>
                <th className="p-2 text-right w-40">PHÁT SINH KỲ (VND)</th>
                <th className="p-2 text-right w-48 bg-pos-soft text-pos font-bold">GIÁ TRỊ CUỐI KỲ (VND)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="p-2 font-bold flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-accent" />
                  <span>1. Hàng tồn kho</span>
                </td>
                <td className="p-2 text-center font-mono">{invSummary.totalItems} SP</td>
                <td className="p-2 text-right font-mono">{fmtMoney(invSummary.totalBeginningValue)}</td>
                <td className="p-2 text-right font-mono text-ink-faint">
                  + {fmtMoney(invSummary.totalImportValue)} / − {fmtMoney(invSummary.totalExportValue)}
                </td>
                <td className="p-2 text-right font-mono font-bold text-pos bg-pos-soft/30">{fmtMoney(invSummary.totalEndingValue)}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold flex items-center space-x-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span>2. Công nợ Phải thu Khách hàng (TK 131)</span>
                </td>
                <td className="p-2 text-center font-mono">{recSummary.totalItems} KH</td>
                <td className="p-2 text-right font-mono">{fmtMoney(recSummary.totalBeginningDebit)}</td>
                <td className="p-2 text-right font-mono text-ink-faint">
                  + {fmtMoney(recSummary.totalOccurredDebit)} / − {fmtMoney(recSummary.totalOccurredCredit)}
                </td>
                <td className="p-2 text-right font-mono font-bold text-pos bg-pos-soft/30">{fmtMoney(recSummary.totalEndingDebit)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30">
              <tr>
                <td className="p-2 text-accent" colSpan={4}>TỔNG TÀI SẢN KINH DOANH NGẮN HẠN (1 + 2)</td>
                <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60 font-black">{fmtMoney(totalAssets)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
