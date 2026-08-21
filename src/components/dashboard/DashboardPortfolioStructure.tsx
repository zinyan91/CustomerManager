import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

interface LoanMethodStat {
  method: string;
  count: number;
  amount: number;
  isGrantedLimit?: boolean;
}

interface DebtGroupStat {
  group: number;
  count: number;
  amount: number;
}

interface DashboardPortfolioStructureProps {
  cardBg: string;
  totalDebt: number;
  loanMethodStats: LoanMethodStat[];
  debtGroupStats: DebtGroupStat[];
  formatMoney: (val: number) => string;
}

export const DashboardPortfolioStructure: React.FC<DashboardPortfolioStructureProps> = ({
  cardBg,
  totalDebt,
  loanMethodStats,
  debtGroupStats,
  formatMoney,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cột 1: Dư nợ theo phương thức vay */}
      <div className={`${cardBg} p-4 sm:p-5 rounded-2xl border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs space-y-4`}>
        <div className="flex items-center justify-between pb-2 border-b border-line/50">
          <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <FileText className="w-3.5 h-3.5" />
            </span>
            <span className="uppercase tracking-wider">Dư nợ theo phương thức vay</span>
          </div>
          <span className="text-[11px] font-semibold text-ink-faint">
            {loanMethodStats.length} phương thức
          </span>
        </div>
        <div className="space-y-3">
          {loanMethodStats.map(item => {
            const percent = item.isGrantedLimit
              ? 0
              : (totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0);
            return (
              <div key={item.method} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                  <span className="min-w-0 truncate text-ink">
                    {item.method}{' '}
                    <span className="text-ink-faint text-[11px]">
                      ({item.count} {item.isGrantedLimit ? 'hợp đồng' : 'khoản'})
                    </span>
                    {item.isGrantedLimit && (
                      <span className="text-ink-faint text-[11px]"> · hạn mức cấp</span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-accent shrink-0 whitespace-nowrap">
                    {formatMoney(item.amount)}{' '}
                    {!item.isGrantedLimit && (
                      <span className="text-ink-faint font-normal text-[11px] ml-1">({percent.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
                <div className="w-full h-2 bg-panel-muted/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cột 2: Phân bổ dư nợ theo nhóm nợ */}
      <div className={`${cardBg} p-4 sm:p-5 rounded-2xl border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs space-y-4`}>
        <div className="flex items-center justify-between pb-2 border-b border-line/50">
          <div className="text-xs font-bold text-pos tracking-tight flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-pos-soft text-pos">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <span className="uppercase tracking-wider">Phân bổ dư nợ theo nhóm nợ</span>
          </div>
          <span className="text-[11px] font-semibold text-ink-faint">
            Phân loại CIC / Nội bộ
          </span>
        </div>
        <div className="space-y-3">
          {debtGroupStats.map(item => {
            const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
            const gradientClass = item.group === 1
              ? 'from-pos to-pos/70 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
              : item.group === 2
                ? 'from-warn to-warn/70 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : 'from-neg to-neg/70 shadow-[0_0_8px_rgba(248,113,113,0.3)]';
            const textClass = item.group === 1 ? 'text-pos' : item.group === 2 ? 'text-warn' : 'text-neg';
            const badgeBg = item.group === 1 ? 'bg-pos-soft text-pos' : item.group === 2 ? 'bg-warn-soft text-warn' : 'bg-neg-soft text-neg';

            return (
              <div key={item.group} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                  <span className="min-w-0 truncate flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
                      N{item.group}
                    </span>
                    <span className="text-ink font-semibold">Nhóm {item.group}</span>
                    <span className="text-ink-faint text-[11px]">({item.count} HĐ)</span>
                  </span>
                  <span className={`font-mono font-bold shrink-0 whitespace-nowrap ${textClass}`}>
                    {formatMoney(item.amount)}{' '}
                    <span className="text-ink-faint font-normal text-[11px] ml-1">({percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-panel-muted/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
