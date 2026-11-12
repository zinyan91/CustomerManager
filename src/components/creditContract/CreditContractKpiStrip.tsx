import React from 'react';
import { fmtMoney } from '../../lib/utils';
import type { CustomerCreditCapacity } from '../../lib/creditCapacity';

interface CreditContractKpiStripProps {
  totalGranted: number;
  activeContractCount: number;
  totalContractCount: number;
  capacity: CustomerCreditCapacity;
}

export const CreditContractKpiStrip: React.FC<CreditContractKpiStripProps> = ({
  totalGranted,
  activeContractCount,
  totalContractCount,
  capacity,
}) => {
  const canGrantMore = capacity.remaining > 0;
  return (
    <div data-workspace-metrics className="grid grid-cols-2 xl:grid-cols-4 font-app">
      <div data-workspace-panel data-metric-tone="accent" className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Hạn mức đã cấp</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-accent whitespace-nowrap">
            {fmtMoney(totalGranted)}
          </div>
        </div>
      </div>

      <div data-workspace-panel data-metric-tone="accent" className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Quy mô HĐTD</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-ink whitespace-nowrap">
            {activeContractCount} <span className="text-xs font-normal text-ink-faint">mở / {totalContractCount} tổng</span>
          </div>
        </div>
      </div>

      <div data-workspace-panel data-metric-tone="collateral" className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Khả năng bảo đảm</div>
          <div className="mt-1 font-mono font-bold text-sm sm:text-base text-ink whitespace-nowrap">
            {fmtMoney(capacity.capacity)}
          </div>
          <div className="text-[11px] text-ink-faint whitespace-nowrap">đang dùng {fmtMoney(capacity.used)}</div>
        </div>
      </div>

      <div data-workspace-panel data-metric-tone={canGrantMore ? 'pos' : 'neg'} className="px-4 py-3 border-b border-line">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-ink-muted">Còn cấp thêm được</div>
          <div className={`mt-1 font-mono font-bold text-sm sm:text-base whitespace-nowrap ${canGrantMore ? 'text-pos' : 'text-neg'}`}>
            {fmtMoney(capacity.remaining)}
          </div>
        </div>
      </div>
    </div>
  );
};
