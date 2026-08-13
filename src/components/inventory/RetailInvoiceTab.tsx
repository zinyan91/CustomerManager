import React, { useState, useMemo } from 'react';
import {
  Receipt, Plus, Trash2, Download, Printer, Settings2, Search, Save, History,
} from 'lucide-react';
import {
  computeRetailInvoiceItem, computeRetailInvoiceSummary, nextInvoiceId,
  type RetailInvoiceItem, type RetailInvoiceHeader, type RetailInvoiceTemplate,
} from '../../lib/statement';
import {
  loadRetailInvoiceTemplates, addRetailInvoiceTemplate, updateRetailInvoiceTemplate,
  deleteRetailInvoiceTemplate, resetRetailInvoiceTemplates,
} from '../../lib/statementStore';
import {
  fetchRetailInvoicesDb, saveRetailInvoiceDb, deleteRetailInvoiceDb,
  type SavedRetailInvoice,
} from '../../lib/statementDb';
import { buildRetailInvoiceXlsx, buildRetailInvoiceDocHtml } from '../../lib/inventoryExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { fmtMoney, parseMoneyDecimalInput, todayIso, fmtDate } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { StatementTemplateModal } from './StatementTemplateModal';

interface RetailInvoiceTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const RetailInvoiceTab: React.FC<RetailInvoiceTabProps> = ({ showNotify }) => {
  const [templates, setTemplates] = useState<RetailInvoiceTemplate[]>(loadRetailInvoiceTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id || 'ret-hair-spa');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  const [headerInfo, setHeaderInfo] = useState<RetailInvoiceHeader>({
    buyerName: 'Chị Tâm',
    buyerAddress: 'Phường 1, Tây Ninh',
    shopName: 'SALON & SPA MINH THƯ',
    invoiceDateStr: fmtDate(todayIso()),
  });

  const [items, setItems] = useState<RetailInvoiceItem[]>(() => {
    const tpl = templates[0];
    return tpl ? tpl.items.map(it => ({ ...it, id: nextInvoiceId() })) : [];
  });

  const [savedInvoices, setSavedInvoices] = useState<SavedRetailInvoice[]>([]);
  const [currentInvId, setCurrentInvId] = useState<string>(() => nextInvoiceId());
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Fetch saved invoices from Database on mount
  React.useEffect(() => {
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

  const [searchTerm, setSearchTerm] = useState('');

  // Form inputs
  const [newItemName, setNewItemName] = useState('');
  const [newUnit, setNewUnit] = useState('Chai');
  const [newQtyStr, setNewQtyStr] = useState('');
  const [newPriceStr, setNewPriceStr] = useState('');

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      if (tpl.headerInfo) {
        setHeaderInfo(prev => ({ ...prev, ...tpl.headerInfo }));
      }
      setItems(tpl.items.map(it => ({ ...it, id: nextInvoiceId() })));
      showNotify('success', `Đã nạp Hóa đơn mẫu: ${tpl.name}`);
    }
  };

  const handleSaveTemplate = (name: string, tplItems: any[], templateId?: string) => {
    let updated: RetailInvoiceTemplate[];
    if (templateId) {
      updated = updateRetailInvoiceTemplate(templateId, name, headerInfo, tplItems);
      showNotify('success', `Đã cập nhật Hóa đơn mẫu: ${name}`);
    } else {
      const res = addRetailInvoiceTemplate(name, headerInfo, tplItems);
      updated = res.templates;
      setSelectedTemplateId(res.newTemplate.id);
      setItems(res.newTemplate.items.map(it => ({ ...it, id: nextInvoiceId() })));
      showNotify('success', `Đã tạo Hóa đơn mẫu mới: ${name}`);
    }
    setTemplates(updated);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = deleteRetailInvoiceTemplate(id);
    setTemplates(updated);
    if (selectedTemplateId === id && updated[0]) {
      setSelectedTemplateId(updated[0].id);
      setItems(updated[0].items.map(it => ({ ...it, id: nextInvoiceId() })));
    }
    showNotify('success', 'Đã xóa ngành hàng mẫu.');
  };

