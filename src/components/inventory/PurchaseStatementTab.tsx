import React, { useState, useEffect, useMemo } from 'react';
import {
  computeStatementSummary, nextStatementId,
  type StatementItem, type StatementSellerInfo,
} from '../../lib/statement';
import {
  fetchPurchaseStatementsDb, savePurchaseStatementDb, deletePurchaseStatementDb,
  type SavedPurchaseStatement,
} from '../../lib/statementDb';
import { fetchInventoryItemsDb } from '../../lib/inventoryDb';
import type { InventoryItem } from '../../lib/inventory';
import { buildPurchaseStatementXlsx, buildPurchaseStatementDocHtml } from '../../lib/inventoryExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { todayIso } from '../../lib/utils';
import { InventoryItemPickerModal, type SelectedInventoryItemPayload } from './InventoryItemPickerModal';
import { EditPurchaseItemModal } from './EditPurchaseItemModal';
import { SavedStatementsHistoryModal } from './SavedStatementsHistoryModal';
import { PurchaseStatementSellerCard } from './PurchaseStatementSellerCard';
import { PurchaseStatementKpiCards } from './PurchaseStatementKpiCards';
import { PurchaseStatementAddItemForm } from './PurchaseStatementAddItemForm';
import { PurchaseStatementTable } from './PurchaseStatementTable';
import { useConfirm } from '../../context/ConfirmContext';
import { fetchCustomersAPI } from '../../lib/api';
import type { Customer } from '../../types';

