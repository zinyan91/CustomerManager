import React from 'react';
import { User, Plus } from 'lucide-react';
import type { Customer, Collateral } from '../../types';
import { fmtMoney } from '../../lib/utils';

interface CustomerSummaryHeaderProps {
  foundCustomer: Customer;
  collaterals: Collateral[];
  containerCardBg: string;
  selectedMasterFilter: string;
  totalCreditLimit: number;
  totalKunnAmount: number;
  remainingCreditLimit: number;
  expiredLimitNote?: string | null;
  canDisburse?: boolean;
  handleNewContract: () => void;
}

export const CustomerSummaryHeader: React.FC<CustomerSummaryHeaderProps> = ({
  foundCustomer,
  collaterals,
  containerCardBg,
  selectedMasterFilter,
  totalCreditLimit,
  totalKunnAmount,
  remainingCreditLimit,
  expiredLimitNote,
  canDisburse = true,
  handleNewContract,
}) => {
  return (
    <div className={`${containerCardBg} rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 border`}>
      <div className="flex items-center space-x-3">
        <div className="bg-accent rounded-full p-2.5 ">
          <User className="w-5 h-5 text-accent-ink" />
        </div>
        <div>
          <div className="font-bold text-sm flex items-center space-x-2">
            <span className={'text-ink'}>{foundCustomer.FullName}</span>
            <span className="text-xs font-mono font-normal bg-accent-soft text-accent border border-accent/30 px-2 py-0.5 rounded-md">
              CIF: {foundCustomer.CifKh}
            </span>
          </div>
          <div className="text-[11px] flex flex-wrap items-center gap-3 mt-1 text-ink-faint">
            {foundCustomer.CifKhlq && <span>CIF KHLQ: <span className="text-accent font-mono font-bold">{foundCustomer.CifKhlq}</span></span>}
            {foundCustomer.Phone && <span>📞 {foundCustomer.Phone}</span>}
            <span>TSBĐ hiện có: <span className="text-pos font-bold">{collaterals.length} tài sản</span></span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className={`text-right pr-4 border-r ${'border-line'}`}>
          <div className="text-[10px] uppercase text-ink-faint font-semibold">
            {selectedMasterFilter === 'ALL' ? 'Tổng Mức Cấp (Tất cả)' : 'Mức Cấp HĐTD'}
          </div>
          <div className="text-accent font-bold text-sm">{fmtMoney(totalCreditLimit)}</div>
        </div>
        <div className={`text-right pr-4 border-r ${'border-line'}`}>
          <div className="text-[10px] uppercase text-ink-faint font-semibold">
            {selectedMasterFilter === 'ALL' ? 'Tổng Dư Nợ KUNN' : 'Dư Nợ KUNN Thuộc HĐ'}
          </div>
          <div className="text-pos font-bold text-sm">{fmtMoney(totalKunnAmount)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-ink-faint font-semibold">HMTD Còn Lại</div>
          <div className={`font-bold text-sm ${remainingCreditLimit === 0 ? 'text-neg' : 'text-warn'}`}>
            {fmtMoney(remainingCreditLimit)}
          </div>
          {expiredLimitNote && (
            <div className="text-[10px] font-semibold text-neg max-w-[220px] leading-tight mt-0.5">
              ⚠️ {expiredLimitNote}
            </div>
          )}
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
    </div>
  );
};
