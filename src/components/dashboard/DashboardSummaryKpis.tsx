import React from 'react';
import { DollarSign, Users, Building2, AlertCircle, CreditCard } from 'lucide-react';
import { fmtNumber, fmtPercent } from '../../lib/utils';
import { KpiCard } from './KpiCard';

interface DashboardSummaryKpisProps {
  cardBg: string;
  totalDebt: number;
  totalLimit: number;
  totalCustomersCount: number;
  customersWithDebtCount: number;
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
  customersWithDebtCount,
  theConHieuLucCount,
  hanMucTheDaCap,
  totalCollateralVal,
  collateralsCount,
  weightedLtv,
  dueAlertsTotal,
  formatMoney,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      <KpiCard
        cardBg={cardBg}
        hue="cust"
        icon={Users}
        label="Tổng số khách hàng"
        value={fmtNumber(totalCustomersCount)}
        unit="khách hàng"
        note={`Trong đó ${fmtNumber(customersWithDebtCount)} khách hàng có dư nợ`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="debt"
        icon={DollarSign}
        label="Tổng quy mô dư nợ"
        value={formatMoney(totalDebt)}
        note={`Tổng hạn mức cấp: ${formatMoney(totalLimit)}`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="collateral"
        icon={Building2}
        label="Tổng giá trị TSĐB"
        value={formatMoney(totalCollateralVal)}
        note={
          <>
            LTV bình quân: <strong className="text-[var(--kpi-hue)]">{fmtPercent(weightedLtv > 1 ? weightedLtv / 100 : weightedLtv)}</strong> ({fmtNumber(collateralsCount)} TS)
          </>
        }
      />
      <KpiCard
        cardBg={cardBg}
        hue="card"
        icon={CreditCard}
        label="Thẻ tín dụng"
        value={fmtNumber(theConHieuLucCount)}
        unit="thẻ"
        note={`Hạn mức đã cấp: ${formatMoney(hanMucTheDaCap)}`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="alert"
        icon={AlertCircle}
        label="Cảnh báo tới hạn"
        value={fmtNumber(dueAlertsTotal)}
        unit="hạng mục"
        note="Cần theo dõi & xử lý ngay"
      />
    </div>
  );
};
