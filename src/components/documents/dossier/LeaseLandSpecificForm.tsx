import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseLandSpecific } from '../registry/templates/leaseLand';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const LeaseLandSpecificForm: React.FC<{
  common: DossierCommon;
  specific: LeaseLandSpecific;
  patch: (p: Partial<LeaseLandSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Số hợp đồng</label>
      <input
        className={INPUT}
        placeholder="VD: 01/HĐTĐ-2024"
        value={specific.contractNo}
        onChange={e => patch({ contractNo: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Diện tích khu đất (m²)</label>
      <input
        className={INPUT}
        placeholder="VD: 500"
        value={specific.landArea}
        onChange={e => patch({ landArea: e.target.value })}
      />
    </div>
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa chỉ khu đất cho thuê</label>
      <input
        className={INPUT}
        placeholder="VD: Thửa đất số 12, Tờ bản đồ số 4, Xã An Phú, Huyện Củ Chi, TP.HCM"
        value={specific.landAddress}
        onChange={e => patch({ landAddress: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Thời hạn thuê (năm)</label>
      <input
        className={INPUT}
        placeholder="VD: 5"
        value={specific.termYears}
        onChange={e => patch({ termYears: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Giá thuê đất (đồng/năm)</label>
      <input
        className={INPUT}
        placeholder="VD: 60.000.000"
        value={specific.rentPricePerYear}
        onChange={e => patch({ rentPricePerYear: formatMoneyInput(e.target.value) })}
      />
    </div>
    <div>
      <label className={LABEL}>Mục đích thuê đất</label>
      <input
        className={INPUT}
        placeholder="VD: Sản xuất nông nghiệp / mặt bằng kinh doanh"
        value={specific.purpose}
        onChange={e => patch({ purpose: e.target.value })}
      />
    </div>
    <div>
      <label className={LABEL}>Phương thức thanh toán</label>
      <input
        className={INPUT}
        placeholder="VD: Chuyển khoản hoặc tiền mặt hàng năm"
        value={specific.paymentMethod}
        onChange={e => patch({ paymentMethod: e.target.value })}
      />
    </div>
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa điểm ký kết hợp đồng</label>
      <input
        className={INPUT}
        placeholder="VD: Xã An Phú, Huyện Củ Chi, TP.HCM"
        value={specific.location}
        onChange={e => patch({ location: e.target.value })}
      />
    </div>
  </div>
);
