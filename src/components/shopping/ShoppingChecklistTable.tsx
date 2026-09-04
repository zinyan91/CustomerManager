import React from 'react';
import { Plus, Trash2, Library } from 'lucide-react';
import type { ShoppingItem, ShoppingRoom } from '../../lib/shoppingChecklist';
import { computeItemAmount, computeRoomTotal } from '../../lib/shoppingChecklist';
import { fmtNumber, parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { QuantityInput } from './QuantityInput';

interface ShoppingChecklistTableProps {
  floorId: string;
  room: ShoppingRoom;
  onAddItem: () => void;
  onOpenCatalogPicker: () => void;
  onUpdateItem: (itemId: string, patch: Partial<ShoppingItem>) => void;
  onRemoveItem: (itemId: string) => void;
}

export const ShoppingChecklistTable: React.FC<ShoppingChecklistTableProps> = ({
  floorId: _floorId,
  room,
  onAddItem,
  onOpenCatalogPicker,
  onUpdateItem,
  onRemoveItem,
}) => {
  const roomTotal = computeRoomTotal(room);

  return (
    <div className="space-y-2">
      {/* Action Bar within Room */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-ink-muted text-[11px]">
            Số lượng: <strong className="text-ink">{room.items.length}</strong> vật dụng
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenCatalogPicker}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-line text-ink font-semibold text-xs transition-colors cursor-pointer"
          >
            <Library className="w-3.5 h-3.5 text-accent" />
            <span>Chọn từ Kho</span>
          </button>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm dòng</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="rounded-xl border border-line/70 overflow-hidden bg-panel shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface/90 border-b border-line/70 text-[11px] font-bold text-ink-muted select-none">
                <th className="py-2.5 px-2 text-center w-10">STT</th>
                <th className="py-2.5 px-3 min-w-[220px]">HẠNG MỤC / TÊN VẬT PHẨM</th>
                <th className="py-2.5 px-2 text-center w-20">ĐVT</th>
                <th className="py-2.5 px-2 text-right w-20">SL</th>
                <th className="py-2.5 px-2 text-right w-32">ĐƠN GIÁ (VNĐ)</th>
                <th className="py-2.5 px-3 text-right w-36">THÀNH TIỀN (VNĐ)</th>
                <th className="py-2.5 px-3 min-w-[120px]">GHI CHÚ</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {room.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-faint">
                    Chưa có vật dụng nào trong khu vực này. Hãy bấm{' '}
                    <strong className="text-accent cursor-pointer" onClick={onAddItem}>
                      "Thêm dòng"
                    </strong>{' '}
                    hoặc{' '}
                    <strong className="text-accent cursor-pointer" onClick={onOpenCatalogPicker}>
                      "Chọn từ Kho"
                    </strong>
                    .
                  </td>
                </tr>
              ) : (
                room.items.map((item, idx) => {
                  const itemAmount = computeItemAmount(item);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface/50 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-1.5 px-2 text-center text-ink-faint font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.name}
                          placeholder="Nhập tên vật phẩm..."
                          onChange={e => onUpdateItem(item.id, { name: e.target.value })}
                          className={`w-full px-2 py-1.5 rounded-md font-semibold text-ink text-xs ${UI.inputStyle}`}
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={item.unit}
                          placeholder="Bộ/Cái"
                          onChange={e => onUpdateItem(item.id, { unit: e.target.value })}
                          className={`w-full px-1.5 py-1.5 rounded-md text-center text-xs ${UI.inputStyle}`}
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-1.5 px-1.5">
                        <QuantityInput
                          value={item.quantity}
                          onChange={val => onUpdateItem(item.id, { quantity: val })}
                          className={`w-full px-1.5 py-1.5 rounded-md text-right font-mono font-bold text-xs ${UI.inputStyle}`}
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={item.unitPrice ? formatMoneyInput(String(item.unitPrice)) : ''}
                          placeholder="0"
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = parseMoneyDecimalInput(e.target.value);
                            onUpdateItem(item.id, { unitPrice: val });
                          }}
                          className={`w-full px-2 py-1.5 rounded-md text-right font-mono text-xs ${UI.inputStyle}`}
                        />
                      </td>

                      {/* Total Amount */}
                      <td className="py-1.5 px-3 text-right">
                        <span className="font-bold font-mono text-accent text-xs">
                          {fmtNumber(itemAmount)}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.note || ''}
                          placeholder="Ghi chú..."
                          onChange={e => onUpdateItem(item.id, { note: e.target.value })}
                          className={`w-full px-2 py-1.5 rounded-md text-ink-muted text-xs ${UI.inputStyle}`}
                        />
                      </td>

                      {/* Remove Button */}
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 rounded text-ink-faint hover:text-neg hover:bg-neg/10 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {room.items.length > 0 && (
              <tfoot>
                <tr className="bg-surface/80 border-t border-line/70 font-bold">
                  <td colSpan={5} className="py-2.5 px-3 text-right text-ink-muted text-xs">
                    CỘNG KHU VỰC ({room.name}):
                  </td>
                  <td className="py-2.5 px-3 text-right text-accent font-mono text-xs">
                    {fmtNumber(roomTotal)} VNĐ
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
