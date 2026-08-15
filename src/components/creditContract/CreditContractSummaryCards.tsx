import React from 'react';
import { UI } from '../../lib/uiClasses';
import { fmtMoney } from '../../lib/utils';
import type { Customer } from '../../types';

interface CreditContractSummaryCardsProps {
  customer: Customer;
  totalGranted: number;
  totalOutstanding: number;
  totalAvailable: number;
  openContractsCount: number;
  totalContractsCount: number;
}

export const CreditContractSummaryCards: React.FC<CreditContractSummaryCardsProps> = ({
  customer,
  totalGranted,
  totalOutstanding,
  totalAvailable,
  openContractsCount,
  totalContractsCount,
}) => {
  const containerCardBg = UI.containerCardBg;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-150">
      {/* 1. Khách hàng */}
      <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Khách hàng / Mã CIF</div>
        <div className="font-mono font-bold text-base text-accent">{customer.CifKh || '—'}</div>
        <div className="text-xs font-bold truncate text-ink" title={customer.FullName}>{customer.FullName}</div>
      </div>

      {/* 2. Tổng hạn mức cấp */}
      <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng hạn mức đã cấp</div>
        <div className="font-mono font-bold text-base text-ink">{fmtMoney(totalGranted)}</div>
        <div className="text-[11px] text-ink-faint font-semibold">
          {openContractsCount} HĐTD đang mở / {totalContractsCount} Tổng HĐ
        </div>
      </div>

      {/* 3. Dư nợ KUNN hiện hữu */}
      <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-warn" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Dư nợ KUNN hiện hữu</div>
        <div className="font-mono font-bold text-base text-warn">{fmtMoney(totalOutstanding)}</div>
        <div className="text-[11px] text-ink-faint">
          Tỷ lệ sử dụng: {totalGranted > 0 ? ((totalOutstanding / totalGranted) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>

      {/* 4. Hạn mức khả dụng */}
      <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-pos" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hạn mức khả dụng</div>
        <div className="font-mono font-bold text-base text-pos">{fmtMoney(totalAvailable)}</div>
        <div className="text-[11px] text-ink-faint">Sẵn sàng cấp/giải ngân KUNN mới</div>
      </div>
    </div>
  );
};
