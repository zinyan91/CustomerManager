import React, { useState, useMemo } from 'react';
import { X, Search, Check, Plus, Package } from 'lucide-react';
import type { CatalogItem } from '../../lib/shoppingChecklist';
import { fmtNumber } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface CatalogPickerModalProps {
  catalog: CatalogItem[];
  roomName: string;
  onSelect: (items: CatalogItem[]) => void;
  onClose: () => void;
}

export const CatalogPickerModal: React.FC<CatalogPickerModalProps> = ({
  catalog,
  roomName,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(it => next.add(it.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(it => next.delete(it.id));
      return next;
    });
  };

  const handleConfirm = () => {
    const itemsToAdd = catalog.filter(it => selectedIds.has(it.id));
    if (itemsToAdd.length > 0) {
      onSelect(itemsToAdd);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`${UI.containerCardBg} rounded-2xl border border-line-strong shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-app`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink uppercase tracking-tight">
                CHỌN VẬT DỤNG TỪ KHO THƯ VIỆN
              </h3>
              <p className="text-[11px] text-ink-faint">
                Đưa vào khu vực: <strong className="text-accent">{roomName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-panel transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-line/60 bg-surface/40 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm kiếm vật phẩm theo tên, mã hoặc loại..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl ${UI.inputStyle}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'bg-panel-muted text-ink-muted hover:text-ink hover:bg-panel'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 text-ink-muted">
            <span>
              Tìm thấy <strong>{filteredItems.length}</strong> vật phẩm (Đã chọn:{' '}
              <strong className="text-accent">{selectedIds.size}</strong>)
            </span>
            <div className="space-x-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-accent hover:underline font-semibold cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={deselectAllFiltered}
                className="text-ink-faint hover:text-ink cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-ink-faint">
              Không tìm thấy vật phẩm nào phù hợp
            </div>
          ) : (
            filteredItems.map(item => {
              const isChecked = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-accent/10 border-accent/60 shadow-2xs'
                      : 'bg-surface/60 border-line/60 hover:bg-surface hover:border-line'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-accent border-accent text-accent-ink'
                          : 'border-line-strong bg-panel'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-ink truncate text-xs">{item.name}</div>
                      <div className="text-[10px] text-ink-faint flex items-center gap-2">
                        <span className="font-mono">{item.code}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-panel-muted text-ink-muted font-medium">
                          {item.category}
                        </span>
                        <span>•</span>
                        <span>ĐVT: {item.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div className="font-bold font-mono text-accent text-xs">
                      {fmtNumber(item.defaultPrice)} VNĐ
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="text-xs text-ink-muted">
            Đã chọn <strong className="text-accent">{selectedIds.size}</strong> mục
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-ink-muted hover:text-ink hover:bg-panel cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-accent hover:opacity-90 disabled:opacity-50 text-accent-ink font-bold shadow-md shadow-accent/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} vào phòng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
