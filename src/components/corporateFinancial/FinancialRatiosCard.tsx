import React from 'react';
import { TrendingUp, ShieldCheck, Landmark } from 'lucide-react';
import type { FinancialRatios } from '../../types/corporateFinancial';
import { UI } from '../../lib/uiClasses';

interface FinancialRatiosCardProps {
  ratios: FinancialRatios;
}

export const FinancialRatiosCard: React.FC<FinancialRatiosCardProps> = ({ ratios }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Khả năng thanh toán */}
        <div className={`${UI.sectionBoxBg} p-4 rounded-xl shadow-xs space-y-3`}>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            <span>Khả năng thanh toán</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Khả năng thanh toán hiện hành:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.currentRatio} <span className="text-[10px] font-normal text-ink-muted">lần</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Khả năng thanh toán nhanh:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.quickRatio} <span className="text-[10px] font-normal text-ink-muted">lần</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-ink-muted">Khả năng thanh toán tức thời (tiền):</span>
              <span className="font-bold font-mono text-ink">
                {ratios.cashRatio} <span className="text-[10px] font-normal text-ink-muted">lần</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cơ cấu vốn & Đòn bẩy */}
        <div className={`${UI.sectionBoxBg} p-4 rounded-xl shadow-xs space-y-3`}>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wide">
            <Landmark className="w-4 h-4" />
            <span>Cơ cấu vốn & Đòn bẩy</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Hệ số Nợ / Tổng tài sản:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.debtToAssets}%
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Hệ số Nợ / Vốn chủ sở hữu:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.debtToEquity}%
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-ink-muted">Vòng quay hàng tồn kho:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.inventoryTurnover} <span className="text-[10px] font-normal text-ink-muted">vòng/năm</span>
              </span>
            </div>
          </div>
        </div>

        {/* Khả năng sinh lời */}
        <div className={`${UI.sectionBoxBg} p-4 rounded-xl shadow-xs space-y-3`}>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wide">
            <TrendingUp className="w-4 h-4" />
            <span>Khả năng sinh lời</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Biên lợi nhuận gộp:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {ratios.grossMargin}%
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line/40">
              <span className="text-ink-muted">Biên lợi nhuận ròng (ROS):</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {ratios.netProfitMargin}%
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-ink-muted">Tỷ suất sinh lời ROA / ROE:</span>
              <span className="font-bold font-mono text-ink">
                {ratios.roa}% / {ratios.roe}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
