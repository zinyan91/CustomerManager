import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseRoomSpecific } from '../registry/templates/leaseRoom';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LeaseRoomSpecificForm: React.FC<{
  common: DossierCommon; specific: LeaseRoomSpecific; patch: (p: Partial<LeaseRoomSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Phòng số</label>
      <input
        className={INPUT}
        placeholder="VD: 1, P.102..."
        value={specific.roomNo}
        onChange={e => patch({ roomNo: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Căn nhà số / Địa chỉ nhà</label>
      <input
        className={INPUT}
        placeholder="VD: 55/3 Tân Quý, P. Tân Sơn Nhì, TP. HCM"
        value={specific.houseNo}
        onChange={e => patch({ houseNo: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Địa chỉ ký kết hợp đồng (nếu khác căn nhà)</label>
      <input
        className={INPUT}
        placeholder="Để trống sẽ dùng địa chỉ căn nhà"
        value={specific.location}
        onChange={e => patch({ location: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Giá cho thuê (đồng/tháng)</label>
      <input
        className={INPUT}
        placeholder="VD: 4.000.000"
        value={specific.monthlyPrice}
        onChange={e => patch({ monthlyPrice: formatMoneyInput(e.target.value) })}
      />
    </div>
    <div>
      <label className={LABEL}>Thời hạn hợp đồng (tháng)</label>
      <input
        className={INPUT}
        placeholder="VD: 12"
        value={specific.termMonths}
        onChange={e => patch({ termMonths: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Mục đích cho thuê</label>
      <input
        className={INPUT}
        placeholder="VD: Ở"
        value={specific.purpose}
        onChange={e => patch({ purpose: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Điện thoại Bên A (Chủ nhà)</label>
      <input
        className={INPUT}
        placeholder="VD: 0982486251"
        value={specific.partyAPhone}
        onChange={e => patch({ partyAPhone: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Điện thoại Bên B (Người thuê)</label>
      <input
        className={INPUT}
        placeholder="VD: 0909xxxxxx"
        value={specific.partyBPhone}
        onChange={e => patch({ partyBPhone: e.target.value })}
      />
    </div>
    <div className="sm:col-span-2">
      <label className={LABEL}>Những người cùng thuê phòng (mỗi người 1 dòng)</label>
      <textarea
        rows={3}
        className={INPUT}
        placeholder={"VD:\n1. Nguyễn Văn A - CCCD: 0791...\n2. Trần Thị B - CCCD: 0792..."}
        value={specific.coTenants}
        onChange={e => patch({ coTenants: e.target.value })}
      />
    </div>
  </div>
);
