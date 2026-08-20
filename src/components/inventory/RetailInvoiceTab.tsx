import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Plus, Trash2, Download, Printer, Search, Save, History,
  Pencil, X, Package,
} from 'lucide-react';
import {
  computeRetailInvoiceItem, computeRetailInvoiceSummary, nextInvoiceId,
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
import { fmtMoney, fmtNumber, formatMoneyInput, parseMoneyDecimalInput, todayIso, fmtDate } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { InventoryItemPickerModal, type SelectedInventoryItemPayload } from './InventoryItemPickerModal';

interface RetailInvoiceTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

const EditRetailItemModal: React.FC<{
  item: RetailInvoiceItem;
  onSave: (updated: RetailInvoiceItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [itemName, setItemName] = useState(item.itemName);
  const [unit, setUnit] = useState(item.unit);
  const [qtyStr, setQtyStr] = useState(item.qty ? formatMoneyInput(String(item.qty)) : '');
  const [priceStr, setPriceStr] = useState(item.unitPrice ? formatMoneyInput(String(item.unitPrice)) : '');

  const qty = parseMoneyDecimalInput(qtyStr);
  const unitPrice = parseMoneyDecimalInput(priceStr);
  const amount = qty * unitPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    onSave({
      ...item,
      itemName: itemName.trim(),
      unit: unit.trim() || 'Lần',
      qty,
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-xl border border-line-strong shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 text-xs`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="p-3.5 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-ink uppercase">SỬA MẶT HÀNG HÓA ĐƠN</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Tên hàng hóa / dịch vụ *</label>
            <input
              type="text"
              value={itemName}
              required
              onChange={e => setItemName(e.target.value)}
              className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn vị tính</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className={`w-full p-2 rounded-lg text-center ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Số lượng</label>
              <input
                type="text"
                value={qtyStr}
                onChange={e => setQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right font-bold ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn giá (VNĐ)</label>
              <input
                type="text"
                value={priceStr}
                onChange={e => setPriceStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right font-bold text-accent ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-lg bg-pos-soft/50 border border-pos/30 flex items-center justify-between">
            <div className="text-[10px] text-pos uppercase font-bold">THÀNH TIỀN DỰ TÍNH</div>
            <div className="font-mono font-black text-pos text-base">
              {fmtMoney(amount)}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-line text-ink-muted hover:bg-panel-muted text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const RetailInvoiceTab: React.FC<RetailInvoiceTabProps> = ({ showNotify }) => {
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
  const [newItemName, setNewItemName] = useState('');
  const [newUnit, setNewUnit] = useState('Cái');
  const [newQtyStr, setNewQtyStr] = useState('');
  const [newPriceStr, setNewPriceStr] = useState('');

  // Fetch Inventory items on mount & when picker opens
  useEffect(() => {
    fetchInventoryItemsDb().then(invs => {
      setInventoryItems(invs);
    });
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
    if (window.confirm('Bạn có chắc chắn muốn xóa Hóa đơn này khỏi CSDL?')) {
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

  const handleClearAllItems = () => {
    if (items.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ mặt hàng trong hóa đơn hiện tại?')) {
      setItems([]);
      showNotify('success', 'Đã xóa toàn bộ mặt hàng.');
    }
  };

  const handleItemNameChange = (val: string) => {
    setNewItemName(val);
    const matched = inventoryItems.find(
      i => i.name.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (matched) {
      if (matched.unit) setNewUnit(matched.unit);
      if (matched.unitPrice) setNewPriceStr(formatMoneyInput(String(matched.unitPrice)));
      if (matched.exportQty > 0 && !newQtyStr) {
        setNewQtyStr(formatMoneyInput(String(matched.exportQty)));
      }
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showNotify('error', 'Vui lòng nhập tên hàng hóa, dịch vụ.');
      return;
    }
    const item: RetailInvoiceItem = {
      id: nextInvoiceId(),
      itemName: newItemName.trim(),
      unit: newUnit.trim() || 'Cái',
      qty: parseMoneyDecimalInput(newQtyStr) || 1,
      unitPrice: parseMoneyDecimalInput(newPriceStr),
    };
    setItems(prev => [item, ...prev]);
    setNewItemName('');
    setNewQtyStr('');
    setNewPriceStr('');
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
    return items.filter(
      it => it.itemName.toLowerCase().includes(term)
    );
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
    <div className="space-y-4">
      {/* Header Info & Actions */}
      <div className={`${UI.containerCardBg} rounded-xl p-4 border space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-accent-soft rounded-lg text-accent">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
                HÓA ĐƠN BÁN LẺ
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={handleSaveToDb}
              title="Lưu chứng từ Hóa đơn vào CSDL Supabase"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu CSDL</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              title="Xem danh sách các Hóa đơn đã lưu trong CSDL"
              className="bg-panel-muted hover:bg-line text-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 border border-line transition-colors relative cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-panel-muted hover:bg-line text-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 border border-line transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / PDF</span>
            </button>
          </div>
        </div>

        {/* Invoice Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-md border border-line bg-panel-muted">
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Tên Cửa hàng / Tiệm</label>
            <input
              type="text"
              value={headerInfo.shopName}
              onChange={e => setHeaderInfo({ ...headerInfo, shopName: e.target.value })}
              placeholder="VD: SALON & SPA MINH THƯ"
              className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-bold`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Họ tên người mua hàng</label>
            <input
              type="text"
              value={headerInfo.buyerName}
              onChange={e => setHeaderInfo({ ...headerInfo, buyerName: e.target.value })}
              placeholder="VD: Chị Tâm"
              className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-bold`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Địa chỉ mua hàng</label>
            <input
              type="text"
              value={headerInfo.buyerAddress}
              onChange={e => setHeaderInfo({ ...headerInfo, buyerAddress: e.target.value })}
              placeholder="VD: Phường 1, Tây Ninh"
              className={`w-full rounded p-2 text-xs border ${UI.inputStyle}`}
            />
          </div>
        </div>

        {/* Action Button: Nạp từ Kho hàng */}
        <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchInventoryItemsDb().then(setInventoryItems);
                setIsInventoryPickerOpen(true);
              }}
              className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>📥 Chọn từ Kho hàng</span>
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllItems}
                className="bg-panel hover:bg-neg-soft text-neg text-xs px-2.5 py-1.5 rounded-md font-semibold flex items-center space-x-1 border border-line hover:border-neg transition-colors cursor-pointer"
                title="Xóa toàn bộ mặt hàng trong hóa đơn"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa hết mặt hàng</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">MẶT HÀNG TRÊN HÓA ĐƠN</div>
          <div className="text-xl font-extrabold text-accent mt-0.5 font-mono">
            {fmtNumber(summary.totalItems)} <span className="text-xs font-normal text-ink-faint">sản phẩm/dịch vụ</span>
          </div>
        </div>
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG SỐ LƯỢNG SẢN PHẨM</div>
          <div className="text-xl font-extrabold text-ink mt-0.5 font-mono">
            {fmtNumber(summary.totalQty)}
          </div>
        </div>
        <div className="rounded-lg p-3 border border-pos/40 bg-pos-soft">
          <div className="text-[10px] font-black text-pos uppercase tracking-wide">TỔNG CỘNG HÓA ĐƠN</div>
          <div className="text-xl font-black text-pos mt-0.5 font-mono">
            {fmtMoney(summary.totalAmount)}
          </div>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Plus className="w-4 h-4" />
            <span>Thêm mặt hàng / dịch vụ vào hóa đơn</span>
          </div>
          <span className="text-[10px] text-ink-faint font-normal">
            (Gõ tên để tự động gợi ý giá & ĐVT từ Kho hàng)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input
            type="text"
            list="retail-inventory-datalist"
            placeholder="Tên hàng hóa, dịch vụ *"
            value={newItemName}
            onChange={e => handleItemNameChange(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} sm:col-span-2`}
          />
          <datalist id="retail-inventory-datalist">
            {inventoryItems.map(it => (
              <option key={it.id} value={it.name}>
                {it.code} - {fmtMoney(it.unitPrice)}/{it.unit}
              </option>
            ))}
          </datalist>

          <input
            type="text"
            placeholder="ĐVT (Cái, Hộp...)"
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle}`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Số lượng"
            value={newQtyStr}
            onChange={e => setNewQtyStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Đơn giá (VND)"
            value={newPriceStr}
            onChange={e => setNewPriceStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-4 py-1.5 rounded flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào Hóa đơn</span>
          </button>
        </div>
      </form>

      {/* Main Table */}
      <div className={`${UI.containerCardBg} rounded-lg p-3 border space-y-3`}>
        <div className="flex items-center justify-between border-b border-line pb-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm kiếm mặt hàng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
            />
          </div>
          <div className="text-xs text-ink-faint">Hiển thị {filteredItems.length} mặt hàng</div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2.5 text-center w-14">STT</th>
                <th className="p-2.5 min-w-[220px]">TÊN HÀNG HÓA / DỊCH VỤ</th>
                <th className="p-2.5 text-center w-24">ĐVT</th>
                <th className="p-2.5 text-right w-28">SỐ LƯỢNG</th>
                <th className="p-2.5 text-right w-36">ĐƠN GIÁ (VND)</th>
                <th className="p-2.5 text-right w-40 bg-pos-soft text-pos font-bold">THÀNH TIỀN (VND)</th>
                <th className="p-2.5 text-center w-20">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {filteredItems.map((rawItem, idx) => {
                const c = computeRetailInvoiceItem(rawItem);
                return (
                  <tr
                    key={c.id}
                    onDoubleClick={() => setEditingItem(rawItem)}
                    className="hover:bg-panel-muted/50 transition-colors cursor-pointer group"
                    title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                  >
                    <td className="p-2.5 text-center font-bold text-ink-muted">{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-ink font-app">{c.itemName}</td>
                    <td className="p-2.5 text-center text-ink-muted">{c.unit}</td>
                    <td className="p-2.5 text-right font-bold text-ink">{fmtNumber(c.qty)}</td>
                    <td className="p-2.5 text-right font-bold text-accent">{fmtMoney(c.unitPrice)}</td>
                    <td className="p-2.5 text-right font-mono font-black text-pos bg-pos-soft/40">{fmtMoney(c.amount)}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingItem(rawItem);
                          }}
                          className="p-1 rounded text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                          title="Sửa mặt hàng này"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeItem(c.id);
                          }}
                          className="p-1 rounded text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                          title="Xóa mặt hàng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-faint italic font-app">
                    Chưa có mặt hàng nào trong Hóa đơn. Bấm nút <strong>"📥 Chọn từ Kho hàng"</strong> hoặc nhập vào form trên.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
              <tr>
                <td className="p-2 text-center" colSpan={3}>TỔNG CỘNG THÀNH TIỀN</td>
                <td className="p-2 text-right font-mono">{fmtNumber(summary.totalQty)}</td>
                <td className="p-2"></td>
                <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60">{fmtMoney(summary.totalAmount)}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

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

      {/* History Modal for Saved Invoices from DB */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${UI.containerCardBg} rounded-xl max-w-2xl w-full p-5 border space-y-4 max-h-[85vh] flex flex-col shadow-xl`}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-bold text-ink uppercase">Lịch sử Hóa Đơn Bán Lẻ đã lưu trong CSDL</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-ink-faint hover:text-ink font-bold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {savedInvoices.length === 0 ? (
                <div className="text-center text-ink-faint py-8 text-xs">
                  Chưa có Hóa đơn nào được lưu trong CSDL. Bấm nút <strong>"Lưu CSDL"</strong> để lưu hóa đơn hiện tại.
                </div>
              ) : (
                savedInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => handleLoadInvoice(inv)}
                    className="p-3 border rounded-lg hover:border-accent hover:bg-accent-soft/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-ink text-sm">
                        Khách hàng: {inv.headerInfo.buyerName || 'Chưa đặt tên'}
                      </div>
                      <div className="text-ink-faint flex items-center space-x-3">
                        <span>Ngày lập: {inv.invoiceDate}</span>
                        <span>•</span>
                        <span>Cửa hàng: {inv.headerInfo.shopName || '---'}</span>
                        <span>•</span>
                        <span>{inv.items.length} mặt hàng</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteInvoice(inv.id, e)}
                        className="text-ink-faint hover:text-neg p-1.5 rounded hover:bg-neg-soft/30 transition-colors cursor-pointer"
                        title="Xóa Hóa đơn này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
