import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Trash2, Download, Printer, Settings2, Search,
} from 'lucide-react';
import {
  computeStatementItem, computeStatementSummary, nextStatementId,
  type StatementItem, type StatementSellerInfo, type StatementTemplate,
} from '../../lib/statement';
import {
  loadStatementTemplates, addStatementTemplate, updateStatementTemplate,
  deleteStatementTemplate, resetStatementTemplates,
} from '../../lib/statementStore';
import { buildPurchaseStatementXlsx, buildPurchaseStatementDocHtml } from '../../lib/inventoryExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { fmtMoney, parseMoneyDecimalInput, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { StatementTemplateModal } from './StatementTemplateModal';

interface PurchaseStatementTabProps {
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const PurchaseStatementTab: React.FC<PurchaseStatementTabProps> = ({ showNotify }) => {
  const [templates, setTemplates] = useState<StatementTemplate[]>(loadStatementTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id || 'stmt-nuoc-hoa');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  const [sellerInfo, setSellerInfo] = useState<StatementSellerInfo>({
    sellerName: 'LÊ THỊ HOÀNG ÂN',
    sellerAddress: 'TP.HCM',
    sellerBankAcc: 'STK: 9975639612 - Ngân hàng Techcombank CN HCM',
    sellerIdCard: '080166012861',
    buyerName: 'NGUYỄN THÙY DUNG',
    buyerIdCard: '051188004003',
    statementDateStr: todayIso(),
  });

  const [items, setItems] = useState<StatementItem[]>(() => {
    const tpl = templates[0];
    return tpl ? tpl.items.map(it => ({ ...it, id: nextStatementId() })) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newUnit, setNewUnit] = useState('Chai');
  const [newQtyStr, setNewQtyStr] = useState('');
  const [newPriceStr, setNewPriceStr] = useState('');
  const [newNote, setNewNote] = useState('');

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      if (tpl.sellerInfo) {
        setSellerInfo(prev => ({ ...prev, ...tpl.sellerInfo }));
      }
      setItems(tpl.items.map(it => ({ ...it, id: nextStatementId() })));
      showNotify('success', `Đã nạp Mẫu bảng kê: ${tpl.name}`);
    }
  };

  const handleSaveTemplate = (name: string, tplItems: any[], templateId?: string) => {
    let updated: StatementTemplate[];
    if (templateId) {
      updated = updateStatementTemplate(templateId, name, sellerInfo, tplItems);
      showNotify('success', `Đã cập nhật Mẫu bảng kê: ${name}`);
    } else {
      const res = addStatementTemplate(name, sellerInfo, tplItems);
      updated = res.templates;
      setSelectedTemplateId(res.newTemplate.id);
      setItems(res.newTemplate.items.map(it => ({ ...it, id: nextStatementId() })));
      showNotify('success', `Đã tạo Mẫu bảng kê mới: ${name}`);
    }
    setTemplates(updated);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = deleteStatementTemplate(id);
    setTemplates(updated);
    if (selectedTemplateId === id && updated[0]) {
      setSelectedTemplateId(updated[0].id);
      setItems(updated[0].items.map(it => ({ ...it, id: nextStatementId() })));
    }
    showNotify('success', 'Đã xóa ngành hàng mẫu.');
  };

