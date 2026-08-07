import React from 'react';
import { FileText } from 'lucide-react';
import type { LoanContract } from '../../types';

export interface MasterHdtdGroup {
  masterNo: string;
  contracts: LoanContract[];
  masterContract: LoanContract | null;
  totalCreditLimit: number;
  totalKunnDisbursed: number;
  remainingLimit: number;
}

interface MasterHdtdFilterTabsProps {
  masterHdtdGroups: MasterHdtdGroup[];
  selectedMasterFilter: string;
  setSelectedMasterFilter: (filter: string) => void;
  contractsCount: number;
}

export const MasterHdtdFilterTabs: React.FC<MasterHdtdFilterTabsProps> = ({
  masterHdtdGroups,
  selectedMasterFilter,
  setSelectedMasterFilter,
  contractsCount,
}) => {
  if (masterHdtdGroups.length === 0) return null;

  return (
    <div className="w-full border-t pt-3 mt-1 border-line flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-ink-faint uppercase tracking-wider flex items-center space-x-1">
          <FileText className="w-3.5 h-3.5 text-accent" />
          <span>LỌC KUNN THEO HĐTD ({masterHdtdGroups.length} HĐTD):</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMasterFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedMasterFilter === 'ALL'
                ? 'bg-accent text-accent-ink'
                : 'bg-panel-muted text-ink-muted hover:bg-panel-muted'
            }`}
          >
            Tất cả HĐTD ({contractsCount} KUNN)
          </button>
          {masterHdtdGroups.map(g => (
            <button
              key={g.masterNo}
              type="button"
              onClick={() => setSelectedMasterFilter(g.masterNo)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                selectedMasterFilter === g.masterNo
                  ? 'bg-accent text-accent-ink'
                  : 'bg-accent-soft text-accent hover:bg-accent-soft border border-accent/30'
              }`}
            >
              <span>{g.masterNo}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-app">
                {g.contracts.length} KUNN
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedMasterFilter !== 'ALL' && (
        <span className="text-[11px] italic text-accent font-medium">
          Đang xem gói HĐTD: <strong className="font-mono">{selectedMasterFilter}</strong>
        </span>
      )}
    </div>
  );
};
