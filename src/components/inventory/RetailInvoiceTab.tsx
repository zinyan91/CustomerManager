import React, { useState, useEffect, useMemo } from 'react';
import {
  computeRetailInvoiceSummary, nextInvoiceId,
  type RetailInvoiceItem, type RetailInvoiceHeader,
} from '../../lib/statement';
import {
  fetchRetailInvoicesDb, saveRetailInvoiceDb, deleteRetailInvoiceDb,
  type SavedRetailInvoice,
} from '../../lib/statementDb';
import { fetchInventoryItemsDb } from '../../lib/inventoryDb';
import type { InventoryItem } from '../../lib/inventory';
import { buildRetailInvoiceXlsx, buildRetailInvoiceDocHtml } from '../../lib/inventoryExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { todayIso, fmtDate } from '../../lib/utils';
import { InventoryItemPickerModal, type SelectedInventoryItemPayload } from './InventoryItemPickerModal';
import { EditRetailItemModal } from './EditRetailItemModal';
import { SavedInvoicesHistoryModal } from './SavedInvoicesHistoryModal';
import { RetailInvoiceHeaderCard } from './RetailInvoiceHeaderCard';
import { RetailInvoiceKpiCards } from './RetailInvoiceKpiCards';
import { RetailInvoiceAddItemForm } from './RetailInvoiceAddItemForm';
import { RetailInvoiceTable } from './RetailInvoiceTable';
import { useConfirm } from '../../context/ConfirmContext';

