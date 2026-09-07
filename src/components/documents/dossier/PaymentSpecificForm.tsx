import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { PaymentSpecific } from '../registry/templates/paymentRequestSale';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const PaymentSpecificForm: React.FC<{
  common: DossierCommon; specific: PaymentSpecific; patch: (p: Partial<PaymentSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={LABEL}>Hình thức</label>
        <select className={INPUT} value={specific.payMethodType}
          onChange={e => patch({ payMethodType: e.target.value as 'cash' | 'transfer' })}>
          <option value="transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </div>
      <div>
        <label className={LABEL}>Xưng hô người nhận</label>
        <select className={INPUT} value={specific.recipientTitle}
          onChange={e => patch({ recipientTitle: e.target.value as 'Ông' | 'Bà' })}>
          <option value="Ông">Ông</option>
          <option value="Bà">Bà</option>
        </select>
      </div>
    </div>
    {specific.payMethodType === 'cash' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Họ tên (nhận tiền mặt)</label>
          <input className={INPUT} value={specific.cashName}
            onChange={e => patch({ cashName: e.target.value })} /></div>
        <div><label className={LABEL}>CCCD</label>
          <input className={INPUT} value={specific.cashCccd}
            onChange={e => patch({ cashCccd: e.target.value })} /></div>
        <div><label className={LABEL}>Ngày cấp</label>
          <input className={INPUT} value={specific.cashCccdDate}
            onChange={e => patch({ cashCccdDate: e.target.value })} /></div>
        <div><label className={LABEL}>Nơi cấp</label>
          <input className={INPUT} value={specific.cashCccdPlace}
            onChange={e => patch({ cashCccdPlace: e.target.value })} /></div>
      </div>
    )}
  </div>
);
