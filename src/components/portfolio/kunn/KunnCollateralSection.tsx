import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { fmtMoney } from '../../../lib/utils';
import type { Collateral } from '../../../types';
import { collateralValue } from '../../../lib/collateralMath';

export interface KunnCollateralSectionProps {
  sectionBoxBg: string;
  selectedCollaterals: Collateral[];
  maxAllowedLoanLtv: number;
}

export const KunnCollateralSection: React.FC<KunnCollateralSectionProps> = ({
  sectionBoxBg,
  selectedCollaterals,
  maxAllowedLoanLtv,
}) => (
  <div className={`rounded-md p-3 border text-[11px] ${sectionBoxBg}`}>
    <div className="flex items-center space-x-2 text-[11px] font-bold text-pos uppercase tracking-wider mb-1.5">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>TÀI SẢN BẢO ĐẢM</span>
    </div>
    {selectedCollaterals.length === 0 ? (
      <div className="text-ink-faint italic">
        HĐTD chưa gán TSBĐ. Gán ở tab Hợp Đồng Tín Dụng.
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
        {selectedCollaterals.map(col => (
          <span key={col.Id}>
            {col.AssetCode || `TS-${col.Id}`}
            <span className="text-ink-faint"> · {fmtMoney(collateralValue(col))}</span>
          </span>
        ))}
        <span className="text-ink-faint">
          Khả năng bảo đảm tối đa: <strong className="text-pos">{fmtMoney(maxAllowedLoanLtv)}</strong>
        </span>
      </div>
    )}
  </div>
);
