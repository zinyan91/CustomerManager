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
  isLight: boolean;
  masterHdtdGroups: MasterHdtdGroup[];
  selectedMasterFilter: string;
  setSelectedMasterFilter: (filter: string) => void;
  contractsCount: number;
}

export const MasterHdtdFilterTabs: React.FC<MasterHdtdFilterTabsProps> = ({
  isLight,
  masterHdtdGroups,
  selectedMasterFilter,
  setSelectedMasterFilter,
  contractsCount,
}) => {
  if (masterHdtdGroups.length === 0) return null;

  return (
    <div className="w-full border-t pt-3 mt-1 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
          <FileText className="w-3.5 h-3.5 text-purple-500" />
          <span>LỌC KUNN THEO HĐTD ({masterHdtdGroups.length} HĐTD):</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMasterFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedMasterFilter === 'ALL'
                ? 'bg-sky-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📊 Tất cả HĐTD ({contractsCount} KUNN)
          </button>
          {masterHdtdGroups.map(g => (
            <button
              key={g.masterNo}
              type="button"
              onClick={() => setSelectedMasterFilter(g.masterNo)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                selectedMasterFilter === g.masterNo
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isLight
                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/40 border border-purple-800'
              }`}
            >
              <span>📜 {g.masterNo}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-sans">
                {g.contracts.length} KUNN
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedMasterFilter !== 'ALL' && (
        <span className="text-[11px] italic text-purple-600 dark:text-purple-400 font-medium">
          ⚡ Đang xem gói HĐTD: <strong className="font-mono">{selectedMasterFilter}</strong>
        </span>
      )}
    </div>
  );
};
