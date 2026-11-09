import { Trash2 } from 'lucide-react';
import { computeItemRow, type InventoryItem, type InventorySummary } from '../../lib/inventory';
import type { InventorySortKey } from '../../lib/inventoryLedgerSort';
import type { SortState } from '../../lib/tableSort';
import { fmtMoney, fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { SortableHeader } from './SortableHeader';
import { InlineNumberInput, InlineTextInput } from './InlineEditCell';

interface InventoryItemsTableProps {
  items: InventoryItem[];
  summary: InventorySummary;
  sort: SortState<InventorySortKey> | null;
  onSort: (key: InventorySortKey) => void;
  onUpdate: (id: string, patch: Partial<InventoryItem>) => void;
  onRemove: (id: string) => void;
}

const COLUMNS: { key: InventorySortKey; label: string; align: 'left' | 'center' | 'right'; className: string }[] = [
  { key: 'code', label: 'MÃ SP', align: 'left', className: 'w-24' },
  { key: 'name', label: 'TÊN MẶT HÀNG / SẢN PHẨM', align: 'left', className: 'min-w-[200px]' },
  { key: 'unit', label: 'ĐVT', align: 'center', className: 'w-20' },
  { key: 'unitPrice', label: 'ĐƠN GIÁ (VNĐ)', align: 'right', className: 'w-32' },
  { key: 'beginningQty', label: 'TỒN ĐẦU KỲ', align: 'right', className: 'w-28' },
  { key: 'importQty', label: 'NHẬP TRONG KỲ', align: 'right', className: 'w-28' },
  { key: 'exportQty', label: 'XUẤT TRONG KỲ', align: 'right', className: 'w-28' },
  { key: 'endingQty', label: 'TỒN CUỐI KỲ', align: 'right', className: 'w-28 bg-accent-soft text-accent' },
  { key: 'endingValue', label: 'THÀNH TIỀN (VNĐ)', align: 'right', className: 'w-36 bg-accent-soft text-accent' },
];

export function InventoryItemsTable({ items, summary, sort, onSort, onUpdate, onRemove }: InventoryItemsTableProps) {
  return (
    <div data-workspace-panel className="border border-line rounded-xl overflow-hidden bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className={UI.tableHeaderStyle}>
            <tr>
              <th className="p-2.5 text-center w-12">STT</th>
              {COLUMNS.map(col => (
                <SortableHeader key={col.key} label={col.label} sortKey={col.key} sort={sort} onSort={onSort}
                  align={col.align} className={col.className} />
              ))}
              <th className="p-2.5 text-center w-14">XÓA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-ink-faint italic font-app">
                  Chưa có sản phẩm nào trong nhóm kiểm kê này. Vui lòng chọn Mẫu Ngành hàng hoặc Thêm sản phẩm mới ở trên.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const row = computeItemRow(it);
                const patch = (p: Partial<InventoryItem>) => onUpdate(it.id, p);
                return (
                  <tr key={it.id} className="hover:bg-panel-muted/50">
                    <td className="px-2 py-1 text-center text-ink-faint">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <InlineTextInput label={`Mã SP dòng ${idx + 1}`} value={it.code} required
                        onCommit={code => patch({ code })} className="font-mono font-bold text-accent" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineTextInput label={`Tên mặt hàng dòng ${idx + 1}`} value={it.name} required
                        onCommit={name => patch({ name })} className="font-semibold text-ink" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineTextInput label={`ĐVT dòng ${idx + 1}`} value={it.unit}
                        onCommit={unit => patch({ unit: unit || 'Cái' })} className="text-center text-ink-muted" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineNumberInput label={`Đơn giá dòng ${idx + 1}`} value={it.unitPrice}
                        onCommit={unitPrice => patch({ unitPrice })} className="font-bold text-ink" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineNumberInput label={`Tồn đầu kỳ dòng ${idx + 1}`} value={it.beginningQty}
                        onCommit={beginningQty => patch({ beginningQty })} className="text-ink" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineNumberInput label={`Nhập trong kỳ dòng ${idx + 1}`} value={it.importQty}
                        onCommit={importQty => patch({ importQty })} className="font-bold text-pos" />
                    </td>
                    <td className="px-1 py-1">
                      <InlineNumberInput label={`Xuất trong kỳ dòng ${idx + 1}`} value={it.exportQty}
                        onCommit={exportQty => patch({ exportQty })} className="font-bold text-warn" />
                    </td>
                    <td className="px-2.5 py-1 text-right font-mono tabular-nums font-bold text-accent bg-accent-soft/30">
                      {fmtNumber(row.endingQty)}
                    </td>
                    <td className="px-2.5 py-1 text-right font-mono tabular-nums font-black text-pos bg-pos-soft/30">
                      {fmtNumber(row.endingValue)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onRemove(it.id)}
                        aria-label={`Xóa ${it.name}`}
                        className="p-1 rounded-md text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="border-t-2 border-line bg-panel-muted font-bold text-xs">
            <tr>
              <td colSpan={5} className="p-3 text-right font-app text-ink">TỔNG CỘNG HÀNG TỒN KHO:</td>
              <td className="p-3 text-right font-mono">{fmtNumber(summary.totalBeginningQty)}</td>
              <td className="p-3 text-right font-mono text-pos">{fmtNumber(summary.totalImportQty)}</td>
              <td className="p-3 text-right font-mono text-warn">{fmtNumber(summary.totalExportQty)}</td>
              <td className="p-3 text-right font-mono text-accent bg-accent-soft">{fmtNumber(summary.totalEndingQty)}</td>
              <td className="p-3 text-right font-mono text-pos bg-accent-soft text-sm">{fmtMoney(summary.totalEndingValue)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
