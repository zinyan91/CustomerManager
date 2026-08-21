import React, { useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import type { RetailInvoiceItem } from '../../lib/statement';
import { fmtMoney, formatMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface EditRetailItemModalProps {
  item: RetailInvoiceItem;
  onSave: (updated: RetailInvoiceItem) => void;
  onClose: () => void;
}

export const EditRetailItemModal: React.FC<EditRetailItemModalProps> = ({ item, onSave, onClose }) => {
  const [itemName, setItemName] = useState(item.itemName);
  const [unit, setUnit] = useState(item.unit);
  const [qtyStr, setQtyStr] = useState(item.qty ? formatMoneyInput(String(item.qty)) : '');
  const [priceStr, setPriceStr] = useState(item.unitPrice ? formatMoneyInput(String(item.unitPrice)) : '');

  const qty = parseMoneyDecimalInput(qtyStr);
  const unitPrice = parseMoneyDecimalInput(priceStr);
  const amount = qty * unitPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    onSave({
      ...item,
      itemName: itemName.trim(),
      unit: unit.trim() || 'Lần',
      qty,
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-2xl border border-line-strong shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-app`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="p-3.5 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-ink uppercase">SỬA MẶT HÀNG HÓA ĐƠN</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Tên hàng hóa / dịch vụ *</label>
            <input
              type="text"
              value={itemName}
              required
              onChange={e => setItemName(e.target.value)}
              className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn vị tính</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className={`w-full p-2 rounded-lg text-center ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Số lượng</label>
              <input
                type="text"
                value={qtyStr}
                onChange={e => setQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn giá (VND)</label>
              <input
                type="text"
                value={priceStr}
                onChange={e => setPriceStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Thành tiền preview */}
          <div className="p-3 rounded-lg bg-pos-soft/30 border border-pos/30 flex items-center justify-between">
            <span className="text-[11px] text-pos font-bold uppercase">THÀNH TIỀN DỰ TÍNH</span>
            <span className="font-mono font-extrabold text-pos text-base">{fmtMoney(amount)}</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-line text-ink-muted hover:bg-panel-muted text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
