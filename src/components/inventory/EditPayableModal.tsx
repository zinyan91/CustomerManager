import React, { useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { computeReceivableItemRow, type ReceivableItem } from '../../lib/debt';
import { fmtMoney, parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface EditPayableModalProps {
  item: ReceivableItem;
  onSave: (updated: ReceivableItem) => void;
  onClose: () => void;
}

export const EditPayableModal: React.FC<EditPayableModalProps> = ({ item, onSave, onClose }) => {
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [begDebStr, setBegDebStr] = useState(item.beginningDebit ? formatMoneyInput(String(item.beginningDebit)) : '');
  const [begCredStr, setBegCredStr] = useState(item.beginningCredit ? formatMoneyInput(String(item.beginningCredit)) : '');
  const [occDebStr, setOccDebStr] = useState(item.occurredDebit ? formatMoneyInput(String(item.occurredDebit)) : '');
  const [occCredStr, setOccCredStr] = useState(item.occurredCredit ? formatMoneyInput(String(item.occurredCredit)) : '');

  const begDebit = parseMoneyDecimalInput(begDebStr);
  const begCredit = parseMoneyDecimalInput(begCredStr);
  const occDebit = parseMoneyDecimalInput(occDebStr);
  const occCredit = parseMoneyDecimalInput(occCredStr);

  const preview = computeReceivableItemRow({
    ...item,
    beginningDebit: begDebit,
    beginningCredit: begCredit,
    occurredDebit: occDebit,
    occurredCredit: occCredit,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...item,
      code: code.trim() || item.code,
      name: name.trim(),
      beginningDebit: begDebit,
      beginningCredit: begCredit,
      occurredDebit: occDebit,
      occurredCredit: occCredit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-xl border border-line-strong shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 text-xs`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="p-3.5 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-ink uppercase">SỬA NHÀ CUNG CẤP: {item.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Mã NCC</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`w-full p-2 rounded-lg font-mono font-bold ${UI.inputStyle}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block mb-1 ${UI.labelStyle}`}>Tên Nhà cung cấp / Đối tác *</label>
              <input
                type="text"
                value={name}
                required
                onChange={e => setName(e.target.value)}
                className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 text-ink-faint text-[11px] font-semibold`}>Dư NỢ đầu kỳ (VNĐ)</label>
              <input
                type="text"
                value={begDebStr}
                onChange={e => setBegDebStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-ink-faint text-[11px] font-semibold`}>Dư CÓ đầu kỳ (VNĐ)</label>
              <input
                type="text"
                value={begCredStr}
                onChange={e => setBegCredStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 text-pos text-[11px] font-bold`}>Phát sinh NỢ trong kỳ (Đã trả)</label>
              <input
                type="text"
                value={occDebStr}
                onChange={e => setOccDebStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-pos font-bold ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-warn text-[11px] font-bold`}>Phát sinh CÓ trong kỳ (Mua thêm)</label>
              <input
                type="text"
                value={occCredStr}
                onChange={e => setOccCredStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-warn font-bold ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-lg bg-accent-soft/40 border border-accent/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-ink-muted uppercase font-bold">DƯ NỢ CUỐI KỲ (ỨNG TRƯỚC)</div>
              <div className="font-mono font-bold text-ink text-sm mt-0.5">
                {fmtMoney(preview.endingDebit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-pos uppercase font-bold">DƯ CÓ CUỐI KỲ (PHẢI TRẢ)</div>
              <div className="font-mono font-bold text-pos text-sm mt-0.5">
                {fmtMoney(preview.endingCredit)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
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
