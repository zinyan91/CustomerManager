import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Trash2, Download, Printer, Search, Save, History,
  Pencil, X, Package,
} from 'lucide-react';
import {
  computeStatementItem, computeStatementSummary, nextStatementId, getComputedBankAccText,
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
import { fmtMoney, fmtNumber, parseMoneyDecimalInput, formatMoneyInput, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { BANK_LIST } from '../../lib/documentOptions';
import { InventoryItemPickerModal, type SelectedInventoryItemPayload } from './InventoryItemPickerModal';

interface PurchaseStatementTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

const EditPurchaseItemModal: React.FC<{
  item: StatementItem;
  onSave: (updated: StatementItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [dateStr, setDateStr] = useState(item.dateStr || todayIso());
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
      dateStr: dateStr.trim() || item.dateStr,
      itemName: itemName.trim(),
      unit: unit.trim() || 'Kg',
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
            <h3 className="font-bold text-sm text-ink uppercase">SỬA MẶT HÀNG BẢNG KÊ</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Ngày mua bán</label>
              <input
                type="text"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className={`w-full p-2 rounded-lg font-mono text-center ${UI.inputStyle}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block mb-1 ${UI.labelStyle}`}>Tên hàng hóa / dịch vụ *</label>
              <input
                type="text"
                value={itemName}
                required
                onChange={e => setItemName(e.target.value)}
                className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn vị tính</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Kg, Chai, m2..."
                className={`w-full p-2 rounded-lg ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Số lượng</label>
              <input
                type="text"
                inputMode="decimal"
                value={qtyStr}
                onChange={e => setQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono font-bold text-right ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn giá (VND)</label>
              <input
                type="text"
                inputMode="decimal"
                value={priceStr}
                onChange={e => setPriceStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono font-bold text-right text-accent ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Thành tiền auto-calc */}
          <div className="p-3 rounded-lg bg-pos-soft/40 border border-pos/30 flex items-center justify-between">
            <span className="font-bold text-[11px] text-pos uppercase">Thành tiền tính tự động:</span>
            <span className="font-mono font-black text-sm text-pos">{fmtMoney(amount)}</span>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-line text-ink-faint hover:text-ink hover:bg-panel font-semibold text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-xs transition-opacity"
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

export const PurchaseStatementTab: React.FC<PurchaseStatementTabProps> = ({ showNotify }) => {
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
  const [newItemName, setNewItemName] = useState('');
  const [newUnit, setNewUnit] = useState('Kg');
  const [newQtyStr, setNewQtyStr] = useState('');
  const [newPriceStr, setNewPriceStr] = useState('');
  const [newNote, setNewNote] = useState('');

  // Fetch Inventory items on mount & when picker opens
  useEffect(() => {
    fetchInventoryItemsDb().then(invs => {
      setInventoryItems(invs);
    });
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
    if (window.confirm('Bạn có chắc chắn muốn xóa Bảng kê này khỏi CSDL?')) {
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

  const handleClearAllItems = () => {
    if (items.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ mặt hàng trong bảng kê hiện tại?')) {
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
      if (matched.importQty > 0 && !newQtyStr) {
        setNewQtyStr(formatMoneyInput(String(matched.importQty)));
      }
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showNotify('error', 'Vui lòng nhập tên hàng hóa, dịch vụ.');
      return;
    }
    const item: StatementItem = {
      id: nextStatementId(),
      dateStr: sellerInfo.statementDateStr || todayIso(),
      itemName: newItemName.trim(),
      unit: newUnit.trim() || 'Kg',
      qty: parseMoneyDecimalInput(newQtyStr) || 1,
      unitPrice: parseMoneyDecimalInput(newPriceStr),
      note: newNote.trim(),
    };
    setItems(prev => [item, ...prev]);
    setNewItemName('');
    setNewQtyStr('');
    setNewPriceStr('');
    setNewNote('');
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
    return items.filter(
      it => it.itemName.toLowerCase().includes(term) || (it.note && it.note.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const handleExportExcel = () => {
    if (items.length === 0) {
      showNotify('error', 'Vui lòng thêm ít nhất một mặt hàng để xuất Excel.');
      return;
    }
    const bytes = buildPurchaseStatementXlsx(items, sellerInfo);
    downloadBytes(bytes, `Bang_Ke_Mua_Ban_${sellerInfo.sellerName.replace(/\s+/g, '_')}_${todayIso()}.xlsx`, MIME_XLSX);
    showNotify('success', 'Đã xuất file Excel Bảng kê mua bán thành công!');
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
    <div className="space-y-4">
      {/* Header Info & Actions */}
      <div className={`${UI.containerCardBg} rounded-xl p-4 border space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-accent-soft rounded-lg text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
                BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={handleSaveToDb}
              title="Lưu chứng từ Bảng kê vào CSDL Supabase"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu CSDL</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              title="Xem danh sách các Bảng kê đã lưu trong CSDL"
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

        {/* Information & Payment Method Controls */}
        <div className="p-3.5 rounded-md border border-line bg-panel-muted space-y-3">
          {/* Seller Legal Identity Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                Bên bán hàng (Họ tên)
              </label>
              <input
                type="text"
                value={sellerInfo.sellerName}
                onChange={e => setSellerInfo({ ...sellerInfo, sellerName: e.target.value })}
                className={`w-full rounded-md p-2 font-bold ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                Địa chỉ Bên bán
              </label>
              <input
                type="text"
                value={sellerInfo.sellerAddress}
                onChange={e => setSellerInfo({ ...sellerInfo, sellerAddress: e.target.value })}
                className={`w-full rounded-md p-2 ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                Số CMND / CCCD số Bên bán
              </label>
              <input
                type="text"
                placeholder="Nhập số CMND/CCCD"
                value={sellerInfo.sellerIdCard}
                onChange={e => setSellerInfo({ ...sellerInfo, sellerIdCard: e.target.value })}
                className={`w-full rounded-md p-2 font-mono font-bold text-accent ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                Bên mua hàng (Họ tên)
              </label>
              <input
                type="text"
                value={sellerInfo.buyerName}
                onChange={e => setSellerInfo({ ...sellerInfo, buyerName: e.target.value })}
                className={`w-full rounded-md p-2 font-bold ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                Ngày lập bảng kê
              </label>
              <input
                type="text"
                value={sellerInfo.statementDateStr}
                onChange={e => setSellerInfo({ ...sellerInfo, statementDateStr: e.target.value })}
                className={`w-full rounded-md p-2 font-mono ${UI.inputStyle}`}
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
                  title="Xóa toàn bộ mặt hàng trong bảng kê"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa hết mặt hàng</span>
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector & Dynamic Payment Details */}
          <div className="pt-2 border-t border-line space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-warn text-[11px] uppercase">
                HÌNH THỨC NHẬN THANH TOÁN CỦA BÊN BÁN
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="stmtPayMethod"
                    checked={(sellerInfo.paymentMethod || 'transfer') === 'cash'}
                    onChange={() => setSellerInfo({ ...sellerInfo, paymentMethod: 'cash' })}
                    className="accent-accent"
                  />
                  <span>💵 Tiền mặt</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="stmtPayMethod"
                    checked={(sellerInfo.paymentMethod || 'transfer') === 'transfer'}
                    onChange={() => setSellerInfo({ ...sellerInfo, paymentMethod: 'transfer' })}
                    className="accent-accent"
                  />
                  <span>🏦 Chuyển khoản</span>
                </label>
              </div>
            </div>

            {/* Cash Mode Preview */}
            {sellerInfo.paymentMethod === 'cash' ? (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono">
                <span className="font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400">
                  Thông tin thanh toán hiển thị trên chứng từ:
                </span>{' '}
                <span className="font-bold">{sellerInfo.sellerIdCard ? `CCCD: ${sellerInfo.sellerIdCard}` : 'Tiền mặt'}</span>
              </div>
            ) : (
              /* Bank Transfer Fields */
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                      Số tài khoản (STK)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 9975639612"
                      value={sellerInfo.bankAccNo !== undefined ? sellerInfo.bankAccNo : ''}
                      onChange={e => setSellerInfo({ ...sellerInfo, bankAccNo: e.target.value })}
                      className={`w-full rounded-md p-2 font-mono font-bold text-accent ${UI.inputStyle}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                      Ngân hàng
                    </label>
                    <select
                      value={sellerInfo.bankName || ''}
                      onChange={e => setSellerInfo({ ...sellerInfo, bankName: e.target.value })}
                      className={`w-full rounded-md p-2 ${UI.inputStyle}`}
                    >
                      <option value="">-- Chọn Ngân hàng --</option>
                      {BANK_LIST.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                      Chi nhánh (Nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: CN TP.HCM"
                      value={sellerInfo.bankBranch || ''}
                      onChange={e => setSellerInfo({ ...sellerInfo, bankBranch: e.target.value })}
                      className={`w-full rounded-md p-2 ${UI.inputStyle}`}
                    />
                  </div>
                </div>

                {/* Auto-assembled Preview Tag for Transfer Info */}
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
                      Thông tin chuyển khoản hiển thị trên chứng từ:
                    </span>
                    <span className="font-bold">
                      {getComputedBankAccText(sellerInfo)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI & Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG SỐ MẶT HÀNG</div>
          <div className="text-xl font-extrabold text-accent mt-0.5 font-mono">
            {summary.totalItems} <span className="text-xs font-normal text-ink-faint">sản phẩm</span>
          </div>
        </div>
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG SỐ LƯỢNG MUA BÁN</div>
          <div className="text-xl font-extrabold text-ink mt-0.5 font-mono">
            {summary.totalQty.toLocaleString('vi-VN')}
          </div>
        </div>
        <div className="rounded-lg p-3 border border-pos/40 bg-pos-soft">
          <div className="text-[10px] font-black text-pos uppercase tracking-wide">TỔNG GIÁ TRỊ THÀNH TIỀN</div>
          <div className="text-xl font-black text-pos mt-0.5 font-mono">
            {fmtMoney(summary.totalAmount)}
          </div>
        </div>
      </div>

      {/* Form Add Item */}
      <form onSubmit={handleAddItem} className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Plus className="w-4 h-4" />
            <span>Thêm mặt hàng mua bán</span>
          </div>
          <span className="text-[10px] text-ink-faint font-normal">
            (Gõ tên để tự động gợi ý giá & ĐVT từ Kho hàng)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input
            type="text"
            list="statement-inventory-datalist"
            placeholder="Tên hàng hóa / dịch vụ *"
            value={newItemName}
            onChange={e => handleItemNameChange(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} sm:col-span-2`}
          />
          <datalist id="statement-inventory-datalist">
            {inventoryItems.map(it => (
              <option key={it.id} value={it.name}>
                {it.code} - {fmtMoney(it.unitPrice)}/{it.unit}
              </option>
            ))}
          </datalist>

          <input
            type="text"
            placeholder="ĐVT (Kg, Chai, m2...)"
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle}`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Số lượng"
            value={newQtyStr}
            onChange={e => setNewQtyStr(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Đơn giá (VND)"
            value={newPriceStr}
            onChange={e => setNewPriceStr(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-4 py-1.5 rounded flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào Bảng kê</span>
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
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
            />
          </div>
          <div className="text-xs text-ink-faint">Hiển thị {filteredItems.length} sản phẩm</div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2.5 text-center w-28">NGÀY THÁNG</th>
                <th className="p-2.5 min-w-[220px]">TÊN HÀNG HÓA, DỊCH VỤ</th>
                <th className="p-2.5 text-center w-20">ĐVT</th>
                <th className="p-2.5 text-right w-28">SỐ LƯỢNG</th>
                <th className="p-2.5 text-right w-36">ĐƠN GIÁ (VND)</th>
                <th className="p-2.5 text-right w-40 bg-pos-soft text-pos font-bold">THÀNH TIỀN (VND)</th>
                <th className="p-2.5 text-center w-20">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {filteredItems.map(rawItem => {
                const c = computeStatementItem(rawItem);
                return (
                  <tr
                    key={c.id}
                    onDoubleClick={() => setEditingItem(rawItem)}
                    className="hover:bg-panel-muted/50 transition-colors cursor-pointer group"
                    title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                  >
                    <td className="p-2.5 text-center font-mono text-ink-muted">{c.dateStr}</td>
                    <td className="p-2.5 font-semibold text-ink font-app">{c.itemName}</td>
                    <td className="p-2.5 text-center text-ink-muted">{c.unit}</td>
                    <td className="p-2.5 text-right font-bold text-ink">
                      {c.qty > 0 ? fmtNumber(c.qty) : '0'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-accent">
                      {c.unitPrice > 0 ? fmtNumber(c.unitPrice) : '0'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-pos bg-pos-soft/40">
                      {fmtMoney(c.amount)}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingItem(rawItem);
                          }}
                          className="p-1 rounded text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors"
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
                          className="p-1 rounded text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors"
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
                    Chưa có mặt hàng nào trong Bảng kê. Bấm nút <strong>"📥 Chọn từ Kho hàng"</strong> hoặc nhập vào form trên.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
              <tr>
                <td className="p-2 text-center" colSpan={3}>TỔNG CỘNG ({summary.totalItems} MẶT HÀNG)</td>
                <td className="p-2 text-right font-mono">{summary.totalQty.toLocaleString('vi-VN')}</td>
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

      {/* History Modal for Saved Statements from DB */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${UI.containerCardBg} rounded-xl max-w-2xl w-full p-5 border space-y-4 max-h-[85vh] flex flex-col shadow-xl`}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-bold text-ink uppercase">Lịch sử Bảng Kê Mua Bán đã lưu trong CSDL</h3>
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
              {savedStatements.length === 0 ? (
                <div className="text-center text-ink-faint py-8 text-xs">
                  Chưa có Bảng kê nào được lưu trong CSDL. Bấm nút <strong>"Lưu CSDL"</strong> để lưu bảng kê hiện tại.
                </div>
              ) : (
                savedStatements.map(stmt => (
                  <div
                    key={stmt.id}
                    onClick={() => handleLoadStatement(stmt)}
                    className="p-3 border rounded-lg hover:border-accent hover:bg-accent-soft/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-ink text-sm">
                        Bên bán: {stmt.sellerInfo.sellerName || 'Chưa đặt tên'}
                      </div>
                      <div className="text-ink-faint flex items-center space-x-3">
                        <span>Ngày lập: {stmt.statementDate}</span>
                        <span>•</span>
                        <span>Bên mua: {stmt.sellerInfo.buyerName || '---'}</span>
                        <span>•</span>
                        <span>{stmt.items.length} mặt hàng</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteStatement(stmt.id, e)}
                        className="text-ink-faint hover:text-neg p-1.5 rounded hover:bg-neg-soft/30 transition-colors cursor-pointer"
                        title="Xóa Bảng kê này"
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
