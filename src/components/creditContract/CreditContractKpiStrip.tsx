import React from 'react';
import { fmtMoney } from '../../lib/utils';

interface CreditContractKpiStripProps {
  totalGranted: number;
  activeContractCount: number;
  totalContractCount: number;
  tongKhaNangBaoDam: number;
  vuotKhaNangBaoDam: boolean;
}

export const CreditContractKpiStrip: React.FC<CreditContractKpiStripProps> = ({
  totalGranted,
  activeContractCount,
  totalContractCount,
  tongKhaNangBaoDam,
  vuotKhaNangBaoDam,
}) => {
  return (
    <div data-workspace-metrics className="grid grid-cols-2 xl:grid-cols-4 font-app">
      <div data-workspace-panel className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Hạn mức đã cấp</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-accent whitespace-nowrap">
            {fmtMoney(totalGranted)}
          </div>
        </div>
      </div>

      <div data-workspace-panel className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Quy mô HĐTD</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-ink whitespace-nowrap">
            {activeContractCount} <span className="text-xs font-normal text-ink-faint">mở / {totalContractCount} tổng</span>
          </div>
        </div>
      </div>

      <div data-workspace-panel className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Khả năng bảo đảm</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-ink whitespace-nowrap">
            {fmtMoney(tongKhaNangBaoDam)}
          </div>
        </div>
      </div>

      <div data-workspace-panel className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Tỷ lệ bảo đảm</div>
          <div className={`mt-1 font-mono font-bold text-sm sm:text-base ${vuotKhaNangBaoDam ? 'text-neg' : 'text-pos'}`}>
            {totalGranted > 0 ? `${((tongKhaNangBaoDam / totalGranted) * 100).toFixed(0)}%` : '100%'}
            {vuotKhaNangBaoDam && <span className="text-[10px] font-normal text-neg ml-1">(Thiếu TSBĐ)</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
