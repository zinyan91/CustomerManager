import React from 'react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import {
  computeRetailInvoiceItem,
  type RetailInvoiceItem,
  type RetailInvoiceSummary,
} from '../../lib/statement';
import { fmtMoney, fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface RetailInvoiceTableProps {
  items: RetailInvoiceItem[];
  allItemsCount: number;
  summary: RetailInvoiceSummary;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onEdit: (item: RetailInvoiceItem) => void;
  onDelete: (id: string) => void;
}

export const RetailInvoiceTable: React.FC<RetailInvoiceTableProps> = ({
  items,
  allItemsCount,
  summary,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
}) => {
  return (
    <div data-workspace-panel className={`${UI.containerCardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden font-app space-y-3 p-4 sm:p-5 animate-in fade-in duration-150`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Tìm kiếm mặt hàng..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border ${UI.inputStyle}`}
          />
        </div>
        <div className="text-xs text-ink-faint font-medium">
          Hiển thị <span className="font-mono text-accent font-bold">{items.length}</span> / {allItemsCount} mặt hàng
        </div>
      </div>

      <div data-workspace-panel className="overflow-x-auto max-h-[500px] overflow-y-auto border border-line/70 rounded-xl">
        <table className="w-full text-left text-xs border-collapse min-w-[700px] font-app">
          <thead className="sticky top-0 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80 z-10">
            <tr>
              <th className="px-3.5 py-3 text-center w-14">STT</th>
              <th className="px-3.5 py-3 min-w-[220px]">TÊN HÀNG HÓA / DỊCH VỤ</th>
              <th className="px-3.5 py-3 text-center w-24">ĐVT</th>
              <th className="px-3.5 py-3 text-right w-28">SỐ LƯỢNG</th>
              <th className="px-3.5 py-3 text-right w-36">ĐƠN GIÁ (VND)</th>
              <th className="px-3.5 py-3 text-right w-40 bg-pos-soft/30 text-pos font-bold">THÀNH TIỀN (VND)</th>
              <th className="px-3.5 py-3 text-center w-20">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40 font-mono">
            {items.map((rawItem, idx) => {
              const c = computeRetailInvoiceItem(rawItem);
              return (
                <tr
                  key={c.id}
                  onDoubleClick={() => onEdit(rawItem)}
                  className="hover:bg-accent/[0.04] transition-colors cursor-pointer group"
                  title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                >
                  <td className="px-3.5 py-3 text-center font-bold text-ink-muted">{idx + 1}</td>
                  <td className="px-3.5 py-3 font-semibold text-ink font-app">{c.itemName}</td>
                  <td className="px-3.5 py-3 text-center text-ink-muted">{c.unit}</td>
                  <td className="px-3.5 py-3 text-right font-bold text-ink">{fmtNumber(c.qty)}</td>
                  <td className="px-3.5 py-3 text-right font-bold text-accent">{fmtMoney(c.unitPrice)}</td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-pos bg-pos-soft/20">{fmtMoney(c.amount)}</td>
                  <td className="px-3.5 py-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onEdit(rawItem);
                        }}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                        title="Sửa mặt hàng này"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                        title="Xóa mặt hàng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-faint italic font-app">
                  Chưa có mặt hàng nào trong hóa đơn. Bấm nút <strong>"📥 Chọn từ Kho hàng"</strong> hoặc nhập vào form trên.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t-2 border-line/80 font-bold text-xs text-ink z-10">
            <tr>
              <td colSpan={3} className="px-3.5 py-3 uppercase tracking-wider text-[10px] text-ink-faint">
                TỔNG CỘNG ({allItemsCount} MẶT HÀNG)
              </td>
              <td className="px-3.5 py-3 text-right font-mono font-bold text-ink">{fmtNumber(summary.totalQty)}</td>
              <td className="px-3.5 py-3 text-right text-ink-faint text-[10px]">—</td>
              <td className="px-3.5 py-3 text-right font-mono font-extrabold text-pos text-sm bg-pos-soft/30">{fmtMoney(summary.totalAmount)}</td>
              <td className="px-3.5 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
