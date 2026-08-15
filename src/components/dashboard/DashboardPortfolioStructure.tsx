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
      <div className={`${cardBg} p-4 rounded-xl border border-line shadow-sm space-y-3`}>
        <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-1.5">
          <FileText className="w-4 h-4" />
          <span>DƯ NỢ THEO PHƯƠNG THỨC VAY</span>
        </div>
        <div className="space-y-2.5">
          {loanMethodStats.map(item => {
            const percent = item.isGrantedLimit
              ? 0
              : (totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0);
            return (
              <div key={item.method} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                  <span className="min-w-0 truncate">
                    {item.method}{' '}
                    <span className="text-ink-faint">
                      ({item.count} {item.isGrantedLimit ? 'hợp đồng' : 'khoản'})
                    </span>
                    {item.isGrantedLimit && (
                      <span className="text-ink-faint"> · hạn mức đã cấp</span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-accent shrink-0 whitespace-nowrap">
                    {formatMoney(item.amount)}{' '}
                    {!item.isGrantedLimit && (
                      <span className="text-ink-faint">{percent.toFixed(1)}%</span>
                    )}
                  </span>
                </div>
                <div className="w-full h-2 bg-panel-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cột 2: Phân bổ dư nợ theo nhóm nợ */}
      <div className={`${cardBg} p-4 rounded-xl border border-line shadow-sm space-y-3`}>
        <div className="text-xs font-bold text-pos tracking-tight flex items-center space-x-1.5">
          <ShieldAlert className="w-4 h-4" />
          <span>PHÂN BỔ DƯ NỢ THEO NHÓM NỢ</span>
        </div>
        <div className="space-y-2.5">
          {debtGroupStats.map(item => {
            const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
            const colorClass = item.group === 1 ? 'bg-pos' : item.group === 2 ? 'bg-warn' : 'bg-neg';
            const textClass = item.group === 1 ? 'text-pos ' : item.group === 2 ? 'text-warn ' : 'text-neg ';
            return (
              <div key={item.group} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                  <span className="min-w-0 truncate">
                    Nhóm {item.group} <span className="text-ink-faint">({item.count} HĐ)</span>
                  </span>
                  <span className={`font-mono font-bold shrink-0 whitespace-nowrap ${textClass}`}>
                    {formatMoney(item.amount)} <span className="text-ink-faint">{percent.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-panel-muted rounded-full overflow-hidden">
                  <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
