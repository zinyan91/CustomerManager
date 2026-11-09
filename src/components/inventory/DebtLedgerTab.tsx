import { useMemo, useState } from 'react';
import { Building2, Users } from 'lucide-react';
import { computeReceivableSummary, type ReceivableItem } from '../../lib/debt';
import type { DebtSortKey } from '../../lib/inventoryLedgerSort';
import type { SortState } from '../../lib/tableSort';
import { DebtSummaryCards } from './DebtSummaryCards';
import { DebtAddPartnerForm } from './DebtAddPartnerForm';
import { DebtLedgerTable, type DebtKind } from './DebtLedgerTable';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';

const HEADINGS: Record<DebtKind, { title: string; description: string; added: string }> = {
  receivable: {
    title: 'BẢNG CÔNG NỢ PHẢI THU',
    description: 'Theo dõi, phân tích và đối soát công nợ phải thu từ khách hàng mua hàng',
    added: 'Đã thêm khách hàng',
  },
  payable: {
    title: 'BẢNG CÔNG NỢ PHẢI TRẢ',
    description: 'Theo dõi và kiểm kê các khoản công nợ phải trả Nhà cung cấp / Đối tác kinh doanh',
    added: 'Đã thêm đối tác',
  },
};

interface DebtLedgerTabProps {
  kind: DebtKind;
  items: ReceivableItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (item: ReceivableItem) => void;
  onUpdate: (id: string, patch: Partial<ReceivableItem>) => void;
  onDelete: (id: string) => void;
  sort: SortState<DebtSortKey> | null;
  onSort: (key: DebtSortKey) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export function DebtLedgerTab({
  kind, items, loading, error, onRetry, onAdd, onUpdate, onDelete, sort, onSort, showNotify,
}: DebtLedgerTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const heading = HEADINGS[kind];
  const Icon = kind === 'payable' ? Building2 : Users;

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return items;
    return items.filter(it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(items), [items]);

  return (
    <div className="space-y-4 text-xs font-app">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-accent-soft rounded-2xl text-accent shadow-2xs">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-accent tracking-tight uppercase">{heading.title}</h2>
          <p className="text-xs text-ink-faint font-medium">{heading.description}</p>
        </div>
      </div>

      <DebtSummaryCards summary={summary} type={kind} />

      <DebtAddPartnerForm
        type={kind}
        itemCount={items.length}
        onAdd={item => {
          onAdd(item);
          showNotify('success', `${heading.added}: ${item.name}`);
        }}
        onError={msg => showNotify('error', msg)}
      />

      {error ? <ErrorState title="Không tải được công nợ đã lưu" message={error} onRetry={onRetry} />
        : loading ? <LoadingState text="Đang tải công nợ…" /> : (
      <DebtLedgerTable
        kind={kind}
        items={filteredItems}
        allItemsCount={items.length}
        summary={summary}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sort={sort}
        onSort={onSort}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      )}
    </div>
  );
}
