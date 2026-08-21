import React, { useState } from 'react';
import { BTN_PRIMARY, BTN_SECONDARY, UI } from '../../lib/uiClasses';
import { Plus, Trash2, FolderPlus, RefreshCw, Check, Sparkles } from 'lucide-react';
import type { SaleCatalogProfile } from '../../lib/saleCatalogStore';
import type { SaleItem } from './DocumentForm';

interface SaleCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogs: SaleCatalogProfile[];
  currentCatalogId: string;
  onSelectCatalog: (catalog: SaleCatalogProfile) => void;
  onSaveNewCatalog: (name: string, category: string, items: SaleItem[]) => void;
  onDeleteCatalog: (id: string) => void;
  onResetDefaults: () => void;
  currentSaleItems: SaleItem[];
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

export const SaleCatalogModal: React.FC<SaleCatalogModalProps> = ({
  isOpen,
  onClose,
  catalogs,
  currentCatalogId,
  onSelectCatalog,
  onSaveNewCatalog,
  onDeleteCatalog,
  onResetDefaults,
  currentSaleItems,
}) => {
  const [tab, setTab] = useState<'create' | 'manage'>('create');
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCategory, setNewCategory] = useState('Bách hóa / Tiêu dùng');
  const [copyCurrentItems, setCopyCurrentItems] = useState(true);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatalogName.trim()) return;

    const itemsToSave = copyCurrentItems && currentSaleItems.length > 0
      ? currentSaleItems.map(item => ({ ...item, id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }))
      : [
          { id: `${Date.now()}-1`, name: 'Mặt hàng mẫu 1', unit: 'Cái', quantity: 10, price: 100000 },
        ];

    onSaveNewCatalog(newCatalogName.trim(), newCategory.trim(), itemsToSave);
    setNewCatalogName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="p-0 border-b border-line/60 pb-3 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
              <Sparkles size={16} />
            </div>
            <DialogTitle className="font-bold text-sm text-ink uppercase tracking-tight">
              Quản Lý Bộ Danh Mục Hàng Hóa
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-line/60 pb-2.5">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-accent text-accent-ink shadow-md shadow-accent/20'
                : 'bg-surface hover:bg-surface-elevated text-ink-muted border border-line/70'
            }`}
          >
            <FolderPlus size={13} className="inline mr-1.5" />
            Tạo bộ mẫu mới
          </button>
          <button
            type="button"
            onClick={() => setTab('manage')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'manage'
                ? 'bg-accent text-accent-ink shadow-md shadow-accent/20'
                : 'bg-surface hover:bg-surface-elevated text-ink-muted border border-line/70'
            }`}
          >
            Danh sách bộ mẫu ({catalogs.length})
          </button>
        </div>

        {/* Tab 1: Create New Catalog */}
        {tab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-ink">Tên bộ danh mục hàng hóa *</label>
              <input
                type="text"
                required
                placeholder="VD: 🔩 Tiệm Kim Khí - Điện Nước, 👗 Shop Thời Trang..."
                value={newCatalogName}
                onChange={e => setNewCatalogName(e.target.value)}
                className={`w-full rounded-xl p-2.5 border ${UI.inputStyle}`}
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-ink">Nhóm ngành nghề / Thể loại</label>
              <input
                type="text"
                placeholder="VD: Kim khí, Thời trang, Phụ tùng, Nông nghiệp..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className={`w-full rounded-xl p-2.5 border ${UI.inputStyle}`}
              />
            </div>

            <div className="p-3.5 rounded-xl border border-line/70 bg-surface/60 space-y-2 shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink select-none">
                <input
                  type="checkbox"
                  checked={copyCurrentItems}
                  onChange={e => setCopyCurrentItems(e.target.checked)}
                  className="rounded text-accent focus:ring-accent w-4 h-4"
                />
                <span>Lưu {currentSaleItems.length} mặt hàng đang nhập trên màn hình vào bộ mẫu này</span>
              </label>
              {copyCurrentItems && currentSaleItems.length > 0 && (
                <div className="text-[11px] text-ink-faint pl-6">
                  Bộ mẫu mới sẽ bao gồm toàn bộ đơn giá, số lượng và tên mặt hàng bạn vừa chỉnh sửa.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line/60">
              <button
                type="button"
                onClick={onClose}
                className={`${BTN_SECONDARY} text-xs py-2 px-3.5 rounded-xl cursor-pointer`}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!newCatalogName.trim()}
                className={`${BTN_PRIMARY} text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-accent/20 cursor-pointer`}
              >
                <Plus size={14} /> Lưu & Áp dụng ngay
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Manage Existing Catalogs */}
        {tab === 'manage' && (
          <div className="space-y-3 text-xs">
            <div className="max-h-72 overflow-y-auto divide-y divide-line/60 pr-1 space-y-1">
              {catalogs.map(cat => {
                const isSelected = cat.id === currentCatalogId;
                return (
                  <div
                    key={cat.id}
                    className={`p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-accent-soft border border-accent/40' : 'hover:bg-surface/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-ink flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {cat.isBuiltin && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface text-ink-faint border border-line/70">
                            Mẫu chuẩn
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold text-accent flex items-center gap-0.5">
                            <Check size={11} /> Đang dùng
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-faint">
                        {cat.category} • {cat.items.length} mặt hàng
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCatalog(cat);
                            onClose();
                          }}
                          className={`${BTN_SECONDARY} text-[11px] py-1 px-3 rounded-xl cursor-pointer`}
                        >
                          Chọn
                        </button>
                      )}
                      {!cat.isBuiltin && (
                        <button
                          type="button"
                          onClick={() => onDeleteCatalog(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-neg-soft text-ink-faint hover:text-neg transition-colors cursor-pointer"
                          title="Xóa bộ mẫu này"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line/60">
              <button
                type="button"
                onClick={onResetDefaults}
                className="text-ink-faint hover:text-ink text-[11px] flex items-center gap-1 cursor-pointer"
                title="Khôi phục danh sách mẫu gốc"
              >
                <RefreshCw size={12} /> Khôi phục mẫu gốc
              </button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
