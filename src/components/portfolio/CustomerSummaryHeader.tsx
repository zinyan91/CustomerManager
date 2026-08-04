import React from 'react';
import { User, Plus } from 'lucide-react';
import type { Customer, Collateral } from '../../types';
import { fmtMoney } from '../../lib/utils';

interface CustomerSummaryHeaderProps {
  foundCustomer: Customer;
  collaterals: Collateral[];
  isLight: boolean;
  containerCardBg: string;
  selectedMasterFilter: string;
  totalCreditLimit: number;
  totalKunnAmount: number;
  remainingCreditLimit: number;
  expiredLimitNote?: string | null;
  handleNewContract: () => void;
}

export const CustomerSummaryHeader: React.FC<CustomerSummaryHeaderProps> = ({
  foundCustomer,
  collaterals,
  isLight,
  containerCardBg,
  selectedMasterFilter,
  totalCreditLimit,
  totalKunnAmount,
  remainingCreditLimit,
  expiredLimitNote,
  handleNewContract,
}) => {
  return (
    <div className={`${containerCardBg} rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border`}>
      <div className="flex items-center space-x-3">
        <div className="bg-sky-600 rounded-full p-2.5 shadow-lg shadow-sky-600/30">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm flex items-center space-x-2">
            <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>{foundCustomer.FullName}</span>
            <span className="text-xs font-mono font-normal bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md">
              CIF: {foundCustomer.CifKh}
            </span>
          </div>
          <div className="text-[11px] flex flex-wrap items-center gap-3 mt-1 text-slate-500">
            {foundCustomer.CifKhlq && <span>CIF KHLQ: <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{foundCustomer.CifKhlq}</span></span>}
            {foundCustomer.Phone && <span>📞 {foundCustomer.Phone}</span>}
            <span>TSBĐ hiện có: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{collaterals.length} tài sản</span></span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className={`text-right pr-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">
            {selectedMasterFilter === 'ALL' ? 'Tổng Mức Cấp (Tất cả)' : 'Mức Cấp HĐTD'}
          </div>
          <div className="text-sky-600 dark:text-sky-400 font-bold text-sm">{fmtMoney(totalCreditLimit)}</div>
        </div>
        <div className={`text-right pr-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">
            {selectedMasterFilter === 'ALL' ? 'Tổng Dư Nợ KUNN' : 'Dư Nợ KUNN Thuộc HĐ'}
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{fmtMoney(totalKunnAmount)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">HMTD Còn Lại</div>
          <div className={`font-bold text-sm ${remainingCreditLimit === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {fmtMoney(remainingCreditLimit)}
          </div>
          {expiredLimitNote && (
            <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 max-w-[220px] leading-tight mt-0.5">
              ⚠️ {expiredLimitNote}
            </div>
          )}
        </div>
        <button onClick={handleNewContract}
          title="Tạo Hợp đồng Tín dụng / KUNN mới"
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs shadow-md shadow-emerald-600/20">
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo HĐTD mới</span>
        </button>
      </div>
    </div>
  );
};
