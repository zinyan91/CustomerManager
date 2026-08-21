import React from 'react';
import { Plus } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';

interface CustomerSummaryHeaderProps {
  containerCardBg: string;
  selectedMasterFilter: string;
  totalCreditLimit: number;
  canDisburse?: boolean;
  handleNewContract: () => void;
}

export const CustomerSummaryHeader: React.FC<CustomerSummaryHeaderProps> = ({
  containerCardBg,
  selectedMasterFilter,
  totalCreditLimit,
  canDisburse = true,
  handleNewContract,
}) => {
  return (
    <div className={`${containerCardBg} rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-line shadow-sm`}>
      <div>
        <div className="text-[10px] uppercase text-ink-faint font-semibold">
          {selectedMasterFilter === 'ALL' ? 'Tổng Mức Cấp (Tất cả)' : 'Mức Cấp HĐTD'}
        </div>
        <div className="text-accent font-bold text-sm">{fmtMoney(totalCreditLimit)}</div>
      </div>

      <button onClick={handleNewContract}
        disabled={!canDisburse}
        className={`flex items-center space-x-1.5 font-bold px-4 py-2 rounded-md transition-colors text-xs ${canDisburse
          ? 'bg-accent hover:opacity-90 text-accent-ink '
          : 'bg-panel-muted text-ink-faint cursor-not-allowed'}`}>
        <Plus className="w-3.5 h-3.5" />
        <span>Giải ngân KUNN mới</span>
      </button>
    </div>
  );
};
