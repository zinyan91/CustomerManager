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
    <div className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider flex items-center space-x-1.5 mr-1">
          <FileText className="w-3.5 h-3.5 text-accent" />
          <span>Lọc theo HĐTD ({masterHdtdGroups.length}):</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMasterFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              selectedMasterFilter === 'ALL'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'bg-surface/80 border border-line/70 text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            Tất cả HĐTD ({contractsCount} KUNN)
          </button>
          {masterHdtdGroups.map(g => (
            <button
              key={g.masterNo}
              type="button"
              onClick={() => setSelectedMasterFilter(g.masterNo)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
                selectedMasterFilter === g.masterNo
                  ? 'bg-accent text-accent-ink shadow-xs'
                  : 'bg-surface/80 text-accent hover:bg-surface border border-accent/30'
              }`}
            >
              <span>{g.masterNo}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-app ${
                selectedMasterFilter === g.masterNo ? 'bg-black/20 text-accent-ink' : 'bg-accent-soft text-accent'
              }`}>
                {g.contracts.length} KUNN
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedMasterFilter !== 'ALL' && (
        <span className="text-[11px] text-accent font-medium flex items-center gap-1">
          <span>Đang xem:</span>
          <strong className="font-mono bg-accent-soft px-2 py-0.5 rounded-md border border-accent/20">{selectedMasterFilter}</strong>
        </span>
      )}
    </div>
  );
};
