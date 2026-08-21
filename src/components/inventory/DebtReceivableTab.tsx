import React, { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import {
  computeReceivableSummary,
  type ReceivableItem,
} from '../../lib/debt';
import { EditReceivableModal } from './EditReceivableModal';
import { DebtSummaryCards } from './DebtSummaryCards';
import { DebtAddPartnerForm } from './DebtAddPartnerForm';
import { DebtReceivableTable } from './DebtReceivableTable';

interface DebtReceivableTabProps {
  receivables: ReceivableItem[];
  onChangeReceivables: (items: ReceivableItem[]) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const DebtReceivableTab: React.FC<DebtReceivableTabProps> = ({
  receivables,
  onChangeReceivables,
  showNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<ReceivableItem | null>(null);

  const handleAddItem = (item: ReceivableItem) => {
    onChangeReceivables([item, ...receivables]);
    showNotify('success', `Đã thêm khách hàng: ${item.name}`);
  };

  const updateItem = (id: string, patch: Partial<ReceivableItem>) => {
    onChangeReceivables(receivables.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChangeReceivables(receivables.filter(it => it.id !== id));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return receivables;
    const term = searchTerm.toLowerCase().trim();
    return receivables.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [receivables, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(receivables), [receivables]);

  return (
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-accent-soft rounded-2xl text-accent shadow-2xs">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
            BẢNG CÔNG NỢ PHẢI THU
          </h2>
          <p className="text-xs text-ink-faint font-medium">
            Theo dõi, phân tích và đối soát công nợ phải thu từ khách hàng mua hàng
          </p>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <DebtSummaryCards summary={summary} type="receivable" />

      {/* Form Add New Customer */}
      <DebtAddPartnerForm
        type="receivable"
        itemCount={receivables.length}
        onAdd={handleAddItem}
        onError={msg => showNotify('error', msg)}
      />

      {/* Main Table */}
      <DebtReceivableTable
        items={filteredItems}
        allItemsCount={receivables.length}
        summary={summary}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onEdit={setEditingItem}
        onDelete={removeItem}
      />

      {/* Edit Modal */}
      {editingItem && (
        <EditReceivableModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật khách hàng "${updated.name}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};
