import React from 'react';
import { User, Landmark, Wallet, CircleDollarSign } from 'lucide-react';
import { UI } from '../../lib/uiClasses';
import { fmtMoney } from '../../lib/utils';
import { KpiCard } from '../dashboard/KpiCard';
import type { Customer } from '../../types';

interface CreditContractSummaryCardsProps {
  customer: Customer;
  totalGranted: number;
  totalOutstanding: number;
  totalAvailable: number;
}

export const CreditContractSummaryCards: React.FC<CreditContractSummaryCardsProps> = ({
  customer,
  totalGranted,
  totalOutstanding,
  totalAvailable,
}) => {
  const cardBg = UI.containerCardBg;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-150">
      <KpiCard
        cardBg={cardBg}
        hue="cust"
        icon={User}
        label="Khách hàng / Mã CIF"
        value={customer.CifKh || '—'}
        note={customer.FullName}
      />
      <KpiCard
        cardBg={cardBg}
        hue="debt"
        icon={Landmark}
        label="Tổng hạn mức đã cấp"
        value={fmtMoney(totalGranted)}
      />
      <KpiCard
        cardBg={cardBg}
        hue="collateral"
        icon={Wallet}
        label="Dư nợ KUNN hiện hữu"
        value={fmtMoney(totalOutstanding)}
      />
      <KpiCard
        cardBg={cardBg}
        hue={totalAvailable <= 0 ? 'alert' : 'card'}
        icon={CircleDollarSign}
        label="Hạn mức khả dụng"
        value={fmtMoney(totalAvailable)}
      />
    </div>
  );
};
