import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, CheckSquare, Square, Package, Plus, Layers } from 'lucide-react';
import { fetchInventoryItemsDb } from '../../lib/inventoryDb';
import { loadInventoryTemplates } from '../../lib/templateStore';
import type { InventoryCategoryTemplate } from '../../data/inventoryTemplates';
import type { InventoryItem } from '../../lib/inventory';
import { UI } from '../../lib/uiClasses';
import { fmtMoney, formatMoneyInput, parseMoneyDecimalInput } from '../../lib/utils';

export interface SelectedInventoryItemPayload {
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  qty: number;
}

export interface InventoryItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (selected: SelectedInventoryItemPayload[]) => void;
  title?: string;
  defaultQtyType?: 'import' | 'export' | 'ending';
}

export const InventoryItemPickerModal: React.FC<InventoryItemPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectItems,
  title = 'CHỌN MẶT HÀNG TỪ KHO',
  defaultQtyType = 'import',
}) => {
  const [templates, setTemplates] = useState<InventoryCategoryTemplate[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [customQuantities, setCustomQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const tpls = loadInventoryTemplates();
      setTemplates(tpls);

      fetchInventoryItemsDb()
        .then(dbItems => {
          // If DB has items, use them; if empty, provide items from all templates
          let itemsToShow: InventoryItem[] = dbItems || [];
          if (itemsToShow.length === 0 && tpls.length > 0) {
            const allTplItems: InventoryItem[] = [];
            tpls.forEach((t, tIdx) => {
              t.items.forEach((it, iIdx) => {
                allTplItems.push({
                  id: `tpl_${tIdx}_${iIdx}`,
                  code: it.code,
                  name: it.name,
                  unit: it.unit,
                  unitPrice: it.unitPrice,
                  beginningQty: it.beginningQty,
                  importQty: it.importQty,
                  exportQty: it.exportQty,
                });
              });
            });
            itemsToShow = allTplItems;
          }

          setInventoryList(itemsToShow);
          setSelectedIds({});
          const initialQty: Record<string, string> = {};
          itemsToShow.forEach(it => {
            let defaultQty = 1;
            if (defaultQtyType === 'import' && it.importQty > 0) defaultQty = it.importQty;
            else if (defaultQtyType === 'export' && it.exportQty > 0) defaultQty = it.exportQty;
            else if (it.beginningQty > 0) defaultQty = it.beginningQty;
            initialQty[it.id] = formatMoneyInput(String(defaultQty));
          });
          setCustomQuantities(initialQty);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, defaultQtyType]);

  // Handle changing category / industry
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    if (catId === 'all') {
      fetchInventoryItemsDb().then(dbItems => {
        if (dbItems && dbItems.length > 0) {
          setInventoryList(dbItems);
        }
      });
    } else {
      const found = templates.find(t => t.id === catId);
      if (found) {
        const catItems: InventoryItem[] = found.items.map((it, idx) => ({
          id: `tpl_${found.id}_${idx}`,
          code: it.code,
          name: it.name,
          unit: it.unit,
          unitPrice: it.unitPrice,
          beginningQty: it.beginningQty,
          importQty: it.importQty,
          exportQty: it.exportQty,
        }));
        setInventoryList(catItems);
        const initialQty: Record<string, string> = {};
        catItems.forEach(it => {
          let defaultQty = 1;
          if (defaultQtyType === 'import' && it.importQty > 0) defaultQty = it.importQty;
          else if (defaultQtyType === 'export' && it.exportQty > 0) defaultQty = it.exportQty;
          else if (it.beginningQty > 0) defaultQty = it.beginningQty;
          initialQty[it.id] = formatMoneyInput(String(defaultQty));
        });
        setCustomQuantities(initialQty);
      }
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return inventoryList;
    const term = searchTerm.toLowerCase();
    return inventoryList.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [inventoryList, searchTerm]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredItems.length > 0 && filteredItems.every(it => selectedIds[it.id]);
    const next: Record<string, boolean> = { ...selectedIds };
    filteredItems.forEach(it => {
      next[it.id] = !allSelected;
    });
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selectedItems: SelectedInventoryItemPayload[] = [];
    inventoryList.forEach(it => {
      if (selectedIds[it.id]) {
        const qtyVal = parseMoneyDecimalInput(customQuantities[it.id] || '1');
        selectedItems.push({
          code: it.code,
          name: it.name,
          unit: it.unit || 'Cái',
          unitPrice: it.unitPrice || 0,
          qty: qtyVal > 0 ? qtyVal : 1,
        });
      }
    });

    if (selectedItems.length > 0) {
      onSelectItems(selectedItems);
    }
    onClose();
  };

  const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(it => selectedIds[it.id]);
  const hasSelection = Object.values(selectedIds).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-xl border border-line-strong shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-xs`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-ink uppercase">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Category Selector & Search & Batch select */}
        <div className="p-3 border-b border-line bg-panel flex flex-wrap items-center justify-between gap-2.5">
          {/* Category / Industry dropdown */}
          <div className="flex items-center space-x-2 min-w-[220px]">
            <Layers className="w-4 h-4 text-accent shrink-0" />
            <select
              value={selectedCategoryId}
              onChange={e => handleCategoryChange(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-md font-bold text-xs ${UI.inputStyle}`}
            >
              <option value="all">Tất cả danh mục kho</option>
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm theo mã hàng, tên sản phẩm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md ${UI.inputStyle}`}
            />
          </div>

          {/* Select all toggle */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1.5 rounded border border-line hover:border-accent text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isAllFilteredSelected ? <CheckSquare className="w-3.5 h-3.5 text-accent" /> : <Square className="w-3.5 h-3.5 text-ink-faint" />}
            <span>{isAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
          </button>
        </div>

        {/* Product List Table */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-12 text-ink-faint">Đang nạp danh sách kho hàng...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-ink-faint">
              Không tìm thấy sản phẩm nào khớp với tìm kiếm.
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-panel-muted border-b border-line text-ink-faint font-bold uppercase text-[10px]">
                    <th className="p-2 w-10 text-center">Chọn</th>
                    <th className="p-2">Mã SP</th>
                    <th className="p-2">Tên sản phẩm</th>
                    <th className="p-2 text-center">ĐVT</th>
                    <th className="p-2 text-right">Đơn giá kho</th>
                    <th className="p-2 text-right w-28">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredItems.map(item => {
                    const isChecked = Boolean(selectedIds[item.id]);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`cursor-pointer transition-colors ${isChecked ? 'bg-accent/10' : 'hover:bg-panel-muted/50'}`}
                      >
                        <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 accent-accent rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-2 font-mono font-bold text-accent">{item.code}</td>
                        <td className="p-2 font-bold text-ink">{item.name}</td>
                        <td className="p-2 text-center text-ink-muted">{item.unit}</td>
                        <td className="p-2 text-right font-mono font-semibold text-ink">
                          {fmtMoney(item.unitPrice)}
                        </td>
                        <td className="p-2 text-right" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={customQuantities[item.id] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCustomQuantities(prev => ({ ...prev, [item.id]: val }));
                              if (!selectedIds[item.id]) {
                                setSelectedIds(prev => ({ ...prev, [item.id]: true }));
                              }
                            }}
                            className={`w-full p-1 rounded font-mono text-right font-bold text-xs ${UI.inputStyle}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-line bg-panel-muted flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-line text-ink-faint hover:text-ink hover:bg-panel font-semibold cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSelection}
            className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 ${
              hasSelection
                ? 'bg-accent text-white hover:opacity-90 shadow-sm cursor-pointer'
                : 'bg-panel-muted text-ink-faint border border-line cursor-not-allowed opacity-60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào danh sách</span>
          </button>
        </div>
      </div>
    </div>
  );
};
