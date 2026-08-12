import React, { useState, useMemo } from 'react';
import {
  Package, Download, Printer, Plus, Trash2, RefreshCw, Search, Boxes, FileSpreadsheet,
  Settings2, Users,
} from 'lucide-react';
import {
  computeItemRow, computeInventorySummary, nextItemId,
  type InventoryItem,
} from '../../lib/inventory';
import {
  loadInventoryTemplates, addInventoryTemplate, updateInventoryTemplate,
  deleteInventoryTemplate, resetInventoryTemplates,
} from '../../lib/templateStore';
import { type InventoryCategoryTemplate, type TemplateItem } from '../../data/inventoryTemplates';
import { SAMPLE_RECEIVABLES, type ReceivableItem } from '../../lib/debt';
import { buildFullInventoryAndDebtXlsx, buildInventoryDocHtml } from '../../lib/inventoryExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { fmtMoney, parseMoneyDecimalInput, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { DebtReceivableTab } from '../inventory/DebtReceivableTab';
import { DebtPayableTab } from '../inventory/DebtPayableTab';
import { TemplateManagerModal } from '../inventory/TemplateManagerModal';

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
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'receivables' | 'payables'>('inventory');

  // Industry Templates State
  const [templates, setTemplates] = useState<InventoryCategoryTemplate[]>(loadInventoryTemplates);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id || 'htk-lúa-gạo');

  // Customer & Context State
  const [categoryName, setCategoryName] = useState<string>('HTK Lúa Gạo');
  const [customerName, setCustomerName] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(() => todayIso());

  // Inventory items
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const tpl = templates.find(t => t.id === 'htk-lúa-gạo') || templates[0];
    return tpl ? tpl.items.map(it => ({ ...it, id: nextItemId() })) : [];
  });

  // Accounts Receivable items (TK 131)
  const [receivables, setReceivables] = useState<ReceivableItem[]>(SAMPLE_RECEIVABLES);

  // Accounts Payable items (TK 331)
  const [payables, setPayables] = useState<ReceivableItem[]>([
    {
      id: 'pay-1',
      code: 'NCC01',
      name: 'Công ty TNHH Xi măng Hà Tiên',
      beginningDebit: 0,
      beginningCredit: 150000000,
      occurredDebit: 50000000,
      occurredCredit: 80000000,
    },
    {
      id: 'pay-2',
      code: 'NCC02',
      name: 'Nhà máy Thép Hòa Phát',
      beginningDebit: 0,
      beginningCredit: 320000000,
      occurredDebit: 120000000,
      occurredCredit: 200000000,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New item form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Cái');
  const [newPriceStr, setNewPriceStr] = useState('');
  const [newBegQtyStr, setNewBegQtyStr] = useState('');
  const [newImpQtyStr, setNewImpQtyStr] = useState('');
  const [newExpQtyStr, setNewExpQtyStr] = useState('');

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setCategoryName(tpl.name);
      setItems(tpl.items.map(it => ({ ...it, id: nextItemId() })));
      showNotify('success', `Đã nạp danh mục mẫu: ${tpl.name}.`);
    }
  };

  // Template CRUD actions
  const handleSaveTemplate = (name: string, tplItems: TemplateItem[], templateId?: string) => {
    let updated: InventoryCategoryTemplate[];
    if (templateId) {
      updated = updateInventoryTemplate(templateId, name, tplItems);
      showNotify('success', `Đã cập nhật Mẫu ngành hàng: ${name}`);
    } else {
      const res = addInventoryTemplate(name, tplItems);
      updated = res.templates;
      setSelectedTemplateId(res.newTemplate.id);
      setCategoryName(res.newTemplate.name);
      setItems(res.newTemplate.items.map(it => ({ ...it, id: nextItemId() })));
      showNotify('success', `Đã tạo mới Mẫu ngành hàng: ${name}`);
    }
    setTemplates(updated);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = deleteInventoryTemplate(id);
    setTemplates(updated);
    if (selectedTemplateId === id) {
      const first = updated[0];
      if (first) {
        setSelectedTemplateId(first.id);
        setCategoryName(first.name);
        setItems(first.items.map(it => ({ ...it, id: nextItemId() })));
      }
    }
    showNotify('success', 'Đã xóa ngành hàng chuẩn.');
  };

  const handleResetTemplates = () => {
    const defaultTpls = resetInventoryTemplates();
    setTemplates(defaultTpls);
    setSelectedTemplateId(defaultTpls[0].id);
    setCategoryName(defaultTpls[0].name);
    setItems(defaultTpls[0].items.map(it => ({ ...it, id: nextItemId() })));
    showNotify('success', 'Đã khôi phục về danh mục 8 ngành hàng mặc định.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotify('error', 'Vui lòng nhập tên sản phẩm.');
      return;
    }
    const item: InventoryItem = {
      id: nextItemId(),
      code: newCode.trim() || `SP${items.length + 1}`,
      name: newName.trim(),
      unit: newUnit.trim() || 'Cái',
      unitPrice: parseMoneyDecimalInput(newPriceStr),
      beginningQty: parseMoneyDecimalInput(newBegQtyStr),
      importQty: parseMoneyDecimalInput(newImpQtyStr),
      exportQty: parseMoneyDecimalInput(newExpQtyStr),
    };
    setItems(prev => [item, ...prev]);
    setNewCode('');
    setNewName('');
    setNewPriceStr('');
    setNewBegQtyStr('');
    setNewImpQtyStr('');
    setNewExpQtyStr('');
    showNotify('success', `Đã thêm mặt hàng: ${item.name}`);
  };

  const updateItem = (id: string, patch: Partial<InventoryItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const clearAllItems = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ mặt hàng khỏi danh mục này?')) {
      setItems([]);
      showNotify('success', 'Đã xóa toàn bộ bảng dữ liệu.');
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term) || it.unit.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const summary = useMemo(() => computeInventorySummary(items), [items]);

  const handleExportExcel = () => {
    if (items.length === 0 && receivables.length === 0) {
      showNotify('error', 'Chưa có dữ liệu nào để xuất Excel.');
      return;
    }
    try {
      const bytes = buildFullInventoryAndDebtXlsx(items, receivables, {
        categoryName,
        customerName,
        recordDate,
      });
      downloadBytes(bytes, `HTK_PHAI_THU_${todayIso()}.xlsx`, MIME_XLSX);
      showNotify('success', 'Đã xuất tệp Excel thành công (2 Sheet).');
    } catch (err: any) {
      showNotify('error', 'Không xuất được tệp Excel: ' + (err?.message || 'Lỗi hệ thống'));
    }
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showNotify('error', 'Chưa có mặt hàng nào để in.');
      return;
    }
    const html = buildInventoryDocHtml(items, {
      categoryName,
      customerName,
      recordDate,
    }, receivables);
    const title = customerName
      ? `BẢNG KIỂM KÊ HÀNG TỒN KHO - ${customerName}`
      : `BẢNG KIỂM KÊ HÀNG TỒN KHO - ${categoryName || 'DANH MỤC'}`;
    printHtmlDoc(html, title);
  };

  const cellInputCls = 'w-full bg-transparent text-xs p-1 rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className="space-y-4 text-xs pb-6">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Top Header Card */}
      <div className={`${UI.containerCardBg} rounded-lg p-4 border space-y-3`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-accent-soft rounded-lg text-accent">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-accent tracking-tight uppercase">
                TỒN KHO - CÔNG NỢ - BẢNG KÊ & HÓA ĐƠN
              </h1>
              <p className="text-xs text-ink-faint">
                Quản lý tồn kho, đối soát công nợ phải thu, lập bảng kê mua bán và hóa đơn bán lẻ đa ngành hàng
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-panel-muted hover:bg-line text-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 border border-line transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Xuất PDF</span>
            </button>
          </div>
        </div>

        {/* Info & Industry Templates Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
                Mẫu ngành hàng tồn kho ({templates.length})
              </label>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-[11px] font-bold text-accent hover:underline flex items-center space-x-1"
              >
                <Settings2 className="w-3 h-3" />
                <span>Quản lý mẫu</span>
              </button>
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => handleSelectTemplate(e.target.value)}
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle} font-semibold`}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block mb-1 text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
              Tên danh mục / Ngành hàng
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="VD: HTK Vật liệu xây dựng"
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className={`block mb-1 text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
              Tên khách hàng / Cơ sở KD
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="VD: Công ty TNHH Kim Long"
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className={`block mb-1 text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
              Ngày kiểm kê / Đối soát
            </label>
            <DateInput
              value={recordDate}
              onChange={setRecordDate}
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle} font-mono`}
            />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-line gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'inventory'
              ? 'border-accent text-accent bg-accent-soft/30'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Hàng tồn kho ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('receivables')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'receivables'
              ? 'border-accent text-accent bg-accent-soft/30'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Công nợ Phải thu (TK 131) ({receivables.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payables')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'payables'
              ? 'border-accent text-accent bg-accent-soft/30'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4 text-neg" />
          <span>Công nợ Phải trả (TK 331) ({payables.length})</span>
        </button>
      </div>

      {/* Tab Content Rendering */}
      {activeSubTab === 'receivables' && (
        <DebtReceivableTab
          receivables={receivables}
          onChangeReceivables={setReceivables}
          showNotify={showNotify}
        />
      )}

      {activeSubTab === 'payables' && (
        <DebtPayableTab
          payables={payables}
          onChangePayables={setPayables}
          showNotify={showNotify}
        />
      )}

      {activeSubTab === 'inventory' && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG MẶT HÀNG</div>
                <div className="text-xl font-extrabold text-accent mt-0.5 font-mono">
                  {summary.totalItems} <span className="text-xs font-normal text-ink-faint">sản phẩm</span>
                </div>
              </div>
              <div className="p-2.5 bg-accent-soft rounded-lg text-accent">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase">GIÁ TRỊ ĐẦU KỲ</div>
                <div className="text-lg font-extrabold text-ink mt-0.5 font-mono">
                  {fmtMoney(summary.totalBeginningValue)}
                </div>
              </div>
              <div className="p-2.5 bg-panel-muted rounded-lg text-ink-faint">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG NHẬP − XUẤT KHO</div>
                <div className="text-sm font-bold text-ink mt-0.5 font-mono">
                  + {fmtMoney(summary.totalImportValue)}
                </div>
                <div className="text-xs font-semibold text-neg font-mono">
                  − {fmtMoney(summary.totalExportValue)}
                </div>
              </div>
              <div className="p-2.5 bg-warn-soft rounded-lg text-warn">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-lg p-3 border border-pos/30 bg-pos-soft flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-pos uppercase tracking-wide">
                  GIÁ TRỊ TỒN KHO CUỐI KỲ
                </div>
                <div className="text-xl font-black text-pos mt-0.5 font-mono">
                  {fmtMoney(summary.totalEndingValue)}
                </div>
              </div>
              <div className="p-2.5 bg-pos/20 rounded-lg text-pos">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
            <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>Thêm mặt hàng mới vào danh mục</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <input
                type="text"
                placeholder="Mã hàng (VD: SP01)"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
              />
              <input
                type="text"
                placeholder="Tên sản phẩm *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className={`rounded p-1.5 text-xs border ${UI.inputStyle} lg:col-span-2`}
              />
              <input
                type="text"
                placeholder="ĐVT (Kg, Chai, Bộ...)"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className={`rounded p-1.5 text-xs border ${UI.inputStyle}`}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Đơn giá / SP (VND)"
                value={newPriceStr}
                onChange={e => setNewPriceStr(e.target.value)}
                className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Số lượng đầu kỳ"
                value={newBegQtyStr}
                onChange={e => setNewBegQtyStr(e.target.value)}
                className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
              />
              <button
                type="submit"
                className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-3 py-1.5 rounded flex items-center justify-center space-x-1 transition-colors col-span-2 sm:col-span-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </form>

          {/* Main Table Card */}
          <div className={`${UI.containerCardBg} rounded-lg p-3 border space-y-3`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-line pb-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Tìm kiếm mã, tên mặt hàng, ĐVT..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
                />
              </div>

              <div className="flex items-center space-x-2 text-xs text-ink-faint">
                <span>Đang hiển thị <strong>{filteredItems.length}</strong> / <strong>{items.length}</strong> mặt hàng</span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllItems}
                    className="text-neg hover:underline font-semibold ml-2"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line z-10">
                  <tr>
                    <th className="p-2 text-center w-24" rowSpan={2}>MÃ HÀNG</th>
                    <th className="p-2 min-w-[200px]" rowSpan={2}>TÊN SẢN PHẨM</th>
                    <th className="p-2 text-center w-16" rowSpan={2}>ĐVT</th>
                    <th className="p-1.5 text-center border-l border-line bg-panel-muted/80" colSpan={2}>ĐẦU KỲ</th>
                    <th className="p-1.5 text-center border-l border-line bg-panel-muted/80" colSpan={2}>NHẬP KHO</th>
                    <th className="p-1.5 text-center border-l border-line bg-panel-muted/80" colSpan={2}>XUẤT KHO</th>
                    <th className="p-1.5 text-center border-l border-line bg-pos-soft text-pos font-bold" colSpan={2}>CUỐI KỲ</th>
                    <th className="p-2 text-center w-10" rowSpan={2}></th>
                  </tr>
                  <tr>
                    <th className="p-1.5 text-right border-l border-line">SỐ LƯỢNG</th>
                    <th className="p-1.5 text-right">GIÁ TRỊ (VND)</th>
                    <th className="p-1.5 text-right border-l border-line">SỐ LƯỢNG</th>
                    <th className="p-1.5 text-right">GIÁ TRỊ (VND)</th>
                    <th className="p-1.5 text-right border-l border-line">SỐ LƯỢNG</th>
                    <th className="p-1.5 text-right">GIÁ TRỊ (VND)</th>
                    <th className="p-1.5 text-right border-l border-line bg-pos-soft text-pos font-bold">SỐ LƯỢNG</th>
                    <th className="p-1.5 text-right bg-pos-soft text-pos font-bold">GIÁ TRỊ (VND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredItems.map(rawItem => {
                    const r = computeItemRow(rawItem);
                    return (
                      <tr key={r.id} className="hover:bg-panel-muted/50 transition-colors">
                        <td className="p-1">
                          <input
                            type="text"
                            value={r.code}
                            onChange={e => updateItem(r.id, { code: e.target.value })}
                            className={`${cellInputCls} text-center font-bold`}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={r.name}
                            onChange={e => updateItem(r.id, { name: e.target.value })}
                            className={`${cellInputCls} font-semibold`}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={r.unit}
                            onChange={e => updateItem(r.id, { unit: e.target.value })}
                            className={`${cellInputCls} text-center`}
                          />
                        </td>

                        {/* Đầu kỳ */}
                        <td className="p-1 border-l border-line">
                          <QtyCellInput
                            value={r.beginningQty}
                            onChange={v => updateItem(r.id, { beginningQty: v })}
                            className={`${cellInputCls} text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-ink-faint">
                          {fmtMoney(r.beginningValue)}
                        </td>

                        {/* Nhập kho */}
                        <td className="p-1 border-l border-line">
                          <QtyCellInput
                            value={r.importQty}
                            onChange={v => updateItem(r.id, { importQty: v })}
                            className={`${cellInputCls} text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-ink-faint">
                          {fmtMoney(r.importValue)}
                        </td>

                        {/* Xuất kho */}
                        <td className="p-1 border-l border-line">
                          <QtyCellInput
                            value={r.exportQty}
                            onChange={v => updateItem(r.id, { exportQty: v })}
                            className={`${cellInputCls} text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-ink-faint">
                          {fmtMoney(r.exportValue)}
                        </td>

                        {/* Cuối kỳ */}
                        <td className="p-2 text-right font-mono font-bold text-pos border-l border-line bg-pos-soft/40">
                          {r.endingQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-pos bg-pos-soft/40">
                          {fmtMoney(r.endingValue)}
                        </td>

                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(r.id)}
                            className="text-ink-faint hover:text-neg transition-colors p-1"
                            title="Xóa mặt hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
                  <tr>
                    <td className="p-2 text-center" colSpan={2}>TỔNG CỘNG ({summary.totalItems} MẶT HÀNG)</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-right font-mono border-l border-line">{summary.totalBeginningQty.toLocaleString('vi-VN')}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(summary.totalBeginningValue)}</td>
                    <td className="p-2 text-right font-mono border-l border-line">{summary.totalImportQty.toLocaleString('vi-VN')}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(summary.totalImportValue)}</td>
                    <td className="p-2 text-right font-mono border-l border-line">{summary.totalExportQty.toLocaleString('vi-VN')}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(summary.totalExportValue)}</td>
                    <td className="p-2 text-right font-mono border-l border-line text-pos text-sm bg-pos-soft/60">{summary.totalEndingQty.toLocaleString('vi-VN')}</td>
                    <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60">{fmtMoney(summary.totalEndingValue)}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Industry Template Manager Modal */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onResetTemplates={handleResetTemplates}
      />
    </div>
  );
};
