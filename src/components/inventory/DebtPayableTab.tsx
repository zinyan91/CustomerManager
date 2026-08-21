import React, { useState, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import {
  computeReceivableSummary,
  type ReceivableItem,
} from '../../lib/debt';
import { EditPayableModal } from './EditPayableModal';
import { DebtSummaryCards } from './DebtSummaryCards';
import { DebtAddPartnerForm } from './DebtAddPartnerForm';
import { DebtPayableTable } from './DebtPayableTable';

interface DebtPayableTabProps {
  payables: ReceivableItem[];
  onChangePayables: (items: ReceivableItem[]) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const DebtPayableTab: React.FC<DebtPayableTabProps> = ({
  payables,
  onChangePayables,
  showNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<ReceivableItem | null>(null);

  const handleAddItem = (item: ReceivableItem) => {
    onChangePayables([item, ...payables]);
    showNotify('success', `Đã thêm đối tác: ${item.name}`);
  };

  const updateItem = (id: string, patch: Partial<ReceivableItem>) => {
    onChangePayables(payables.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChangePayables(payables.filter(it => it.id !== id));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return payables;
    const term = searchTerm.toLowerCase().trim();
    return payables.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [payables, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(payables), [payables]);

  return (
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-accent-soft rounded-2xl text-accent shadow-2xs">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
            BẢNG CÔNG NỢ PHẢI TRẢ
          </h2>
          <p className="text-xs text-ink-faint font-medium">
            Theo dõi và kiểm kê các khoản công nợ phải trả Nhà cung cấp / Đối tác kinh doanh
          </p>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <DebtSummaryCards summary={summary} type="payable" />

      {/* Form Add New Partner */}
      <DebtAddPartnerForm
        type="payable"
        itemCount={payables.length}
        onAdd={handleAddItem}
        onError={msg => showNotify('error', msg)}
      />

      {/* Main Table */}
      <DebtPayableTable
        items={filteredItems}
        allItemsCount={payables.length}
        summary={summary}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onEdit={setEditingItem}
        onDelete={removeItem}
      />

      {/* Edit Modal */}
      {editingItem && (
        <EditPayableModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật nhà cung cấp "${updated.name}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};
