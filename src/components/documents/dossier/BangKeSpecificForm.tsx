import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { BangKeSpecific } from '../registry/templates/bangKe';

export const BangKeSpecificForm: React.FC<{
  common: DossierCommon;
  specific: BangKeSpecific;
  patch: (p: Partial<BangKeSpecific>) => void;
}> = ({ specific, patch }) => {
  const method = specific?.paymentMethod || 'transfer';

  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
          Hình thức nhận thanh toán của Bên bán
        </label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs">
            <input
              type="radio"
              name="bangKePayMethod"
              checked={method === 'cash'}
              onChange={() => patch({ paymentMethod: 'cash' })}
              className="accent-accent"
            />
            <span>💵 Tiền mặt</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs">
            <input
              type="radio"
              name="bangKePayMethod"
              checked={method === 'transfer'}
              onChange={() => patch({ paymentMethod: 'transfer' })}
              className="accent-accent"
            />
            <span>🏦 Chuyển khoản</span>
          </label>
        </div>
      </div>

      {method === 'cash' ? (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
          <span className="font-bold uppercase text-[10px] block text-amber-600 dark:text-amber-400 mb-0.5">
            Thông tin thanh toán hiển thị trên chứng từ:
          </span>
          Chứng từ sẽ thể hiện số CMND/CCCD của Bên bán (hoặc &quot;Tiền mặt&quot;) thay vì thông tin số tài khoản ngân hàng.
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-accent-soft/30 border border-accent/20 text-ink text-xs leading-relaxed">
          <span className="font-bold uppercase text-[10px] block text-accent mb-0.5">
            Thông tin chuyển khoản hiển thị trên chứng từ:
          </span>
          Tự động lấy theo mục <strong>Tài khoản ngân hàng</strong> ở Thông tin chung (STK, Ngân hàng, Chủ tài khoản, Chi nhánh).
        </div>
      )}
    </div>
  );
};
