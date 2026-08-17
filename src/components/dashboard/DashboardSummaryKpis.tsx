import React from 'react';
import { DollarSign, Users, Building2, AlertCircle } from 'lucide-react';
import { fmtNumber, fmtPercent } from '../../lib/utils';
import { KpiCard } from './KpiCard';

interface DashboardSummaryKpisProps {
  cardBg: string;
  totalDebt: number;
  totalLimit: number;
  totalCustomersCount: number;
  theConHieuLucCount: number;
  hanMucTheDaCap: number;
  totalCollateralVal: number;
  collateralsCount: number;
  weightedLtv: number;
  dueAlertsTotal: number;
  formatMoney: (val: number) => string;
}

export const DashboardSummaryKpis: React.FC<DashboardSummaryKpisProps> = ({
  cardBg,
  totalDebt,
  totalLimit,
  totalCustomersCount,
  theConHieuLucCount,
  hanMucTheDaCap,
  totalCollateralVal,
  collateralsCount,
  weightedLtv,
  dueAlertsTotal,
  formatMoney,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        cardBg={cardBg}
        tone="neutral"
        iconTone="accent"
        icon={Users}
        label="Tổng số khách hàng"
        value={fmtNumber(totalCustomersCount)}
        unit="khách hàng"
        note={`Thẻ tín dụng: ${theConHieuLucCount} (${formatMoney(hanMucTheDaCap)})`}
      />
      <KpiCard
        cardBg={cardBg}
        tone="neutral"
        iconTone="accent"
        icon={DollarSign}
        label="Tổng quy mô dư nợ"
        value={formatMoney(totalDebt)}
        note={`Tổng hạn mức cấp: ${formatMoney(totalLimit)}`}
      />
      <KpiCard
        cardBg={cardBg}
        tone="neutral"
        iconTone="accent"
        icon={Building2}
        label="Tổng giá trị TSĐB"
        value={formatMoney(totalCollateralVal)}
        note={
          <>
            LTV bình quân: <strong className="text-accent">{fmtPercent(weightedLtv > 1 ? weightedLtv / 100 : weightedLtv)}</strong> ({fmtNumber(collateralsCount)} TS)
          </>
        }
      />
      <KpiCard
        cardBg={cardBg}
        tone="neg"
        icon={AlertCircle}
        label="Cảnh báo tới hạn"
        value={fmtNumber(dueAlertsTotal)}
        unit="hạng mục"
        note="Cần theo dõi & xử lý ngay"
      />
    </div>
  );
};
