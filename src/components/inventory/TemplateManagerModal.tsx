import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, RotateCcw, Check } from 'lucide-react';
import type { InventoryCategoryTemplate, TemplateItem } from '../../data/inventoryTemplates';
import { UI } from '../../lib/uiClasses';
import { parseMoneyDecimalInput, fmtNumber } from '../../lib/utils';
import { useConfirm } from '../../context/ConfirmContext';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: InventoryCategoryTemplate[];
  onSaveTemplate: (name: string, items: TemplateItem[], templateId?: string) => void;
  onDeleteTemplate: (id: string) => void;
  onResetTemplates: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onResetTemplates,
}) => {
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [items, setItems] = useState<TemplateItem[]>([]);

  // Item form inside modal
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Cái');
  const [priceStr, setPriceStr] = useState('');
  const [begQtyStr, setBegQtyStr] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingId(null);
    setTemplateName('Ngành hàng mới');
    setItems([]);
  };

  const handleStartEdit = (tpl: InventoryCategoryTemplate) => {
    setEditingId(tpl.id);
    setTemplateName(tpl.name);
    setItems([...tpl.items]);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newItem: TemplateItem = {
      code: code.trim() || `SP${items.length + 1}`,
      name: name.trim(),
      unit: unit.trim() || 'Cái',
      unitPrice: parseMoneyDecimalInput(priceStr),
      beginningQty: parseMoneyDecimalInput(begQtyStr),
      importQty: 0,
      exportQty: 0,
    };
    setItems(prev => [...prev, newItem]);
    setCode('');
    setName('');
    setPriceStr('');
    setBegQtyStr('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!templateName.trim()) return;
    onSaveTemplate(templateName, items, editingId || undefined);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className={`${UI.containerCardBg} rounded-xl border border-line shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              QUẢN LÝ DANH MỤC MẪU NGÀNH HÀNG CHUẨN
            </h2>
            <p className="text-xs text-ink-faint">
              Thêm mới, chỉnh sửa hoặc xóa bộ danh mục hàng hóa mẫu sử dụng cho kiểm kê
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-panel-muted text-ink-faint">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {editingId !== null || templateName !== '' ? (
            /* Edit / Create Form */
            <div className="space-y-3 bg-panel-muted/40 rounded-lg p-3 border border-line">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-bold text-accent">
                  {editingId ? 'Chỉnh sửa Mẫu Ngành hàng' : 'Thêm Mẫu Ngành hàng mới'}
                </span>
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setTemplateName(''); }}
                  className="text-ink-faint hover:underline text-[11px]"
                >
                  Hủy thao tác
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">
                  Tên Ngành hàng chuẩn *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="VD: HTK Thiết bị điện gia dụng"
                  className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-bold`}
                />
              </div>

              {/* Add item mini-form */}
              <form onSubmit={handleAddItem} className="bg-panel rounded p-2.5 border border-line space-y-2">
                <div className="text-[11px] font-bold text-ink-muted">Thêm mặt hàng mẫu ({items.length} SP)</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <input
                    type="text"
                    placeholder="Mã SP"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
                  />
                  <input
                    type="text"
                    placeholder="Tên sản phẩm *"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`rounded p-1.5 text-xs border ${UI.inputStyle} sm:col-span-2`}
                  />
                  <input
                    type="text"
                    placeholder="ĐVT"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className={`rounded p-1.5 text-xs border ${UI.inputStyle}`}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Đơn giá (VND)"
                    value={priceStr}
                    onChange={e => setPriceStr(e.target.value)}
                    className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-3 py-1 rounded flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mặt hàng vào danh sách</span>
                </button>
              </form>

              {/* Items Table */}
              <div className="max-h-48 overflow-y-auto border border-line rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-panel-muted text-[10px] uppercase text-ink-faint">
                    <tr>
                      <th className="p-1.5 text-center">STT</th>
                      <th className="p-1.5">MÃ SP</th>
                      <th className="p-1.5">TÊN SẢN PHẨM</th>
                      <th className="p-1.5 text-center">ĐVT</th>
                      <th className="p-1.5 text-right">ĐƠN GIÁ</th>
                      <th className="p-1.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="p-1.5 font-bold font-mono">{it.code}</td>
                        <td className="p-1.5">{it.name}</td>
                        <td className="p-1.5 text-center">{it.unit}</td>
                        <td className="p-1.5 text-right font-mono">{fmtNumber(it.unitPrice)}</td>
                        <td className="p-1.5 text-center">
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-neg hover:underline">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-pos hover:opacity-90 text-white font-bold px-4 py-1.5 rounded flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Ngành hàng chuẩn</span>
                </button>
              </div>
            </div>
          ) : (
            /* Templates List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-accent uppercase">Danh sách {templates.length} Ngành hàng mẫu</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onResetTemplates}
                    className="text-ink-faint hover:text-neg text-xs flex items-center space-x-1"
                    title="Khôi phục về 8 ngành hàng mặc định"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mặc định</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-1.5 rounded flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Ngành hàng mới</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(tpl => (
                  <div key={tpl.id} className="bg-panel rounded-lg p-3 border border-line flex items-center justify-between hover:border-accent transition-colors">
                    <div>
                      <div className="font-bold text-ink">{tpl.name}</div>
                      <div className="text-xs text-ink-faint font-mono mt-0.5">{tpl.items.length} mặt hàng mẫu</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tpl)}
                        className="p-1.5 rounded hover:bg-panel-muted text-accent"
                        title="Sửa mẫu này"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Xóa mẫu danh mục',
                            message: `Bạn có chắc chắn muốn xóa mẫu: ${tpl.name}?`,
                            confirmText: 'Xóa mẫu',
                            tone: 'danger',
                          });
                          if (ok) {
                            onDeleteTemplate(tpl.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-panel-muted text-neg"
                        title="Xóa mẫu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
