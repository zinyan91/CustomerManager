import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseMbSpecific } from '../registry/templates/leaseMb';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LeaseMbSpecificForm: React.FC<{
  common: DossierCommon; specific: LeaseMbSpecific; patch: (p: Partial<LeaseMbSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa chỉ mặt bằng</label>
      <input className={INPUT} value={specific.location}
        onChange={e => patch({ location: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Giá thuê / tháng (VNĐ)</label>
      <input className={INPUT} value={specific.monthlyPrice}
        onChange={e => patch({ monthlyPrice: formatMoneyInput(e.target.value) })} />
    </div>
    <div>
      <label className={LABEL}>Tiền đặt cọc (VNĐ)</label>
      <input className={INPUT} value={specific.depositAmount}
        onChange={e => patch({ depositAmount: formatMoneyInput(e.target.value) })} />
    </div>
  </div>
);
