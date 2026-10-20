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
  const custPercent = totalCustomersCount > 0 ? (customersWithDebtCount / totalCustomersCount) * 100 : 0;
  const debtPercent = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
  const ltvPercent = weightedLtv > 1 ? weightedLtv : weightedLtv * 100;
  const cardPercent = theConHieuLucCount > 0 ? 92 : 0;
  const alertPercent = dueAlertsTotal > 0 ? 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 2xl:gap-4">
      <KpiCard
        cardBg={cardBg}
        hue="cust"
        icon={Users}
        label="Tổng số khách hàng"
        value={fmtNumber(totalCustomersCount)}
        unit="khách hàng"
        progress={custPercent}
        note={`Trong đó ${fmtNumber(customersWithDebtCount)} khách hàng có dư nợ (${custPercent.toFixed(1)}%)`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="debt"
        icon={DollarSign}
        label="Tổng quy mô dư nợ"
        value={formatMoney(totalDebt)}
        progress={debtPercent}
        note={`Tổng hạn mức cấp: ${formatMoney(totalLimit)} (${debtPercent.toFixed(1)}%)`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="collateral"
        icon={Building2}
        label="Tổng giá trị TSĐB"
        value={formatMoney(totalCollateralVal)}
        progress={ltvPercent}
        note={
          <>
            LTV bình quân: <strong className="text-[var(--kpi-hue)] font-bold">{fmtPercent(weightedLtv > 1 ? weightedLtv / 100 : weightedLtv)}</strong> ({fmtNumber(collateralsCount)} TS)
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
        progress={cardPercent}
        note={`Hạn mức đã cấp: ${formatMoney(hanMucTheDaCap)}`}
      />
      <KpiCard
        cardBg={cardBg}
        hue="alert"
        icon={AlertCircle}
        label="Cảnh báo tới hạn"
        value={fmtNumber(dueAlertsTotal)}
        unit="hạng mục"
        progress={alertPercent}
        note="Cần theo dõi & xử lý ngay"
      />
    </div>
  );
};
