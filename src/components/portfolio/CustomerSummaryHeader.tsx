import React from 'react';
import { Plus, Landmark } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';

interface CustomerSummaryHeaderProps {
  selectedMasterFilter: string;
  totalCreditLimit: number;
  outstanding: number;
  available: number;
  canDisburse?: boolean;
  handleNewContract: () => void;
  children?: React.ReactNode;
}

export const CustomerSummaryHeader: React.FC<CustomerSummaryHeaderProps> = ({
  selectedMasterFilter,
  totalCreditLimit,
  outstanding,
  available,
  canDisburse = true,
  handleNewContract,
  children,
}) => {
  return (
    <div data-workspace-panel className="p-4 border-b border-line bg-panel space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
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
          <div>
            <div className="text-[10px] uppercase text-ink-faint font-bold tracking-wider">Dư nợ hiện hành</div>
            <div className="text-pos font-mono font-bold text-base sm:text-lg">{fmtMoney(outstanding)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-ink-faint font-bold tracking-wider">Hạn mức khả dụng</div>
            <div className="text-ink font-mono font-bold text-base sm:text-lg">{fmtMoney(available)}</div>
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

      {children && (
        <div className="pt-3.5 border-t border-line/60">
          {children}
        </div>
      )}
    </div>
  );
};

