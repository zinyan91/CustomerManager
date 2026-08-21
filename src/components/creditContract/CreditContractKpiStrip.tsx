import React from 'react';
import { Landmark, FileText, Building2, ShieldCheck } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';

interface CreditContractKpiStripProps {
  totalGranted: number;
  activeContractCount: number;
  totalContractCount: number;
  tongKhaNangBaoDam: number;
  vuotKhaNangBaoDam: boolean;
}

export const CreditContractKpiStrip: React.FC<CreditContractKpiStripProps> = ({
  totalGranted,
  activeContractCount,
  totalContractCount,
  tongKhaNangBaoDam,
  vuotKhaNangBaoDam,
}) => {
  return (
    <div className="pt-3.5 border-t border-line/60 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150 font-app">
      {/* 1. Tổng hạn mức đã cấp */}
      <div className="p-3.5 rounded-xl bg-surface/70 border border-line/60 flex items-center space-x-3 shadow-2xs">
        <div className="p-2.5 rounded-xl bg-accent-soft text-accent shrink-0">
          <Landmark className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Hạn mức đã cấp</div>
          <div className="font-mono font-bold text-sm sm:text-base text-accent truncate">
            {fmtMoney(totalGranted)}
          </div>
        </div>
      </div>

      {/* 2. Quy mô HĐTD */}
      <div className="p-3.5 rounded-xl bg-surface/70 border border-line/60 flex items-center space-x-3 shadow-2xs">
        <div className="p-2.5 rounded-xl bg-pos-soft text-pos shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Quy mô HĐTD</div>
          <div className="font-mono font-bold text-sm sm:text-base text-ink truncate">
            {activeContractCount} <span className="text-xs font-normal text-ink-faint">mở / {totalContractCount} tổng</span>
          </div>
        </div>
      </div>

      {/* 3. Khả năng bảo đảm TSBĐ */}
      <div className="p-3.5 rounded-xl bg-surface/70 border border-line/60 flex items-center space-x-3 shadow-2xs">
        <div className="p-2.5 rounded-xl bg-warn-soft text-warn shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Khả năng bảo đảm</div>
          <div className="font-mono font-bold text-sm sm:text-base text-ink truncate">
            {fmtMoney(tongKhaNangBaoDam)}
          </div>
        </div>
      </div>

      {/* 4. Tỷ lệ bảo đảm */}
      <div className="p-3.5 rounded-xl bg-surface/70 border border-line/60 flex items-center space-x-3 shadow-2xs">
        <div className={`p-2.5 rounded-xl shrink-0 ${vuotKhaNangBaoDam ? 'bg-neg-soft text-neg' : 'bg-pos-soft text-pos'}`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Tỷ lệ bảo đảm</div>
          <div className={`font-mono font-bold text-sm sm:text-base truncate ${vuotKhaNangBaoDam ? 'text-neg' : 'text-pos'}`}>
            {totalGranted > 0 ? `${((tongKhaNangBaoDam / totalGranted) * 100).toFixed(0)}%` : '100%'}
            {vuotKhaNangBaoDam && <span className="text-[10px] font-normal text-neg ml-1">(Thiếu TSBĐ)</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