  const handleResetTemplates = () => {
    const defaults = resetRetailInvoiceTemplates();
    setTemplates(defaults);
    setSelectedTemplateId(defaults[0].id);
    setItems(defaults[0].items.map(it => ({ ...it, id: nextInvoiceId() })));
    showNotify('success', 'Đã khôi phục về ngành hàng mặc định.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showNotify('error', 'Vui lòng nhập tên hàng hóa / dịch vụ.');
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
    return items.filter(it => it.itemName.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const handleExportExcel = () => {
    if (items.length === 0) {
      showNotify('error', 'Chưa có dữ liệu nào để xuất Excel.');
      return;
    }
    const bytes = buildRetailInvoiceXlsx(items, headerInfo);
    downloadBytes(bytes, `HOA_DON_BAN_LE_${todayIso()}.xlsx`, MIME_XLSX);
    showNotify('success', 'Đã xuất Hóa đơn bán lẻ (.xlsx).');
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showNotify('error', 'Chưa có mặt hàng nào để in.');
      return;
    }
    const html = buildRetailInvoiceDocHtml(items, headerInfo);
    const title = headerInfo.buyerName ? `HÓA ĐƠN BÁN LẺ - ${headerInfo.buyerName}` : 'HÓA ĐƠN BÁN LẺ';
    printHtmlDoc(html, title);
  };

  const cellInputCls = 'w-full bg-transparent text-xs p-1 rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className="space-y-4 text-xs">
      {/* Header Controls */}
      <div className={`${UI.containerCardBg} rounded-lg p-4 border space-y-3`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-accent-soft rounded-lg text-accent">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
                HÓA ĐƠN BÁN LẺ (TIỆM TÓC, SPA, CỬA HÀNG...)
              </h2>
              <p className="text-xs text-ink-faint">
                Lập hóa đơn bán lẻ sản phẩm & dịch vụ trực quan cho cửa hàng kinh doanh
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={handleSaveToDb}
              title="Lưu chứng từ Hóa đơn bán lẻ vào CSDL Supabase"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu CSDL</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              title="Xem danh sách Hóa đơn bán lẻ đã lưu trong CSDL"
              className="bg-panel-muted hover:bg-line text-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 border border-line transition-colors relative"
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử ({savedInvoices.length})</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-panel-muted hover:bg-line text-ink text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center space-x-1.5 border border-line transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Hóa đơn</span>
            </button>
          </div>
        </div>

        {/* Form Header Info & Template selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
                Ngành hàng mẫu ({templates.length})
              </label>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-[11px] font-bold text-accent hover:underline flex items-center space-x-1"
              >
                <Settings2 className="w-3 h-3" />
                <span>Quản lý</span>
              </button>
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => handleSelectTemplate(e.target.value)}
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle} font-bold`}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Tên Cửa hàng / Tiệm</label>
            <input
              type="text"
              value={headerInfo.shopName}
              onChange={e => setHeaderInfo({ ...headerInfo, shopName: e.target.value })}
              placeholder="VD: SALON & SPA MINH THƯ"
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-bold`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Họ tên người mua hàng</label>
            <input
              type="text"
              value={headerInfo.buyerName}
              onChange={e => setHeaderInfo({ ...headerInfo, buyerName: e.target.value })}
              placeholder="VD: Chị Tâm"
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Địa chỉ mua hàng</label>
            <input
              type="text"
              value={headerInfo.buyerAddress}
              onChange={e => setHeaderInfo({ ...headerInfo, buyerAddress: e.target.value })}
              placeholder="VD: Phường 1, Tây Ninh"
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">MẶT HÀNG TRÊN HÓA ĐƠN</div>
          <div className="text-xl font-extrabold text-accent mt-0.5 font-mono">
            {summary.totalItems} <span className="text-xs font-normal text-ink-faint">sản phẩm/dịch vụ</span>
          </div>
        </div>
        <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
          <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG SỐ LƯỢNG SẢN PHẨM</div>
          <div className="text-xl font-extrabold text-ink mt-0.5 font-mono">
            {summary.totalQty.toLocaleString('vi-VN')}
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
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Thêm mặt hàng / dịch vụ vào hóa đơn</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Tên hàng hóa, dịch vụ *"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} sm:col-span-2`}
          />
          <input
            type="text"
            placeholder="ĐVT (Chai, Hộp...)"
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
            className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-4 py-1.5 rounded flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào Hóa đơn</span>
          </button>
        </div>
      </form>

      {/* Items Table */}
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
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2 text-center w-12">STT</th>
                <th className="p-2 min-w-[220px]">TÊN HÀNG HÓA / DỊCH VỤ</th>
                <th className="p-2 text-center w-20">ĐVT</th>
                <th className="p-2 text-right w-28">SỐ LƯỢNG</th>
                <th className="p-2 text-right w-36">ĐƠN GIÁ (VND)</th>
                <th className="p-2 text-right w-40 bg-pos-soft text-pos font-bold">THÀNH TIỀN (VND)</th>
                <th className="p-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map((rawItem, idx) => {
                const c = computeRetailInvoiceItem(rawItem);
                return (
                  <tr key={c.id} className="hover:bg-panel-muted/50 transition-colors">
                    <td className="p-2 text-center font-mono font-bold text-ink-faint">{idx + 1}</td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.itemName}
                        onChange={e => updateItem(c.id, { itemName: e.target.value })}
                        className={`${cellInputCls} font-bold`}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.unit}
                        onChange={e => updateItem(c.id, { unit: e.target.value })}
                        className={`${cellInputCls} text-center`}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={c.qty.toLocaleString('vi-VN')}
                        onChange={e => updateItem(c.id, { qty: parseMoneyDecimalInput(e.target.value) })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={c.unitPrice.toLocaleString('vi-VN')}
                        onChange={e => updateItem(c.id, { unitPrice: parseMoneyDecimalInput(e.target.value) })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-pos bg-pos-soft/40">
                      {fmtMoney(c.amount)}
                    </td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeItem(c.id)} className="text-ink-faint hover:text-neg p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
              <tr>
                <td className="p-2 text-center" colSpan={3}>TỔNG CỘNG THÀNH TIỀN</td>
                <td className="p-2 text-right font-mono">{summary.totalQty.toLocaleString('vi-VN')}</td>
                <td className="p-2"></td>
                <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60">{fmtMoney(summary.totalAmount)}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <StatementTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Hóa đơn bán lẻ"
        templates={templates}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onResetTemplates={handleResetTemplates}
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
                className="text-ink-faint hover:text-ink font-bold text-sm px-2"
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
                        className="text-ink-faint hover:text-neg p-1.5 rounded hover:bg-neg-soft/30 transition-colors"
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
