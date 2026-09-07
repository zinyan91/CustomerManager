import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { SaleSpecific } from '../registry/templates/saleContract';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const SaleSpecificForm: React.FC<{
  common: DossierCommon; specific: SaleSpecific; patch: (p: Partial<SaleSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Phương thức thanh toán</label>
      <select className={INPUT} value={specific.payMethod}
        onChange={e => patch({ payMethod: e.target.value as 'cash' | 'transfer' })}>
        <option value="cash">Tiền mặt</option>
        <option value="transfer">Chuyển khoản</option>
      </select>
    </div>
    <div>
      <label className={LABEL}>Thanh toán đợt 1 (VNĐ)</label>
      <input className={INPUT} value={specific.paymentStage1}
        onChange={e => patch({ paymentStage1: formatMoneyInput(e.target.value) })} />
    </div>
  </div>
);
