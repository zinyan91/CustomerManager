import React, { lazy, Suspense } from 'react';
import {
  Package, Printer, Plus, Trash2, Search, Boxes, FileSpreadsheet,
  Settings2, Users, Save,
} from 'lucide-react';
import { fmtMoney, fmtNumber } from '../../lib/utils';
import { InventoryItemsTable } from '../inventory/InventoryItemsTable';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { useInventoryController } from '../../hooks/useInventoryController';

const DebtLedgerTab = lazy(() => import('../inventory/DebtLedgerTab').then(m => ({ default: m.DebtLedgerTab })));
const TemplateManagerModal = lazy(() => import('../inventory/TemplateManagerModal').then(m => ({ default: m.TemplateManagerModal })));

import { ViewSkeleton } from '../SkeletonLoader';

const TabFallback = () => <ViewSkeleton tableRows={4} hasKpi={false} />;

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
    debts,
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
    sortedReceivables,
    sortedPayables,
    inventorySort,
    receivableSort,
    payableSort,
    toggleInventorySort,
    toggleReceivableSort,
    togglePayableSort,
    handleOverwriteTemplate,
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
    <div data-workspace-page className="space-y-0 text-xs font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Main Header Toolbar */}
      <div data-workspace-panel className={`${UI.containerCardBg} rounded-xl border p-4 shadow-xs space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-accent" />
            <span className="font-bold text-sm text-ink">Quản lý Kiểm kê Hàng tồn kho & Công nợ</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportExcel('tab')}
              className="bg-pos hover:opacity-90 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel bảng này</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel('all')}
              className="border border-pos/40 text-pos hover:bg-pos-soft font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel cả 3 bảng</span>
            </button>

            <button
              type="button"
              onClick={handlePrintHtml}
              className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF bảng này</span>
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
                  <button
                    type="button"
                    onClick={handleOverwriteTemplate}
                    className="p-2 rounded-md border border-line bg-panel hover:bg-panel-muted text-accent font-bold transition-all shrink-0"
                    title="Lưu bảng hiện tại đè lên mẫu này"
                    aria-label="Lưu bảng hiện tại đè lên mẫu này"
                  >
                    <Save className="w-4 h-4" />
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

            <InventoryItemsTable
              items={filteredItems}
              summary={summary}
              sort={inventorySort}
              onSort={toggleInventorySort}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          </div>
        )}

        {/* Receivables Sub-tab */}
        {activeSubTab === 'receivables' && (
          <Suspense fallback={<TabFallback />}>
            <DebtLedgerTab
              kind="receivable"
              items={sortedReceivables}
              loading={debts.loading}
              error={debts.error}
              onRetry={debts.reload}
              onAdd={item => debts.addDebt('receivable', item)}
              onUpdate={(id, patch) => debts.updateDebt('receivable', id, patch)}
              onDelete={id => debts.removeDebt('receivable', id)}
              sort={receivableSort}
              onSort={toggleReceivableSort}
              showNotify={showNotify}
            />
          </Suspense>
        )}

        {/* Payables Sub-tab */}
        {activeSubTab === 'payables' && (
          <Suspense fallback={<TabFallback />}>
            <DebtLedgerTab
              kind="payable"
              items={sortedPayables}
              loading={debts.loading}
              error={debts.error}
              onRetry={debts.reload}
              onAdd={item => debts.addDebt('payable', item)}
              onUpdate={(id, patch) => debts.updateDebt('payable', id, patch)}
              onDelete={id => debts.removeDebt('payable', id)}
              sort={payableSort}
              onSort={togglePayableSort}
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
