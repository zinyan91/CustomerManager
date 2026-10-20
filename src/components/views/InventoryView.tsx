import React, { useState, lazy, Suspense } from 'react';
import {
  Package, Printer, Plus, Trash2, Search, Boxes, FileSpreadsheet,
  Settings2, Users, Pencil, X, Save,
} from 'lucide-react';
import { computeItemRow, type InventoryItem } from '../../lib/inventory';
import { parseMoneyDecimalInput, fmtMoney, fmtNumber, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { useInventoryController } from '../../hooks/useInventoryController';

const DebtReceivableTab = lazy(() => import('../inventory/DebtReceivableTab').then(m => ({ default: m.DebtReceivableTab })));
const DebtPayableTab = lazy(() => import('../inventory/DebtPayableTab').then(m => ({ default: m.DebtPayableTab })));
const TemplateManagerModal = lazy(() => import('../inventory/TemplateManagerModal').then(m => ({ default: m.TemplateManagerModal })));

import { ViewSkeleton } from '../SkeletonLoader';

const TabFallback = () => <ViewSkeleton tableRows={4} hasKpi={false} />;

const EditInventoryItemModal: React.FC<{
  item: InventoryItem;
  onSave: (updated: InventoryItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [priceStr, setPriceStr] = useState(item.unitPrice ? formatMoneyInput(String(item.unitPrice)) : '');
  const [begQtyStr, setBegQtyStr] = useState(item.beginningQty ? formatMoneyInput(String(item.beginningQty)) : '');
  const [impQtyStr, setImpQtyStr] = useState(item.importQty ? formatMoneyInput(String(item.importQty)) : '');
  const [expQtyStr, setExpQtyStr] = useState(item.exportQty ? formatMoneyInput(String(item.exportQty)) : '');

  const unitPrice = parseMoneyDecimalInput(priceStr);
  const beginningQty = parseMoneyDecimalInput(begQtyStr);
  const importQty = parseMoneyDecimalInput(impQtyStr);
  const exportQty = parseMoneyDecimalInput(expQtyStr);
  const endingQty = beginningQty + importQty - exportQty;
  const endingValue = endingQty * unitPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...item,
      code: code.trim() || item.code,
      name: name.trim(),
      unit: unit.trim() || 'Cái',
      unitPrice,
      beginningQty,
      importQty,
      exportQty,
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
            <h3 className="font-bold text-sm text-ink uppercase">SỬA MẶT HÀNG: {item.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Mã sản phẩm</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`w-full p-2 rounded-lg font-mono font-bold ${UI.inputStyle}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block mb-1 ${UI.labelStyle}`}>Tên mặt hàng *</label>
              <input
                type="text"
                value={name}
                required
                onChange={e => setName(e.target.value)}
                className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn vị tính (ĐVT)</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className={`w-full p-2 rounded-lg text-center ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Đơn giá (VNĐ)</label>
              <input
                type="text"
                value={priceStr}
                onChange={e => setPriceStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono font-bold text-right text-accent ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 text-ink-faint text-[11px]`}>Tồn đầu kỳ</label>
              <input
                type="text"
                value={begQtyStr}
                onChange={e => setBegQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-pos text-[11px] font-bold`}>+ Nhập trong kỳ</label>
              <input
                type="text"
                value={impQtyStr}
                onChange={e => setImpQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-pos font-bold ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-warn text-[11px] font-bold`}>− Xuất trong kỳ</label>
              <input
                type="text"
                value={expQtyStr}
                onChange={e => setExpQtyStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-warn font-bold ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-lg bg-accent-soft/40 border border-accent/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-ink-faint uppercase font-bold">TỒN CUỐI KỲ DỰ TÍNH</div>
              <div className="font-mono font-bold text-accent text-sm mt-0.5">
                {fmtNumber(endingQty)} <span className="text-xs font-normal text-ink-muted">{unit || 'Cái'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-pos uppercase font-bold">THÀNH TIỀN DỰ TÍNH</div>
              <div className="font-mono font-black text-pos text-sm mt-0.5">
                {fmtMoney(endingValue)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-line text-ink-muted hover:bg-panel-muted text-xs font-semibold transition-colors"
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

export const InventoryView: React.FC = () => {
  const {
    activeSubTab,
    setActiveSubTab,
    templates,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    selectedTemplateId,
    categoryName,
    setCategoryName,
    customerName,
    setCustomerName,
    recordDate,
    setRecordDate,
    receivables,
    setReceivables,
    payables,
    setPayables,
    searchTerm,
    setSearchTerm,
    notification,
    setNotification,
    showNotify,
    newCode,
    setNewCode,
    newName,
    setNewName,
    newUnit,
    setNewUnit,
    newPriceStr,
    setNewPriceStr,
    newBegQtyStr,
    setNewBegQtyStr,
    newImpQtyStr,
    setNewImpQtyStr,
    newExpQtyStr,
    setNewExpQtyStr,
    filteredItems,
    summary,
    handleSelectTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleResetTemplates,
    handleAddItem,
    updateItem,
    removeItem,
    clearAllItems,
    handleExportExcel,
    handlePrintHtml,
  } = useInventoryController();

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  return (
    <div data-workspace-page className="space-y-0 text-xs font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Main Header Toolbar */}
      <div data-workspace-panel className={`${UI.containerCardBg} rounded-xl border p-4 shadow-xs space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-accent" />
            <span className="font-bold text-sm text-ink">Quản lý Kiểm kê Hàng tồn kho & Công nợ</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              className="bg-pos hover:opacity-90 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handlePrintHtml}
              className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-line pb-2">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${activeSubTab === 'inventory'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'bg-panel-muted text-ink-muted hover:text-ink'
              }`}
          >
            <Boxes className="w-4 h-4" />
            <span>I. Bảng Kiểm kê Hàng tồn kho</span>
          </button>

          <button
            onClick={() => setActiveSubTab('receivables')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${activeSubTab === 'receivables'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'bg-panel-muted text-ink-muted hover:text-ink'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>II. Sổ Chi tiết Nợ Phải thu Khách hàng</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payables')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${activeSubTab === 'payables'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'bg-panel-muted text-ink-muted hover:text-ink'
              }`}
          >
            <Users className="w-4 h-4 text-warn" />
            <span>III. Sổ Chi tiết Nợ Phải trả Nhà cung cấp</span>
          </button>
        </div>

        {/* Inventory Sub-tab view */}
        {activeSubTab === 'inventory' && (
          <div className="space-y-4">
            {/* Header controls for Customer & Industry */}
            <div data-workspace-panel className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-panel-muted/40 p-3 rounded-lg border border-line">
              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Tên Khách hàng / Hộ kinh doanh</label>
                <input
                  type="text"
                  placeholder="VD: HKD Nguyễn Văn A..."
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className={`w-full rounded-md p-2 font-semibold ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Chọn Mẫu Ngành hàng Chuẩn</label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleSelectTemplate(e.target.value)}
                    className={`w-full rounded-md p-2 font-semibold text-accent ${UI.inputStyle}`}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.items.length} mặt hàng)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="p-2 rounded-md border border-line bg-panel hover:bg-panel-muted text-accent font-bold transition-all shrink-0"
                    title="Quản lý / Chỉnh sửa Ngành hàng mẫu"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Tên Nhóm / Loại Hàng hóa</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  className={`w-full rounded-md p-2 font-semibold ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Ngày chốt kiểm kê</label>
                <DateInput
                  value={recordDate}
                  onChange={setRecordDate}
                  className={`w-full rounded-md p-2 ${UI.inputStyle}`}
                />
              </div>
            </div>

            {/* Form Add New Item */}
            <form data-workspace-panel onSubmit={handleAddItem} className="bg-panel border border-line p-3 rounded-lg space-y-2">
              <div className="font-bold text-xs text-ink flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-accent" />
                <span>Thêm Sản phẩm / Hàng hóa mới vào danh mục</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <input
                  type="text"
                  placeholder="Mã SP (VD: SP01)"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  className={`rounded-md p-2 font-mono ${UI.inputStyle}`}
                />
                <input
                  type="text"
                  placeholder="Tên sản phẩm *"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={`col-span-2 rounded-md p-2 font-semibold ${UI.inputStyle}`}
                />
                <input
                  type="text"
                  placeholder="ĐVT (Kg/Bao)"
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  className={`rounded-md p-2 ${UI.inputStyle}`}
                />
                <input
                  type="text"
                  placeholder="Đơn giá (VNĐ)"
                  value={newPriceStr}
                  onChange={e => setNewPriceStr(e.target.value)}
                  className={`rounded-md p-2 font-mono ${UI.inputStyle}`}
                />
                <input
                  type="text"
                  placeholder="Tồn đầu kỳ"
                  value={newBegQtyStr}
                  onChange={e => setNewBegQtyStr(e.target.value)}
                  className={`rounded-md p-2 font-mono ${UI.inputStyle}`}
                />
                <input
                  type="text"
                  placeholder="Nhập trong kỳ"
                  value={newImpQtyStr}
                  onChange={e => setNewImpQtyStr(e.target.value)}
                  className={`rounded-md p-2 font-mono ${UI.inputStyle}`}
                />
                <div className="flex space-x-1">
                  <input
                    type="text"
                    placeholder="Xuất trong kỳ"
                    value={newExpQtyStr}
                    onChange={e => setNewExpQtyStr(e.target.value)}
                    className={`w-full rounded-md p-2 font-mono ${UI.inputStyle}`}
                  />
                  <button
                    type="submit"
                    className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-2 rounded-md flex items-center justify-center shrink-0"
                    title="Thêm dòng mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* Inventory Table Search & Summary Stats */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên SP, ĐVT..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs ${UI.inputStyle}`}
                />
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="text-ink-faint">Tồn cuối kỳ: <strong className="text-accent font-mono">{fmtNumber(summary.totalEndingQty)}</strong> sản phẩm</span>
                <span className="text-ink-faint">Tổng giá trị: <strong className="text-pos font-mono text-sm">{fmtMoney(summary.totalEndingValue)}</strong></span>
                <button
                  onClick={clearAllItems}
                  className="text-neg hover:underline text-xs flex items-center space-x-1 font-semibold ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết bảng</span>
                </button>
              </div>
            </div>

            {/* Main Inventory Table */}
            <div data-workspace-panel className="border border-line rounded-xl overflow-hidden bg-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={UI.tableHeaderStyle}>
                    <tr>
                      <th className="p-2.5 text-center w-12">STT</th>
                      <th className="p-2.5 text-left w-24">MÃ SP</th>
                      <th className="p-2.5 text-left min-w-[160px]">TÊN MẶT HÀNG / SẢN PHẨM</th>
                      <th className="p-2.5 text-center w-16">ĐVT</th>
                      <th className="p-2.5 text-right w-28">ĐƠN GIÁ (VNĐ)</th>
                      <th className="p-2.5 text-right w-24">TỒN ĐẦU KỲ</th>
                      <th className="p-2.5 text-right w-24">NHẬP TRONG KỲ</th>
                      <th className="p-2.5 text-right w-24">XUẤT TRONG KỲ</th>
                      <th className="p-2.5 text-right w-24 bg-accent-soft text-accent">TỒN CUỐI KỲ</th>
                      <th className="p-2.5 text-right w-32 bg-accent-soft text-accent">THÀNH TIỀN (VNĐ)</th>
                      <th className="p-2.5 text-center w-20">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-ink-faint italic font-app">
                          Chưa có sản phẩm nào trong nhóm kiểm kê này. Vui lòng chọn Mẫu Ngành hàng hoặc Thêm sản phẩm mới ở trên.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((it, idx) => {
                        const row = computeItemRow(it);
                        return (
                          <tr
                            key={it.id}
                            onDoubleClick={() => setEditingItem(it)}
                            className="hover:bg-panel-muted/50 transition-colors group cursor-pointer"
                            title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                          >
                            <td className="p-2.5 text-center text-ink-faint">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-accent">{it.code}</td>
                            <td className="p-2.5 font-semibold text-ink font-app">{it.name}</td>
                            <td className="p-2.5 text-center text-ink-muted">{it.unit}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-ink">
                              {it.unitPrice > 0 ? fmtNumber(it.unitPrice) : '0'}
                            </td>
                            <td className="p-2.5 text-right font-mono text-ink">
                              {it.beginningQty > 0 ? fmtNumber(it.beginningQty) : '0'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-pos">
                              {it.importQty > 0 ? fmtNumber(it.importQty) : '0'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-warn">
                              {it.exportQty > 0 ? fmtNumber(it.exportQty) : '0'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-accent bg-accent-soft/30">
                              {fmtNumber(row.endingQty)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-pos bg-pos-soft/30">
                              {fmtMoney(row.endingValue)}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingItem(it);
                                  }}
                                  className="p-1 rounded-md text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors"
                                  title="Sửa sản phẩm"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    removeItem(it.id);
                                  }}
                                  className="p-1 rounded-md text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors"
                                  title="Xóa sản phẩm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
          </div>
        )}

        {/* Receivables Sub-tab */}
        {activeSubTab === 'receivables' && (
          <Suspense fallback={<TabFallback />}>
            <DebtReceivableTab
              receivables={receivables}
              onChangeReceivables={setReceivables}
              showNotify={showNotify}
            />
          </Suspense>
        )}

        {/* Payables Sub-tab */}
        {activeSubTab === 'payables' && (
          <Suspense fallback={<TabFallback />}>
            <DebtPayableTab
              payables={payables}
              onChangePayables={setPayables}
              showNotify={showNotify}
            />
          </Suspense>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditInventoryItemModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật sản phẩm "${updated.name}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Template Manager Modal */}
      {isTemplateModalOpen && (
        <Suspense fallback={<TabFallback />}>
          <TemplateManagerModal
            isOpen={isTemplateModalOpen}
            templates={templates}
            onClose={() => setIsTemplateModalOpen(false)}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onResetTemplates={handleResetTemplates}
          />
        </Suspense>
      )}
    </div>
  );
};
