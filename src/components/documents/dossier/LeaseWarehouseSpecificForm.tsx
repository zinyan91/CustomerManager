import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseWarehouseSpecific } from '../registry/templates/leaseWarehouse';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LeaseWarehouseSpecificForm: React.FC<{
  common: DossierCommon;
  specific: LeaseWarehouseSpecific;
  patch: (p: Partial<LeaseWarehouseSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Diện tích kho (m²)</label>
      <input
        className={INPUT}
        placeholder="VD: 65"
        value={specific.area}
        onChange={e => patch({ area: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Địa chỉ nhà kho</label>
      <input
        className={INPUT}
        placeholder="VD: Ấp 2, Xã Tiến Hưng, TP. Đồng Xoài, Bình Phước"
        value={specific.warehouseAddress}
        onChange={e => patch({ warehouseAddress: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Tiền thuê kho (đồng/tháng)</label>
      <input
        className={INPUT}
        placeholder="VD: 5.000.000"
        value={specific.monthlyPrice}
        onChange={e => patch({ monthlyPrice: formatMoneyInput(e.target.value) })}
      />
    </div>
    <div>
      <label className={LABEL}>Ngày thanh toán hàng tháng</label>
      <input
        className={INPUT}
        placeholder="VD: 25"
        value={specific.paymentDay}
        onChange={e => patch({ paymentDay: e.target.value })}
      />
    </div>
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa điểm ký hợp đồng</label>
      <input
        className={INPUT}
        placeholder="VD: TP.HCM hoặc Bình Phước"
        value={specific.signPlace}
        onChange={e => patch({ signPlace: e.target.value })}
      />
    </div>
  </div>
);