interface PurchaseStatementTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const PurchaseStatementTab: React.FC<PurchaseStatementTabProps> = ({ showNotify }) => {
  const confirm = useConfirm();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInventoryPickerOpen, setIsInventoryPickerOpen] = useState(false);

  const [sellerInfo, setSellerInfo] = useState<StatementSellerInfo>({
    sellerName: 'LÊ THỊ HOÀNG ÂN',
    sellerAddress: 'TP.HCM',
    sellerBankAcc: 'STK: 9975639612 - Ngân hàng Techcombank CN HCM',
    sellerIdCard: '080166012861',
    buyerName: 'NGUYỄN THÙY DUNG',
    buyerIdCard: '051188004003',
    statementDateStr: todayIso(),
  });

  const [items, setItems] = useState<StatementItem[]>([]);
  const [savedStatements, setSavedStatements] = useState<SavedPurchaseStatement[]>([]);
  const [currentStmtId, setCurrentStmtId] = useState<string>(() => nextStatementId());
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<StatementItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Fetch Customers on mount
  useEffect(() => {
    fetchCustomersAPI().then(setCustomers);
  }, []);

  // Fetch Inventory items on mount
  useEffect(() => {
    fetchInventoryItemsDb().then(setInventoryItems);
  }, []);

  // Fetch saved statements from Database on mount
  useEffect(() => {
    fetchPurchaseStatementsDb().then(dbStmts => {
      if (dbStmts && dbStmts.length > 0) {
        setSavedStatements(dbStmts);
      }
    });
  }, []);

  const handleSaveToDb = async () => {
    if (!sellerInfo.sellerName.trim()) {
      showNotify('error', 'Vui lòng nhập tên Bên bán hàng.');
      return;
    }
    const stmtToSave: SavedPurchaseStatement = {
      id: currentStmtId,
      sellerInfo,
      items,
      statementDate: sellerInfo.statementDateStr || todayIso(),
    };
    await savePurchaseStatementDb(stmtToSave);
    const updatedList = await fetchPurchaseStatementsDb();
    setSavedStatements(updatedList);
    showNotify('success', `Đã lưu Bảng kê mua bán của "${sellerInfo.sellerName}" vào CSDL thành công!`);
  };

  const handleLoadStatement = (stmt: SavedPurchaseStatement) => {
    setCurrentStmtId(stmt.id);
    setSellerInfo(stmt.sellerInfo);
    setItems(stmt.items);
    setShowHistoryModal(false);
    showNotify('success', `Đã nạp Bảng kê của "${stmt.sellerInfo.sellerName}" từ CSDL.`);
  };

  const handleDeleteStatement = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Xóa Bảng kê',
      message: 'Bạn có chắc chắn muốn xóa Bảng kê này khỏi CSDL?',
      confirmText: 'Xóa Bảng kê',
      tone: 'danger',
    });
    if (ok) {
      await deletePurchaseStatementDb(id);
      const updatedList = await fetchPurchaseStatementsDb();
      setSavedStatements(updatedList);
      showNotify('success', 'Đã xóa Bảng kê khỏi CSDL.');
    }
  };

  const handleAddFromInventory = (selected: SelectedInventoryItemPayload[]) => {
    const newStmtItems: StatementItem[] = selected.map(it => ({
      id: nextStatementId(),
      dateStr: sellerInfo.statementDateStr || todayIso(),
      itemName: it.name,
      unit: it.unit || 'Kg',
      qty: it.qty,
      unitPrice: it.unitPrice,
      note: '',
    }));
    setItems(prev => [...newStmtItems, ...prev]);
    showNotify('success', `Đã thêm ${selected.length} mặt hàng từ Kho vào Bảng kê.`);
  };

  const handleClearAllItems = async () => {
    if (items.length === 0) return;
    const ok = await confirm({
      title: 'Xóa toàn bộ mặt hàng',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ mặt hàng trong bảng kê hiện tại?',
      confirmText: 'Xóa toàn bộ',
      tone: 'danger',
    });
    if (ok) {
      setItems([]);
      showNotify('success', 'Đã xóa toàn bộ mặt hàng.');
    }
  };

  const handleAddItem = (item: StatementItem) => {
    setItems(prev => [item, ...prev]);
    showNotify('success', `Đã thêm: ${item.itemName}`);
  };

  const updateItem = (id: string, patch: Partial<StatementItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const summary = useMemo(() => computeStatementSummary(items), [items]);

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
    const bytes = buildPurchaseStatementXlsx(items, sellerInfo);
    downloadBytes(bytes, `Bang_Ke_Thu_Mua_${sellerInfo.sellerName.replace(/\s+/g, '_')}_${todayIso()}.xlsx`, MIME_XLSX);
    showNotify('success', 'Đã xuất file Excel Bảng kê thu mua thành công!');
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showNotify('error', 'Vui lòng thêm ít nhất một mặt hàng để in.');
      return;
    }
    const html = buildPurchaseStatementDocHtml(items, sellerInfo);
    printHtmlDoc(html, `Bang_Ke_${sellerInfo.sellerName}`);
  };

  return (
    <div className="space-y-4 font-app animate-in fade-in duration-150 text-xs">
      {/* Seller & Buyer Information Card */}
      <PurchaseStatementSellerCard
        sellerInfo={sellerInfo}
        onChangeSellerInfo={setSellerInfo}
        itemsCount={items.length}
        customers={customers}
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

      {/* KPI & Summary */}
      <PurchaseStatementKpiCards summary={summary} />

      {/* Form Add Item */}
      <PurchaseStatementAddItemForm
        inventoryItems={inventoryItems}
        defaultDateStr={sellerInfo.statementDateStr}
        onAdd={handleAddItem}
        onError={msg => showNotify('error', msg)}
      />

      {/* Main Table */}
      <PurchaseStatementTable
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
        <EditPurchaseItemModal
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
        title="CHỌN MẶT HÀNG TỪ KHO VÀO BẢNG KÊ MUA BÁN"
        defaultQtyType="import"
      />

      {/* History Modal */}
      <SavedStatementsHistoryModal
        isOpen={showHistoryModal}
        savedStatements={savedStatements}
        onClose={() => setShowHistoryModal(false)}
        onSelectStatement={handleLoadStatement}
        onDeleteStatement={handleDeleteStatement}
      />
    </div>
  );
};
