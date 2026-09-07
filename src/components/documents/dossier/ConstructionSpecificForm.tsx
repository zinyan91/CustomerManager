import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { ConstructionSpecific } from '../registry/templates/construction';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const ConstructionSpecificForm: React.FC<{
  common: DossierCommon; specific: ConstructionSpecific; patch: (p: Partial<ConstructionSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa chỉ công trình</label>
      <input className={INPUT} value={specific.siteAddress}
        onChange={e => patch({ siteAddress: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Tạm ứng đợt 1 (VNĐ)</label>
      <input className={INPUT} value={specific.depositStage1}
        onChange={e => patch({ depositStage1: formatMoneyInput(e.target.value) })} />
    </div>
    <div>
      <label className={LABEL}>Thanh toán đợt 2 (VNĐ)</label>
      <input className={INPUT} value={specific.stage2Amount}
        onChange={e => patch({ stage2Amount: formatMoneyInput(e.target.value) })} />
    </div>
    <div>
      <label className={LABEL}>Bảo hành (tháng)</label>
      <input className={INPUT} value={specific.warrantyMonths}
        onChange={e => patch({ warrantyMonths: e.target.value })} />
    </div>
  </div>
);
