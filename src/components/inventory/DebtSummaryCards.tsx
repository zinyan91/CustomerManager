import React from 'react';
import { Building2, Users, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { ReceivableSummary } from '../../lib/debt';
import { fmtMoney } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtSummaryCardsProps {
  summary: ReceivableSummary;
  type: 'payable' | 'receivable';
}

export const DebtSummaryCards: React.FC<DebtSummaryCardsProps> = ({ summary, type }) => {
  const isPayable = type === 'payable';

  return (
    <div data-workspace-metrics className="workspace-metrics-wide grid grid-cols-1 sm:grid-cols-3 gap-3 font-app animate-in fade-in duration-150">
      {/* Card 1: Dư đầu kỳ */}
      <div data-workspace-panel data-metric-tone="accent" className={`${UI.containerCardBg} rounded-2xl p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <span className="text-[10px] text-ink-muted font-medium">
            {isPayable ? 'Tổng dư nợ đầu kỳ (Có)' : 'Tổng dư nợ đầu kỳ (Nợ)'}
          </span>
          <div className="text-base font-bold text-accent font-mono mt-1">
            {fmtMoney(isPayable ? summary.totalBeginningCredit : summary.totalBeginningDebit)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-accent-soft text-accent shrink-0">
          {isPayable ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        </div>
      </div>

      {/* Card 2: Phát sinh trong kỳ */}
      <div data-workspace-panel data-metric-tone="neutral" className={`${UI.containerCardBg} rounded-2xl p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <span className="text-[10px] text-ink-muted font-medium">
            {isPayable ? 'Tổng phát sinh (Mua thêm)' : 'Tổng phát sinh trong kỳ'}
          </span>
          <div className="text-base font-bold text-ink font-mono mt-1">
            {fmtMoney(isPayable ? summary.totalOccurredCredit : summary.totalOccurredDebit)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-surface text-ink-muted shrink-0">
          {isPayable ? <ArrowUpRight className="w-5 h-5 text-warn" /> : <ArrowDownLeft className="w-5 h-5 text-pos" />}
        </div>
      </div>

      {/* Card 3: Dư cuối kỳ */}
      <div data-workspace-panel data-metric-tone="neutral" className={`${UI.containerCardBg} rounded-2xl p-4 border border-pos/40 bg-pos-soft/20 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
        <div>
          <span className="text-[10px] text-ink-muted font-medium">
            {isPayable ? 'Tổng dư nợ cuối kỳ (Có)' : 'Tổng dư nợ cuối kỳ (Nợ)'}
          </span>
          <div className="text-base font-extrabold text-pos font-mono mt-1">
            {fmtMoney(isPayable ? summary.totalEndingCredit : summary.totalEndingDebit)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-pos-soft text-pos shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
