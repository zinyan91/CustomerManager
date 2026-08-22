import React from 'react';
import { Landmark } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';
import { KpiCard } from '../dashboard/KpiCard';

interface CreditContractSummaryCardsProps {
  totalGranted: number;
}

export const CreditContractSummaryCards: React.FC<CreditContractSummaryCardsProps> = ({
  totalGranted,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-150">
      <KpiCard
        hue="debt"
        icon={Landmark}
        label="Tổng hạn mức đã cấp"
        value={fmtMoney(totalGranted)}
      />
    </div>
  );
};
