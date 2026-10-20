import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { StatementItem } from '../../lib/statement';
import { nextStatementId } from '../../lib/statement';
import type { InventoryItem } from '../../lib/inventory';
import { parseMoneyDecimalInput, formatMoneyInput, fmtMoney, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface PurchaseStatementAddItemFormProps {
  inventoryItems: InventoryItem[];
  defaultDateStr?: string;
  onAdd: (item: StatementItem) => void;
  onError: (msg: string) => void;
}

export const PurchaseStatementAddItemForm: React.FC<PurchaseStatementAddItemFormProps> = ({
  inventoryItems,
  defaultDateStr,
  onAdd,
  onError,
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newUnit, setNewUnit] = useState('Kg');
  const [newQtyStr, setNewQtyStr] = useState('');
  const [newPriceStr, setNewPriceStr] = useState('');

  const handleItemNameChange = (val: string) => {
    setNewItemName(val);
    const matched = inventoryItems.find(
      i => i.name.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (matched) {
      if (matched.unit) setNewUnit(matched.unit);
      if (matched.unitPrice) setNewPriceStr(formatMoneyInput(String(matched.unitPrice)));
      if (matched.exportQty > 0 && !newQtyStr) {
        setNewQtyStr(formatMoneyInput(String(matched.exportQty)));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      onError('Vui lòng nhập tên hàng hóa, dịch vụ.');
      return;
    }
    const item: StatementItem = {
      id: nextStatementId(),
      dateStr: defaultDateStr || todayIso(),
      itemName: newItemName.trim(),
      unit: newUnit.trim() || 'Kg',
      qty: parseMoneyDecimalInput(newQtyStr) || 1,
      unitPrice: parseMoneyDecimalInput(newPriceStr),
      note: '',
    };
    onAdd(item);
    setNewItemName('');
    setNewQtyStr('');
    setNewPriceStr('');
  };

  return (
    <form
      data-workspace-panel
      onSubmit={handleSubmit}
      className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3 font-app animate-in fade-in duration-150`}
    >
      <div className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-between border-b border-line/60 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-accent-soft text-accent shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span>Thêm mặt hàng mua bán</span>
        </div>
        <span className="text-[10px] text-ink-faint font-normal hidden sm:inline">
          (Gõ tên để tự động gợi ý giá & ĐVT từ Kho hàng)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        <div className="sm:col-span-2">
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            Tên hàng hóa / dịch vụ *
          </label>
          <input
            type="text"
            list="statement-inventory-datalist"
            placeholder="Tên hàng hóa / dịch vụ *"
            value={newItemName}
            onChange={e => handleItemNameChange(e.target.value)}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-bold text-ink`}
          />
          <datalist id="statement-inventory-datalist">
            {inventoryItems.map(it => (
              <option key={it.id} value={it.name}>
                {it.code} - {fmtMoney(it.unitPrice)}/{it.unit}
              </option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            ĐVT
          </label>
          <input
            type="text"
            placeholder="ĐVT (Kg, Chai, m2...)"
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} text-center`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            Số lượng
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Số lượng"
            value={newQtyStr}
            onChange={e => setNewQtyStr(formatMoneyInput(e.target.value))}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            Đơn giá (VND)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Đơn giá (VND)"
            value={newPriceStr}
            onChange={e => setNewPriceStr(formatMoneyInput(e.target.value))}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-accent/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm vào Bảng kê</span>
        </button>
      </div>
    </form>
  );
};