interface RetailInvoiceTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const RetailInvoiceTab: React.FC<RetailInvoiceTabProps> = ({ showNotify }) => {
  const confirm = useConfirm();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInventoryPickerOpen, setIsInventoryPickerOpen] = useState(false);

  const [headerInfo, setHeaderInfo] = useState<RetailInvoiceHeader>({
    buyerName: 'Chị Tâm',
    buyerAddress: 'Phường 1, Tây Ninh',
    shopName: 'SALON & SPA MINH THƯ',
    invoiceDateStr: fmtDate(todayIso()),
  });

  const [items, setItems] = useState<RetailInvoiceItem[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<SavedRetailInvoice[]>([]);
  const [currentInvId, setCurrentInvId] = useState<string>(() => nextInvoiceId());
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RetailInvoiceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Inventory items on mount
  useEffect(() => {
    fetchInventoryItemsDb().then(setInventoryItems);
  }, []);

  // Fetch saved invoices from Database on mount
  useEffect(() => {
    fetchRetailInvoicesDb().then(dbInvs => {
      if (dbInvs && dbInvs.length > 0) {
        setSavedInvoices(dbInvs);
      }
    });
  }, []);

  const handleSaveToDb = async () => {
    if (!headerInfo.buyerName.trim()) {
      showNotify('error', 'Vui lòng nhập tên Khách hàng.');
      return;
    }
    const invToSave: SavedRetailInvoice = {
      id: currentInvId,
      invoiceNo: currentInvId,
      invoiceDate: todayIso(),
      headerInfo,
      items,
    };
    await saveRetailInvoiceDb(invToSave);
    const updatedList = await fetchRetailInvoicesDb();
    setSavedInvoices(updatedList);
    showNotify('success', `Đã lưu Hóa đơn bán lẻ của "${headerInfo.buyerName}" vào CSDL thành công!`);
  };

  const handleLoadInvoice = (inv: SavedRetailInvoice) => {
    setCurrentInvId(inv.id);
    setHeaderInfo(inv.headerInfo);
    setItems(inv.items);
    setShowHistoryModal(false);
    showNotify('success', `Đã nạp Hóa đơn của "${inv.headerInfo.buyerName}" từ CSDL.`);
  };

  const handleDeleteInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Xóa Hóa đơn',
      message: 'Bạn có chắc chắn muốn xóa Hóa đơn này khỏi CSDL?',
      confirmText: 'Xóa Hóa đơn',
      tone: 'danger',
    });
    if (ok) {
      await deleteRetailInvoiceDb(id);
      const updatedList = await fetchRetailInvoicesDb();
      setSavedInvoices(updatedList);
      showNotify('success', 'Đã xóa Hóa đơn khỏi CSDL.');
    }
  };

  const handleAddFromInventory = (selected: SelectedInventoryItemPayload[]) => {
    const newInvItems: RetailInvoiceItem[] = selected.map(it => ({
      id: nextInvoiceId(),
      itemName: it.name,
      unit: it.unit || 'Cái',
      qty: it.qty,
      unitPrice: it.unitPrice,
    }));
    setItems(prev => [...newInvItems, ...prev]);
    showNotify('success', `Đã thêm ${selected.length} mặt hàng từ Kho vào Hóa đơn.`);
  };

  const handleClearAllItems = async () => {
    if (items.length === 0) return;
    const ok = await confirm({
      title: 'Xóa toàn bộ mặt hàng',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ mặt hàng trong hóa đơn hiện tại?',
      confirmText: 'Xóa toàn bộ',
      tone: 'danger',
    });
    if (ok) {
      setItems([]);
      showNotify('success', 'Đã xóa toàn bộ mặt hàng.');
    }
  };

  const handleAddItem = (item: RetailInvoiceItem) => {
    setItems(prev => [item, ...prev]);
    showNotify('success', `Đã thêm: ${item.itemName}`);
  };

  const updateItem = (id: string, patch: Partial<RetailInvoiceItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const summary = useMemo(() => computeRetailInvoiceSummary(items), [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter(it => it.itemName.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const handleExportExcel = () => {
    if (items.length === 0) {
      showNotify('error', 'Vui lòng thêm ít nhất một mặt hàng để xuất Excel.');
      return;
    }
    const bytes = buildRetailInvoiceXlsx(items, headerInfo);
    downloadBytes(bytes, `Hoa_Don_Ban_Le_${headerInfo.shopName.replace(/\s+/g, '_')}_${todayIso()}.xlsx`, MIME_XLSX);
    showNotify('success', 'Đã xuất file Excel Hóa đơn bán lẻ thành công!');
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showNotify('error', 'Vui lòng thêm ít nhất một mặt hàng để in.');
      return;
    }
    const html = buildRetailInvoiceDocHtml(items, headerInfo);
    printHtmlDoc(html, `Hoa_Don_${headerInfo.shopName}`);
  };

  return (
    <div className="space-y-4 font-app animate-in fade-in duration-150 text-xs">
      {/* Header Info & Action Bar */}
      <RetailInvoiceHeaderCard
        headerInfo={headerInfo}
        onChangeHeader={setHeaderInfo}
        itemsCount={items.length}
        onSaveToDb={handleSaveToDb}
        onOpenHistory={() => setShowHistoryModal(true)}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        onOpenInventoryPicker={() => {
          fetchInventoryItemsDb().then(setInventoryItems);
          setIsInventoryPickerOpen(true);
        }}
        onClearAllItems={handleClearAllItems}
      />

      {/* KPI Summary */}
      <RetailInvoiceKpiCards summary={summary} />

      {/* Add Item Form */}
      <RetailInvoiceAddItemForm
        inventoryItems={inventoryItems}
        onAdd={handleAddItem}
        onError={msg => showNotify('error', msg)}
      />

      {/* Main Table */}
      <RetailInvoiceTable
        items={filteredItems}
        allItemsCount={items.length}
        summary={summary}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onEdit={setEditingItem}
        onDelete={removeItem}
      />

      {/* Edit Modal */}
      {editingItem && (
        <EditRetailItemModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật mặt hàng "${updated.itemName}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Inventory Item Picker Modal */}
      <InventoryItemPickerModal
        isOpen={isInventoryPickerOpen}
        onClose={() => setIsInventoryPickerOpen(false)}
        onSelectItems={handleAddFromInventory}
        title="CHỌN MẶT HÀNG TỪ KHO VÀO HÓA ĐƠN BÁN LẺ"
        defaultQtyType="export"
      />

      {/* History Modal */}
      <SavedInvoicesHistoryModal
        isOpen={showHistoryModal}
        savedInvoices={savedInvoices}
        onClose={() => setShowHistoryModal(false)}
        onSelectInvoice={handleLoadInvoice}
        onDeleteInvoice={handleDeleteInvoice}
      />
    </div>
  );
};
