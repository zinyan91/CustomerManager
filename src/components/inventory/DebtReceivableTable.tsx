import React from 'react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import {
  computeReceivableItemRow,
  type ReceivableItem,
  type ReceivableSummary,
} from '../../lib/debt';
import { fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtReceivableTableProps {
  items: ReceivableItem[];
  allItemsCount: number;
  summary: ReceivableSummary;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (item: ReceivableItem) => void;
  onDelete: (id: string) => void;
}

export const DebtReceivableTable: React.FC<DebtReceivableTableProps> = ({
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
            placeholder="Tìm kiếm theo mã, tên khách hàng..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border ${UI.inputStyle}`}
          />
        </div>
        <div className="text-xs text-ink-faint font-medium">
          Hiển thị <span className="font-mono text-accent font-bold">{items.length}</span> / {allItemsCount} khách hàng
        </div>
      </div>

      <div data-workspace-panel className="overflow-x-auto max-h-[500px] overflow-y-auto border border-line/70 rounded-xl">
        <table className="w-full text-left text-xs border-collapse min-w-[900px] font-app">
          <thead className="sticky top-0 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80 z-10">
            <tr>
              <th className="px-3 py-2.5 text-center w-24" rowSpan={2}>MÃ KH</th>
              <th className="px-3 py-2.5 min-w-[200px]" rowSpan={2}>TÊN KHÁCH HÀNG</th>
              <th className="px-2 py-1.5 text-center border-l border-line/70" colSpan={2}>SỐ DƯ ĐẦU KỲ</th>
              <th className="px-2 py-1.5 text-center border-l border-line/70" colSpan={2}>PHÁT SINH TRONG KỲ</th>
              <th className="px-2 py-1.5 text-center border-l border-line/70 bg-pos-soft/30 text-pos font-bold" colSpan={2}>SỐ DƯ CUỐI KỲ</th>
              <th className="px-3 py-2.5 text-center w-20" rowSpan={2}>THAO TÁC</th>
            </tr>
            <tr className="border-t border-line/60">
              <th className="px-2 py-1.5 text-right border-l border-line/70 text-[9px]">NỢ (VND)</th>
              <th className="px-2 py-1.5 text-right text-[9px]">CÓ (VND)</th>
              <th className="px-2 py-1.5 text-right border-l border-line/70 text-[9px]">NỢ (VND)</th>
              <th className="px-2 py-1.5 text-right text-[9px]">CÓ (VND)</th>
              <th className="px-2 py-1.5 text-right border-l border-line/70 bg-pos-soft/30 text-pos font-bold text-[9px]">NỢ (VND)</th>
              <th className="px-2 py-1.5 text-right bg-pos-soft/30 text-pos font-bold text-[9px]">CÓ (VND)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40 font-mono">
            {items.map(rawItem => {
              const c = computeReceivableItemRow(rawItem);
              return (
                <tr
                  key={c.id}
                  onDoubleClick={() => onEdit(rawItem)}
                  className="hover:bg-accent/[0.04] transition-colors cursor-pointer group"
                  title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                >
                  <td className="px-3 py-2.5 text-center font-bold text-accent">{c.code}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink font-app">{c.name}</td>
                  <td className="px-3 py-2.5 text-right border-l border-line/60 text-ink">
                    {c.beginningDebit > 0 ? fmtNumber(c.beginningDebit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink">
                    {c.beginningCredit > 0 ? fmtNumber(c.beginningCredit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right border-l border-line/60 font-bold text-pos">
                    {c.occurredDebit > 0 ? fmtNumber(c.occurredDebit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-neg">
                    {c.occurredCredit > 0 ? fmtNumber(c.occurredCredit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-pos border-l border-line/60 bg-pos-soft/20">
                    {c.endingDebit > 0 ? fmtNumber(c.endingDebit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-pos bg-pos-soft/20">
                    {c.endingCredit > 0 ? fmtNumber(c.endingCredit) : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onEdit(rawItem);
                        }}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                        title="Sửa đối tác này"
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
                        title="Xóa đối tác này"
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
                <td colSpan={9} className="p-8 text-center text-ink-faint italic font-app">
                  Chưa có đối tác công nợ nào trong danh sách.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t-2 border-line/80 font-bold text-xs text-ink z-10">
            <tr>
              <td colSpan={2} className="px-3 py-2.5 uppercase tracking-wider text-[10px] text-ink-faint">
                TỔNG CỘNG ({allItemsCount} ĐỐI TÁC)
              </td>
              <td className="px-3 py-2.5 text-right border-l border-line/60 font-mono text-ink">{fmtNumber(summary.totalBeginningDebit)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-ink">{fmtNumber(summary.totalBeginningCredit)}</td>
              <td className="px-3 py-2.5 text-right border-l border-line/60 font-mono text-pos font-bold">{fmtNumber(summary.totalOccurredDebit)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-neg font-bold">{fmtNumber(summary.totalOccurredCredit)}</td>
              <td className="px-3 py-2.5 text-right border-l border-line/60 font-mono font-extrabold text-pos bg-pos-soft/30">{fmtNumber(summary.totalEndingDebit)}</td>
              <td className="px-3 py-2.5 text-right font-mono font-extrabold text-pos bg-pos-soft/30">{fmtNumber(summary.totalEndingCredit)}</td>
              <td className="px-3 py-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
