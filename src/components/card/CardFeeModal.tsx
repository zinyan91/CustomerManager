import React from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY } from '../../lib/uiClasses';
import { CARD_FEE_GROUPS } from '../../lib/cardFeeProfiles';
import { X, Save } from 'lucide-react';
import type { CardFeeProfile } from '../../lib/cardFeeProfiles';

interface CardFeeModalProps {
  isOpen: boolean;
  editingItem: CardFeeProfile | null;
  formData: {
    group: string;
    cardType: string;
    productMan: string;
    feeIntProfile: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    group: string;
    cardType: string;
    productMan: string;
    feeIntProfile: string;
  }>>;
  onSave: () => void;
  onClose: () => void;
}

export const CardFeeModal: React.FC<CardFeeModalProps> = ({
  isOpen,
  editingItem,
  formData,
  setFormData,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${PANEL} max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150`}>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-bold text-sm text-ink">
            {editingItem ? 'Sửa Mã Phí Thẻ' : 'Thêm Mã Phí Thẻ Mới'}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-ink">Nhóm phân loại thẻ *</label>
            <select
              value={formData.group}
              onChange={e => setFormData({ ...formData, group: e.target.value })}
              className={`w-full rounded-md p-2 border font-semibold ${UI.inputStyle}`}
            >
              {CARD_FEE_GROUPS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-ink">Loại thẻ / Sản phẩm *</label>
            <input
              type="text"
              placeholder="VD: Platinum Cashback..."
              value={formData.cardType}
              onChange={e => setFormData({ ...formData, cardType: e.target.value })}
              className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-ink">Product Man (Mã sản phẩm) *</label>
            <input
              type="text"
              placeholder="VD: CR_PLT_CB..."
              value={formData.productMan}
              onChange={e => setFormData({ ...formData, productMan: e.target.value })}
              className={`w-full rounded-md p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-ink">Fee Int Profile (Mã biểu phí) *</label>
            <input
              type="text"
              placeholder="VD: PROFILE_FEE_01..."
              value={formData.feeIntProfile}
              onChange={e => setFormData({ ...formData, feeIntProfile: e.target.value })}
              className={`w-full rounded-md p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className={`${BTN_SECONDARY} text-xs py-2 px-4`}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`${BTN_PRIMARY} text-xs py-2 px-4 flex items-center gap-1.5`}
          >
            <Save size={14} /> Lưu mã phí
          </button>
        </div>
      </div>
    </div>
  );
};
