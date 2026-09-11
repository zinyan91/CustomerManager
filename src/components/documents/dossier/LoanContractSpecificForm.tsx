import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LoanContractSpecific } from '../registry/templates/loanContract';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LoanContractSpecificForm: React.FC<{
  common: DossierCommon;
  specific: LoanContractSpecific;
  patch: (p: Partial<LoanContractSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Số tiền vay (đồng)</label>
      <input
        className={INPUT}
        placeholder="VD: 50.000.000"
        value={specific.loanAmount}
        onChange={e => patch({ loanAmount: formatMoneyInput(e.target.value) })}
      />
    </div>
    <div>
      <label className={LABEL}>Mục đích vay</label>
      <input
        className={INPUT}
        placeholder="VD: Tiêu dùng cá nhân"
        value={specific.loanPurpose}
        onChange={e => patch({ loanPurpose: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Phương thức thanh toán/hoàn trả</label>
      <input
        className={INPUT}
        placeholder="VD: Chuyển khoản hoặc tiền mặt"
        value={specific.paymentMethod}
        onChange={e => patch({ paymentMethod: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Địa điểm lập hợp đồng</label>
      <input
        className={INPUT}
        placeholder="VD: TP. Hà Nội, TP.HCM..."
        value={specific.location}
        onChange={e => patch({ location: e.target.value })}
      />
    </div>
  </div>
);
