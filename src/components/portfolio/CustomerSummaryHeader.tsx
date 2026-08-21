import React from 'react';
import { Plus, Landmark } from 'lucide-react';
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
    <div className={`${containerCardBg} rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs specular-card animate-in fade-in duration-150`}>
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-accent-soft text-accent shrink-0 shadow-2xs">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase text-ink-faint font-bold tracking-wider">
            {selectedMasterFilter === 'ALL' ? 'Tổng Mức Cấp (Tất cả)' : 'Mức Cấp HĐTD'}
          </div>
          <div className="text-accent font-mono font-bold text-base sm:text-lg">
            {fmtMoney(totalCreditLimit)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNewContract}
        disabled={!canDisburse}
        className={`flex items-center space-x-2 font-bold px-4 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-xs ${
          canDisburse
            ? 'bg-accent hover:opacity-90 text-accent-ink'
            : 'bg-panel-muted border border-line text-ink-faint cursor-not-allowed opacity-60'
        }`}
      >
        <Plus className="w-4 h-4" />
        <span>Giải ngân KUNN mới</span>
      </button>
    </div>
  );
};
