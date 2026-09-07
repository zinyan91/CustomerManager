import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseHouseSpecific } from '../registry/templates/leaseHouse';
import { DateInput } from '../../DateInput';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LeaseHouseSpecificForm: React.FC<{
  common: DossierCommon; specific: LeaseHouseSpecific; patch: (p: Partial<LeaseHouseSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa chỉ nhà ở</label>
      <input className={INPUT} value={specific.location}
        onChange={e => patch({ location: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Số tầng</label>
      <input className={INPUT} value={specific.floors}
        onChange={e => patch({ floors: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Diện tích đất (m²)</label>
      <input className={INPUT} value={specific.landArea}
        onChange={e => patch({ landArea: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Diện tích nhà (m²)</label>
      <input className={INPUT} value={specific.houseArea}
        onChange={e => patch({ houseArea: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Ngày bàn giao</label>
      <DateInput value={specific.handoverDate} onChange={(iso) => patch({ handoverDate: iso })} className={INPUT} />
    </div>
    <div>
      <label className={LABEL}>Ngày thanh toán hàng tháng</label>
      <input className={INPUT} value={specific.paymentDay}
        onChange={e => patch({ paymentDay: e.target.value })} />
    </div>
  </div>
);
