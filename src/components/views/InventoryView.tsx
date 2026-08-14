import React, { useState, lazy, Suspense } from 'react';
import {
  Package, Printer, Plus, Trash2, Search, Boxes, FileSpreadsheet,
  Settings2, Users, Loader2,
} from 'lucide-react';
import { computeItemRow } from '../../lib/inventory';
import { parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { useInventoryController } from '../../hooks/useInventoryController';

const DebtReceivableTab = lazy(() => import('../inventory/DebtReceivableTab').then(m => ({ default: m.DebtReceivableTab })));
const DebtPayableTab = lazy(() => import('../inventory/DebtPayableTab').then(m => ({ default: m.DebtPayableTab })));
const TemplateManagerModal = lazy(() => import('../inventory/TemplateManagerModal').then(m => ({ default: m.TemplateManagerModal })));

const TabFallback = () => (
  <div className="flex items-center justify-center p-8 text-ink-muted">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải phân hệ...</span>
  </div>
);

const QtyCellInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [dangGo, setDangGo] = useState<string | null>(null);
  const shown = dangGo ?? (value === 0 ? '' : value.toLocaleString('vi-VN'));

  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      onChange={e => {
        setDangGo(e.target.value);
        onChange(parseMoneyDecimalInput(e.target.value));
      }}
      onBlur={() => setDangGo(null)}
      className={className}
    />
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

  return (
    <div className="space-y-4 text-xs font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Main Header Toolbar */}
      <div className={`${UI.containerCardBg} rounded-xl border p-4 shadow-xs space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-accent" />
            <span className="font-bold text-sm text-ink">Quản lý Kiểm kê Hàng tồn kho & Công nợ (TK 131/331)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              className="bg-pos hover:opacity-90 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel Đầy đủ (XLSX)</span>
            </button>

            <button
              onClick={handlePrintHtml}
              className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên bản Kiểm kê (PDF/HTML)</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex space-x-2 border-b border-line pb-2">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'bg-panel-muted text-ink-muted hover:text-ink'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>I. Bảng Kiểm kê Hàng tồn kho ({summary.totalEndingValue.toLocaleString('vi-VN')} VNĐ)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('receivables')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${
              activeSubTab === 'receivables'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'bg-panel-muted text-ink-muted hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>II. Sổ Chi tiết Nợ Phải thu Khách hàng (TK 131) ({receivables.length} KH)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payables')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all ${
              activeSubTab === 'payables'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'bg-panel-muted text-ink-muted hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4 text-warn" />
            <span>III. Sổ Chi tiết Nợ Phải trả Nhà cung cấp (TK 331) ({payables.length} NCC)</span>
          </button>
        </div>

        {/* Inventory Sub-tab view */}
        {activeSubTab === 'inventory' && (
          <div className="space-y-4">
            {/* Header controls for Customer & Industry */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-panel-muted/40 p-3 rounded-lg border border-line">
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
            <form onSubmit={handleAddItem} className="bg-panel border border-line p-3 rounded-lg space-y-2">
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
                <span className="text-ink-faint">Tồn cuối kỳ: <strong className="text-accent font-mono">{summary.totalEndingQty.toLocaleString('vi-VN')}</strong> sản phẩm</span>
                <span className="text-ink-faint">Tổng giá trị: <strong className="text-pos font-mono text-sm">{summary.totalEndingValue.toLocaleString('vi-VN')}</strong> VNĐ</span>
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
            <div className="border border-line rounded-xl overflow-hidden bg-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={UI.tableHeaderStyle}>
                    <tr>
                      <th className="p-2 text-center w-10">STT</th>
                      <th className="p-2 text-left w-20">Mã SP</th>
                      <th className="p-2 text-left min-w-[140px]">Tên Mặt hàng / Tên Lúa Gạo</th>
                      <th className="p-2 text-center w-16">ĐVT</th>
                      <th className="p-2 text-right w-24">Đơn giá (VNĐ)</th>
                      <th className="p-2 text-right w-20">Tồn đầu kỳ</th>
                      <th className="p-2 text-right w-20">Nhập trong kỳ</th>
                      <th className="p-2 text-right w-20">Xuất trong kỳ</th>
                      <th className="p-2 text-right w-20 bg-accent-soft text-accent">Tồn cuối kỳ</th>
                      <th className="p-2 text-right w-28 bg-accent-soft text-accent">Thành tiền (VNĐ)</th>
                      <th className="p-2 text-center w-10">Xóa</th>
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
                          <tr key={it.id} className="hover:bg-panel-muted/50 transition-colors">
                            <td className="p-2 text-center text-ink-faint">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={it.code}
                                onChange={e => updateItem(it.id, { code: e.target.value })}
                                className={`w-full p-1 rounded font-mono ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 font-app">
                              <input
                                type="text"
                                value={it.name}
                                onChange={e => updateItem(it.id, { name: e.target.value })}
                                className={`w-full p-1 rounded font-semibold text-ink ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={it.unit}
                                onChange={e => updateItem(it.id, { unit: e.target.value })}
                                className={`w-full p-1 rounded text-center ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <QtyCellInput
                                value={it.unitPrice}
                                onChange={v => updateItem(it.id, { unitPrice: v })}
                                className={`w-full p-1 text-right font-bold text-accent ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <QtyCellInput
                                value={it.beginningQty}
                                onChange={v => updateItem(it.id, { beginningQty: v })}
                                className={`w-full p-1 text-right ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <QtyCellInput
                                value={it.importQty}
                                onChange={v => updateItem(it.id, { importQty: v })}
                                className={`w-full p-1 text-right text-pos ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <QtyCellInput
                                value={it.exportQty}
                                onChange={v => updateItem(it.id, { exportQty: v })}
                                className={`w-full p-1 text-right text-warn ${UI.inputStyle}`}
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-accent bg-accent-soft/30">
                              {row.endingQty.toLocaleString('vi-VN')}
                            </td>
                            <td className="p-2 text-right font-bold text-pos bg-accent-soft/30">
                              {row.endingValue.toLocaleString('vi-VN')}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => removeItem(it.id)}
                                className="p-1 text-ink-faint hover:text-neg transition-colors rounded"
                                title="Xóa sản phẩm"
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
                      <td className="p-3 text-right font-mono">{summary.totalBeginningQty.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono text-pos">{summary.totalImportQty.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono text-warn">{summary.totalExportQty.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono text-accent bg-accent-soft">{summary.totalEndingQty.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono text-pos bg-accent-soft text-sm">{summary.totalEndingValue.toLocaleString('vi-VN')}</td>
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
