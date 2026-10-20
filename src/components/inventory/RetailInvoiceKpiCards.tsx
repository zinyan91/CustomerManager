import React from 'react';
import type { RetailInvoiceSummary } from '../../lib/statement';
import { fmtMoney, fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { Package, Layers, CheckCircle2 } from 'lucide-react';

interface RetailInvoiceKpiCardsProps {
  summary: RetailInvoiceSummary;
}

export const RetailInvoiceKpiCards: React.FC<RetailInvoiceKpiCardsProps> = ({ summary }) => {
  return (
    <div data-workspace-metrics className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-app animate-in fade-in duration-150">
      <div data-workspace-panel className={`${UI.containerCardBg} rounded-2xl p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">MẶT HÀNG TRÊN HÓA ĐƠN</div>
          <div className="text-base font-bold text-accent mt-1 font-mono">
            {fmtNumber(summary.totalItems)} <span className="text-xs font-normal text-ink-faint">sản phẩm</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-accent-soft text-accent shrink-0 shadow-2xs">
          <Package className="w-5 h-5" />
        </div>
      </div>

      <div data-workspace-panel className={`${UI.containerCardBg} rounded-2xl p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">TỔNG SỐ LƯỢNG SẢN PHẨM</div>
          <div className="text-base font-bold text-ink mt-1 font-mono">
            {fmtNumber(summary.totalQty)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-surface border border-line/70 text-ink-muted shrink-0 shadow-2xs">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      <div data-workspace-panel className={`${UI.containerCardBg} rounded-2xl p-4 border border-pos/40 bg-pos-soft/20 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <div className="text-[10px] font-extrabold text-pos uppercase tracking-wider">TỔNG CỘNG HÓA ĐƠN</div>
          <div className="text-base font-extrabold text-pos mt-1 font-mono">
            {fmtMoney(summary.totalAmount)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-pos text-surface shrink-0 shadow-2xs">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
