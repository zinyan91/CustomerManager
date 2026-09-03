import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, Package, X,
} from 'lucide-react';
import type { CatalogItem } from '../../lib/shoppingChecklist';
import { fmtNumber, parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface CatalogTabProps {
  catalog: CatalogItem[];
  onAddItem: (item: Omit<CatalogItem, 'id'>) => void;
  onUpdateItem: (id: string, patch: Partial<CatalogItem>) => void;
  onRemoveItem: (id: string) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalog,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for add/edit modal
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Phòng khách');
  const [formUnit, setFormUnit] = useState('Bộ/Cái');
  const [formPriceStr, setFormPriceStr] = useState('');
  const [formNote, setFormNote] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['all', ...Array.from(set)];
  }, [catalog]);

  const filteredItems = useMemo(() => {
    return catalog.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalog, selectedCategory, searchTerm]);

  const openAddModal = () => {
    setFormCode(`VT-${String(catalog.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormCategory('Phòng khách');
    setFormUnit('Bộ/Cái');
    setFormPriceStr('');
    setFormNote('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormPriceStr(item.defaultPrice ? formatMoneyInput(String(item.defaultPrice)) : '');
    setFormNote(item.note || '');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const price = parseMoneyDecimalInput(formPriceStr);

    if (editingItem) {
      onUpdateItem(editingItem.id, {
        code: formCode.trim() || editingItem.code,
        name: formName.trim(),
        category: formCategory.trim() || 'Khác',
        unit: formUnit.trim() || 'Bộ/Cái',
        defaultPrice: price,
        note: formNote.trim(),
      });
      setEditingItem(null);
    } else {
      onAddItem({
        code: formCode.trim() || `VT-${String(catalog.length + 1).padStart(3, '0')}`,
        name: formName.trim(),
        category: formCategory.trim() || 'Khác',
        unit: formUnit.trim() || 'Bộ/Cái',
        defaultPrice: price,
        note: formNote.trim(),
      });
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      {/* Search & Actions Bar */}
      <div className="p-4 rounded-2xl border border-line/70 bg-panel/85 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên vật dụng hoặc nhóm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl ${UI.inputStyle}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'bg-surface hover:bg-surface/80 text-ink-muted border border-line/60'
                }`}
              >
                {cat === 'all' ? 'Tất cả danh mục' : cat}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-accent-ink font-bold shadow-md shadow-accent/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm vật phẩm mới</span>
        </button>
      </div>

      {/* Catalog Table */}
      <div className="rounded-2xl border border-line/70 overflow-hidden bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface/90 border-b border-line/70 text-[11px] font-bold text-ink-muted select-none">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-28">MÃ VẬT TƯ</th>
                <th className="py-3 px-4 min-w-[240px]">TÊN HẠNG MỤC / VẬT DỤNG</th>
                <th className="py-3 px-3 w-36">DANH MỤC</th>
                <th className="py-3 px-3 text-center w-24">ĐVT</th>
                <th className="py-3 px-4 text-right w-36">ĐƠN GIÁ THAM CHIẾU</th>
                <th className="py-3 px-4 min-w-[160px]">GHI CHÚ</th>
                <th className="py-3 px-3 text-center w-20">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-faint">
                    Không tìm thấy vật phẩm nào trong kho lưu trữ.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 px-3 text-center text-ink-faint font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-accent text-xs">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-ink text-xs">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-line/60 text-ink-muted text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-ink-muted">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-ink">
                      {fmtNumber(item.defaultPrice)} VNĐ
                    </td>
                    <td className="py-2.5 px-4 text-ink-muted italic">
                      {item.note || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-ink-faint hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa vật phẩm "${item.name}"?`)) {
                              onRemoveItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg/10 transition-colors cursor-pointer"
                          title="Xóa vật phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3 bg-surface/50 border-t border-line/60 flex items-center justify-between text-ink-muted text-xs">
          <span>
            Tổng cộng: <strong className="text-ink">{catalog.length}</strong> vật phẩm trong thư viện
          </span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingItem) && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
        >
          <div
            className={`${UI.containerCardBg} rounded-2xl border border-line-strong shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-app`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-line bg-panel-muted/70 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-ink uppercase">
                  {editingItem ? `SỬA VẬT PHẨM: ${editingItem.name}` : 'THÊM VẬT PHẨM MỚI VÀO KHO'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-panel cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${UI.labelStyle}`}>Mã vật tư</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    className={`w-full p-2.5 rounded-xl font-mono font-bold ${UI.inputStyle}`}
                    placeholder="VT-001"
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${UI.labelStyle}`}>Danh mục</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl font-semibold ${UI.inputStyle}`}
                  >
                    <option value="Phòng khách">Phòng khách</option>
                    <option value="Bếp & Phòng ăn">Bếp & Phòng ăn</option>
                    <option value="Phòng ngủ">Phòng ngủ</option>
                    <option value="Phòng thờ">Phòng thờ</option>
                    <option value="Sân thượng & Cây cảnh">Sân thượng & Cây cảnh</option>
                    <option value="Thiết bị">Thiết bị</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Tên vật phẩm / Hạng mục *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl font-bold text-ink ${UI.inputStyle}`}
                  placeholder="VD: Bộ Sofa Gỗ Gõ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${UI.labelStyle}`}>Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className={`w-full p-2.5 rounded-xl ${UI.inputStyle}`}
                    placeholder="Bộ/Cái/Chậu..."
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${UI.labelStyle}`}>Đơn giá tham chiếu (VNĐ)</label>
                  <input
                    type="text"
                    value={formPriceStr}
                    onChange={e => setFormPriceStr(e.target.value)}
                    className={`w-full p-2.5 rounded-xl font-mono text-accent font-bold ${UI.inputStyle}`}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Ghi chú kỹ thuật / Mô tả</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  className={`w-full p-2.5 rounded-xl ${UI.inputStyle}`}
                  placeholder="Kích thước, chất liệu, phụ kiện..."
                />
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-ink-muted hover:text-ink hover:bg-panel cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent hover:opacity-90 text-accent-ink font-bold shadow-md shadow-accent/20 cursor-pointer"
                >
                  Lưu vật phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
