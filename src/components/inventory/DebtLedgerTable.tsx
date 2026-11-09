import { Search, Trash2 } from 'lucide-react';
import { computeReceivableItemRow, type ReceivableItem, type ReceivableSummary } from '../../lib/debt';
import type { DebtSortKey } from '../../lib/inventoryLedgerSort';
import type { SortState } from '../../lib/tableSort';
import { fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { SortableHeader } from './SortableHeader';
import { InlineNumberInput, InlineTextInput } from './InlineEditCell';

export type DebtKind = 'receivable' | 'payable';

const DEBT_TABLE_LABELS: Record<DebtKind, { code: string; name: string; party: string; search: string }> = {
  receivable: { code: 'MÃ KH', name: 'TÊN KHÁCH HÀNG', party: 'khách hàng', search: 'Tìm kiếm theo mã, tên khách hàng...' },
  payable: { code: 'MÃ NCC', name: 'TÊN NHÀ CUNG CẤP / ĐỐI TÁC', party: 'đối tác', search: 'Tìm theo Mã hoặc Tên đối tác...' },
};

const AMOUNT_COLUMNS: { key: Exclude<DebtSortKey, 'code' | 'name'>; label: string; group: boolean; editable: boolean }[] = [
  { key: 'beginningDebit', label: 'NỢ (VND)', group: true, editable: true },
  { key: 'beginningCredit', label: 'CÓ (VND)', group: false, editable: true },
  { key: 'occurredDebit', label: 'NỢ (VND)', group: true, editable: true },
  { key: 'occurredCredit', label: 'CÓ (VND)', group: false, editable: true },
  { key: 'endingDebit', label: 'NỢ (VND)', group: true, editable: false },
  { key: 'endingCredit', label: 'CÓ (VND)', group: false, editable: false },
];

const FIELD_NAMES: Record<string, string> = {
  beginningDebit: 'Nợ đầu kỳ', beginningCredit: 'Có đầu kỳ', occurredDebit: 'Nợ phát sinh', occurredCredit: 'Có phát sinh',
};

interface DebtLedgerTableProps {
  kind: DebtKind;
  items: ReceivableItem[];
  allItemsCount: number;
  summary: ReceivableSummary;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sort: SortState<DebtSortKey> | null;
  onSort: (key: DebtSortKey) => void;
  onUpdate: (id: string, patch: Partial<ReceivableItem>) => void;
  onDelete: (id: string) => void;
}

export function DebtLedgerTable({
  kind, items, allItemsCount, summary, searchTerm, onSearchChange, sort, onSort, onUpdate, onDelete,
}: DebtLedgerTableProps) {
  const labels = DEBT_TABLE_LABELS[kind];
  const totals: Record<string, number> = {
    beginningDebit: summary.totalBeginningDebit, beginningCredit: summary.totalBeginningCredit,
    occurredDebit: summary.totalOccurredDebit, occurredCredit: summary.totalOccurredCredit,
    endingDebit: summary.totalEndingDebit, endingCredit: summary.totalEndingCredit,
  };
  return (
    <div data-workspace-panel className={`${UI.containerCardBg} rounded-2xl border border-line/65 bg-panel/85 shadow-xs overflow-hidden font-app space-y-3 p-4 sm:p-5`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder={labels.search}
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border ${UI.inputStyle}`}
          />
        </div>
        <div className="text-xs text-ink-faint font-medium">
          Hiển thị <span className="font-mono text-accent font-bold">{items.length}</span> / {allItemsCount} {labels.party}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-line/70 rounded-xl">
        <table className="w-full text-left text-xs border-collapse min-w-[960px] font-app">
          <thead className="sticky top-0 bg-surface text-[10px] font-bold text-ink-faint border-b border-line/80 z-10">
            <tr>
              <SortableHeader label={labels.code} sortKey="code" sort={sort} onSort={onSort} rowSpan={2} className="w-28" />
              <SortableHeader label={labels.name} sortKey="name" sort={sort} onSort={onSort} rowSpan={2} className="min-w-[220px]" />
              <th className="px-2 py-1.5 text-center border-l border-line/70" colSpan={2}>SỐ DƯ ĐẦU KỲ</th>
              <th className="px-2 py-1.5 text-center border-l border-line/70" colSpan={2}>PHÁT SINH TRONG KỲ</th>
              <th className="px-2 py-1.5 text-center border-l border-line/70 bg-pos-soft/30 text-pos" colSpan={2}>SỐ DƯ CUỐI KỲ</th>
              <th className="px-3 py-2.5 text-center w-14" rowSpan={2}>XÓA</th>
            </tr>
            <tr className="border-t border-line/60">
              {AMOUNT_COLUMNS.map(col => (
                <SortableHeader key={col.key} label={col.label} sortKey={col.key} sort={sort} onSort={onSort} align="right"
                  className={`w-32 text-[9px] ${col.group ? 'border-l border-line/70' : ''} ${col.editable ? '' : 'bg-pos-soft/30 text-pos'}`} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {items.map((raw, idx) => {
              const c = computeReceivableItemRow(raw);
              return (
                <tr key={c.id} className="hover:bg-accent/[0.04]">
                  <td className="px-1 py-1">
                    <InlineTextInput label={`${labels.code} dòng ${idx + 1}`} value={raw.code} required
                      onCommit={code => onUpdate(raw.id, { code })} className="text-center font-mono font-bold text-accent" />
                  </td>
                  <td className="px-1 py-1">
                    <InlineTextInput label={`${labels.name} dòng ${idx + 1}`} value={raw.name} required
                      onCommit={name => onUpdate(raw.id, { name })} className="font-semibold text-ink" />
                  </td>
                  {AMOUNT_COLUMNS.map(col => (
                    <td key={col.key} className={`${col.group ? 'border-l border-line/60' : ''} ${col.editable ? 'px-1 py-1' : 'px-3 py-1 text-right font-mono tabular-nums font-bold text-pos bg-pos-soft/20'}`}>
                      {col.editable ? (
                        <InlineNumberInput label={`${FIELD_NAMES[col.key]} dòng ${idx + 1}`} value={c[col.key]}
                          onCommit={value => onUpdate(raw.id, { [col.key]: value })} className="text-ink" />
                      ) : (
                        c[col.key] > 0 ? fmtNumber(c[col.key]) : '0'
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label={`Xóa ${c.name}`}
                      className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-ink-faint italic font-app">
                  Chưa có {labels.party} công nợ nào trong danh sách.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface border-t-2 border-line/80 font-bold text-xs text-ink z-10">
            <tr>
              <td colSpan={2} className="px-3 py-2.5 text-ink-muted">
                TỔNG CỘNG ({allItemsCount} {labels.party})
              </td>
              {AMOUNT_COLUMNS.map(col => (
                <td key={col.key} className={`px-3 py-2.5 text-right font-mono tabular-nums ${col.group ? 'border-l border-line/60' : ''} ${col.editable ? '' : 'text-pos bg-pos-soft/30'}`}>
                  {fmtNumber(totals[col.key])}
                </td>
              ))}
              <td className="px-3 py-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