  const handleResetTemplates = () => {
    const defaults = resetStatementTemplates();
    setTemplates(defaults);
    setSelectedTemplateId(defaults[0].id);
    setItems(defaults[0].items.map(it => ({ ...it, id: nextStatementId() })));
    showNotify('success', 'Đã khôi phục về ngành hàng mặc định.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showNotify('error', 'Vui lòng nhập tên hàng hóa, dịch vụ.');
      return;
    }
    const item: StatementItem = {
      id: nextStatementId(),
      dateStr: '…../…../2024',
      itemName: newItemName.trim(),
      unit: newUnit.trim() || 'Cái',
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
    return items.filter(it => it.itemName.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const handleExportExcel = () => {
    if (items.length === 0) {
      showNotify('error', 'Chưa có dữ liệu nào để xuất Excel.');
      return;
    }
    const bytes = buildPurchaseStatementXlsx(items, sellerInfo);
    downloadBytes(bytes, `BANG_KE_MUA_BAN_${todayIso()}.xlsx`, MIME_XLSX);
    showNotify('success', 'Đã xuất Bảng kê mua bán (.xlsx).');
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showNotify('error', 'Chưa có mặt hàng nào để in.');
      return;
    }
    const html = buildPurchaseStatementDocHtml(items, sellerInfo);
    const title = sellerInfo.sellerName ? `BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ - ${sellerInfo.sellerName}` : 'BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ';
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
                BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ
              </h2>
              <p className="text-xs text-ink-faint">
                Lập chứng từ Bảng kê mua bán hàng hóa dịch vụ theo chuẩn pháp lý ngân hàng
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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

        {/* Info & Industry Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] uppercase tracking-wide ${UI.labelStyle}`}>
                Chọn mẫu ngành hàng ({templates.length})
              </label>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-[11px] font-bold text-accent hover:underline flex items-center space-x-1"
              >
                <Settings2 className="w-3 h-3" />
                <span>Quản lý ngành hàng</span>
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

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Bên bán hàng (Họ tên)</label>
              <input
                type="text"
                value={sellerInfo.sellerName}
                onChange={e => setSellerInfo({ ...sellerInfo, sellerName: e.target.value })}
                className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-bold`}
              />
            </div>
            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">CMND/CCCD số Bên bán</label>
              <input
                type="text"
                value={sellerInfo.sellerIdCard}
                onChange={e => setSellerInfo({ ...sellerInfo, sellerIdCard: e.target.value })}
                className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
              />
            </div>
            <div>
              <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Hình thức thanh toán</label>
              <select
                value={sellerInfo.paymentMethod || 'transfer'}
                onChange={e => setSellerInfo({ ...sellerInfo, paymentMethod: e.target.value as 'transfer' | 'cash' })}
                className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-bold`}
              >
                <option value="transfer">Chuyển khoản (Có STK)</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </div>

            {sellerInfo.paymentMethod !== 'cash' && (
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                  Thông tin STK / Ngân hàng (Hiển thị tại ô D15 trong bảng)
                </label>
                <input
                  type="text"
                  placeholder="VD: STK: 9975639612 - Ngân hàng Techcombank CN HCM"
                  value={sellerInfo.sellerBankAcc}
                  onChange={e => setSellerInfo({ ...sellerInfo, sellerBankAcc: e.target.value, customStkText: undefined })}
                  className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
                />
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
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Thêm mặt hàng mua bán</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Tên hàng hóa / dịch vụ *"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} sm:col-span-2`}
          />
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
            className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-4 py-1.5 rounded flex items-center space-x-1"
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
                <th className="p-2 text-center w-28">NGÀY THÁNG</th>
                <th className="p-2 min-w-[200px]">TÊN HÀNG HÓA, DỊCH VỤ</th>
                <th className="p-2 text-center w-20">ĐVT</th>
                <th className="p-2 text-right w-28">SỐ LƯỢNG</th>
                <th className="p-2 text-right w-36">ĐƠN GIÁ (VND)</th>
                <th className="p-2 text-right w-40 bg-pos-soft text-pos font-bold">THÀNH TIỀN (VND)</th>
                <th className="p-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map(rawItem => {
                const c = computeStatementItem(rawItem);
                return (
                  <tr key={c.id} className="hover:bg-panel-muted/50 transition-colors">
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.dateStr}
                        onChange={e => updateItem(c.id, { dateStr: e.target.value })}
                        className={`${cellInputCls} text-center`}
                      />
                    </td>
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

      <StatementTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Bảng kê mua bán"
        templates={templates}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onResetTemplates={handleResetTemplates}
      />
    </div>
  );
};
