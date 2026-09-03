import React, { useState, useMemo } from 'react';
import {
  PackageCheck, Building2, DoorOpen, Plus, Printer,
  RotateCcw, Bookmark, ChevronDown, ChevronRight, Pencil, Trash2,
  Library, Boxes, FileSpreadsheet,
} from 'lucide-react';
import { useShoppingChecklist } from '../../hooks/useShoppingChecklist';
import {
  computeFloorTotal,
  computePresetTotal,
  computeRoomTotal,
  countPresetItems,
} from '../../lib/shoppingChecklist';
import {
  exportShoppingChecklistToExcel,
  exportShoppingChecklistToPdf,
} from '../../lib/shoppingChecklistExport';
import { ShoppingChecklistTable } from '../shopping/ShoppingChecklistTable';
import { CatalogPickerModal } from '../shopping/CatalogPickerModal';
import { CatalogTab } from '../shopping/CatalogTab';
import { PresetsModal } from '../shopping/PresetsModal';
import { fmtMoney } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { useToast } from '../Toast';
import { Toast } from '../Toast';

export const ShoppingChecklistView: React.FC = () => {
  const { toast, show, dismiss } = useToast();
  const {
    preset,
    savedPresets,
    catalog,
    updatePresetName: _updatePresetName,
    saveCurrentPreset,
    loadPreset,
    deletePreset,
    resetToDefault,
    addFloor,
    updateFloorName,
    removeFloor,
    addRoom,
    updateRoomName,
    removeRoom,
    addItem,
    updateItem,
    removeItem,
    addItemsFromCatalog,
    addCatalogItem,
    updateCatalogItem,
    removeCatalogItem,
  } = useShoppingChecklist();

  const [activeTab, setActiveTab] = useState<'checklist' | 'catalog'>('checklist');
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({});
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Picker modal state
  const [pickerTarget, setPickerTarget] = useState<{ floorId: string; roomId: string; roomName: string } | null>(null);

  const grandTotal = useMemo(() => computePresetTotal(preset), [preset]);
  const totalItems = useMemo(() => countPresetItems(preset), [preset]);
  const totalRooms = useMemo(
    () => preset.floors.reduce((sum, f) => sum + f.rooms.length, 0),
    [preset]
  );

  const toggleFloor = (floorId: string) => {
    setCollapsedFloors(prev => ({ ...prev, [floorId]: !prev[floorId] }));
  };

  const handleExportExcel = () => {
    try {
      exportShoppingChecklistToExcel(preset);
      show('success', 'Đã xuất file Excel (.xlsx) danh sách vật dụng thành công!');
    } catch {
      show('error', 'Có lỗi khi xuất file Excel.');
    }
  };

  const handleExportPdf = () => {
    try {
      const ok = exportShoppingChecklistToPdf(preset);
      if (ok) {
        show('success', 'Đã mở cửa sổ in / xuất PDF.');
      } else {
        show('error', 'Không mở được cửa sổ in. Vui lòng cho phép popup trình duyệt.');
      }
    } catch {
      show('error', 'Có lỗi khi mở bản in.');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-xs font-app animate-in fade-in duration-200">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Top Header & KPIs */}
      <div className="rounded-2xl border border-line/70 bg-panel/90 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="p-4 sm:p-5 border-b border-line/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-accent text-accent-ink shadow-md shadow-accent/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                  DỰ TOÁN MUA SẮM & TRANG THIẾT BỊ
                </span>
                <span className="text-ink-faint">•</span>
                <span className="text-[10px] text-ink-muted">Tầng & Phòng (FF&E Checklist)</span>
              </div>
              <h1 className="font-bold text-base sm:text-lg text-ink tracking-tight flex items-center gap-2">
                <span>{preset.name}</span>
                <button
                  type="button"
                  onClick={() => setIsPresetsModalOpen(true)}
                  className="p-1 rounded-lg text-ink-faint hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                  title="Đổi hoặc lưu bản dựng"
                >
                  <Bookmark className="w-4 h-4 text-accent" />
                </button>
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPresetsModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-line/70 text-ink font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Bookmark className="w-4 h-4 text-accent" />
              <span>Bản dựng & Mẫu ({savedPresets.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-pos/15 hover:bg-pos/25 text-pos border border-pos/30 font-bold transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-line text-ink font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-accent" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Khôi phục danh sách về dữ liệu mẫu ban đầu từ file Excel?')) {
                  resetToDefault();
                  show('success', 'Đã khôi phục dữ liệu mẫu Excel gốc.');
                }
              }}
              className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-surface border border-transparent hover:border-line/60 transition-all cursor-pointer"
              title="Khôi phục mẫu gốc"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line/60 bg-surface/30">
          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-semibold text-ink-faint block mb-0.5">
              TỔNG CHI PHÍ DỰ TOÁN
            </span>
            <div className="font-mono font-bold text-base sm:text-xl text-accent tracking-tight">
              {fmtMoney(grandTotal)} <span className="text-xs font-normal">VNĐ</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-semibold text-ink-faint block mb-0.5">
              QUY MÔ CÔNG TRÌNH
            </span>
            <div className="font-mono font-bold text-base sm:text-xl text-ink">
              {preset.floors.length} <span className="text-xs font-normal text-ink-muted">tầng/khu vực</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-semibold text-ink-faint block mb-0.5">
              TỔNG SỐ PHÒNG
            </span>
            <div className="font-mono font-bold text-base sm:text-xl text-ink">
              {totalRooms} <span className="text-xs font-normal text-ink-muted">phòng/khu</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-semibold text-ink-faint block mb-0.5">
              TỔNG SỐ VẬT DỤNG
            </span>
            <div className="font-mono font-bold text-base sm:text-xl text-ink">
              {totalItems} <span className="text-xs font-normal text-ink-muted">hạng mục</span>
            </div>
          </div>
        </div>

        {/* Main Tab Nav Switcher */}
        <div className="px-4 border-t border-line/60 bg-surface/50 flex space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 text-xs ${
              activeTab === 'checklist'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>BẢNG DỰ TOÁN THEO TẦNG & PHÒNG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-3 font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 text-xs ${
              activeTab === 'catalog'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>THƯ VIỆN VẬT PHẨM (KHO LƯU TRỮ - {catalog.length} MỤC)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Checklist (Tầng & Phòng) */}
      {activeTab === 'checklist' ? (
        <div className="space-y-4">
          {/* Quick Add Floor Button */}
          <div className="flex items-center justify-between px-1">
            <div className="text-ink-muted text-xs">
              Quản lý chi tiết theo từng Tầng và Phòng. Nhập trực tiếp vào các ô bảng tính.
            </div>
            <button
              type="button"
              onClick={() => addFloor()}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-accent hover:opacity-90 text-accent-ink font-bold shadow-sm shadow-accent/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tầng mới</span>
            </button>
          </div>

          {/* Floors List */}
          {preset.floors.length === 0 ? (
            <div className="p-12 text-center bg-panel rounded-2xl border border-line">
              <Building2 className="w-10 h-10 text-ink-faint mx-auto mb-2" />
              <p className="text-ink-muted font-bold text-sm">Chưa có tầng nào</p>
              <p className="text-ink-faint text-xs mt-1">Bấm "Thêm Tầng mới" để bắt đầu thiết lập bảng dự toán.</p>
              <button
                type="button"
                onClick={() => addFloor()}
                className="mt-4 px-4 py-2 rounded-xl bg-accent text-accent-ink font-bold cursor-pointer"
              >
                + Thêm Tầng đầu tiên
              </button>
            </div>
          ) : (
            preset.floors.map(floor => {
              const floorTotal = computeFloorTotal(floor);
              const isCollapsed = !!collapsedFloors[floor.id];
              const floorItemsCount = floor.rooms.reduce((s, r) => s + r.items.length, 0);

              return (
                <div
                  key={floor.id}
                  className="rounded-2xl border border-line/70 bg-panel/90 shadow-sm overflow-hidden"
                >
                  {/* Floor Header Bar */}
                  <div
                    className="p-3.5 sm:p-4 bg-surface/70 border-b border-line/60 flex flex-wrap items-center justify-between gap-3 select-none cursor-pointer"
                    onClick={() => toggleFloor(floor.id)}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-[200px]">
                      <button
                        type="button"
                        className="p-1 rounded text-ink-faint hover:text-ink cursor-pointer"
                        onClick={e => {
                          e.stopPropagation();
                          toggleFloor(floor.id);
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-accent" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-accent" />
                        )}
                      </button>

                      {editingFloorId === floor.id ? (
                        <input
                          type="text"
                          value={floor.name}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateFloorName(floor.id, e.target.value)}
                          onBlur={() => setEditingFloorId(null)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setEditingFloorId(null);
                          }}
                          className={`px-2 py-1 rounded font-bold text-sm text-ink ${UI.inputStyle}`}
                        />
                      ) : (
                        <div
                          className="flex items-center space-x-2 group"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingFloorId(floor.id);
                          }}
                        >
                          <h3 className="font-bold text-sm text-ink uppercase tracking-tight">
                            {floor.name}
                          </h3>
                          <Pencil className="w-3 h-3 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-surface border border-line/70 text-ink-muted text-[10px] font-semibold">
                        {floor.rooms.length} phòng • {floorItemsCount} món
                      </span>
                    </div>

                    <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                      <div className="text-right">
                        <span className="text-[10px] text-ink-faint block">Tổng tầng:</span>
                        <span className="font-mono font-bold text-accent text-sm">
                          {fmtMoney(floorTotal)} đ
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addRoom(floor.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent font-bold text-xs transition-colors cursor-pointer"
                        title="Thêm phòng mới vào tầng này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm phòng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa toàn bộ "${floor.name}" cùng tất cả các phòng bên trong?`)) {
                            removeFloor(floor.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg/10 transition-colors cursor-pointer"
                        title="Xóa tầng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Floor Rooms Container */}
                  {!isCollapsed && (
                    <div className="p-3 sm:p-4 space-y-4">
                      {floor.rooms.length === 0 ? (
                        <div className="py-6 text-center text-ink-faint border border-dashed border-line rounded-xl">
                          Tầng này chưa có phòng nào. Bấm "+ Thêm phòng" để bổ sung.
                        </div>
                      ) : (
                        floor.rooms.map(room => {
                          const roomTotal = computeRoomTotal(room);

                          return (
                            <div
                              key={room.id}
                              className="rounded-xl border border-line/60 bg-surface/40 p-3 sm:p-4 space-y-3 shadow-2xs"
                            >
                              {/* Room Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-2">
                                <div className="flex items-center space-x-2">
                                  <DoorOpen className="w-4 h-4 text-accent" />
                                  {editingRoomId === room.id ? (
                                    <input
                                      type="text"
                                      value={room.name}
                                      autoFocus
                                      onChange={e => updateRoomName(floor.id, room.id, e.target.value)}
                                      onBlur={() => setEditingRoomId(null)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') setEditingRoomId(null);
                                      }}
                                      className={`px-2 py-0.5 rounded font-bold text-xs ${UI.inputStyle}`}
                                    />
                                  ) : (
                                    <div
                                      className="flex items-center space-x-1.5 group cursor-pointer"
                                      onClick={() => setEditingRoomId(room.id)}
                                    >
                                      <h4 className="font-bold text-xs text-ink uppercase tracking-wide">
                                        {room.name}
                                      </h4>
                                      <Pencil className="w-2.5 h-2.5 text-ink-faint opacity-0 group-hover:opacity-100" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono font-bold text-ink">
                                    Cộng phòng: <strong className="text-accent">{fmtMoney(roomTotal)} đ</strong>
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Xóa phòng "${room.name}"?`)) {
                                        removeRoom(floor.id, room.id);
                                      }
                                    }}
                                    className="p-1 rounded text-ink-faint hover:text-neg hover:bg-neg/10 transition-colors cursor-pointer"
                                    title="Xóa phòng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Room Checklist Table */}
                              <ShoppingChecklistTable
                                floorId={floor.id}
                                room={room}
                                onAddItem={() => addItem(floor.id, room.id)}
                                onOpenCatalogPicker={() =>
                                  setPickerTarget({
                                    floorId: floor.id,
                                    roomId: room.id,
                                    roomName: `${floor.name} → ${room.name}`,
                                  })
                                }
                                onUpdateItem={(itemId, patch) =>
                                  updateItem(floor.id, room.id, itemId, patch)
                                }
                                onRemoveItem={itemId => removeItem(floor.id, room.id, itemId)}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Tab 2: Master Catalog Management */
        <CatalogTab
          catalog={catalog}
          onAddItem={addCatalogItem}
          onUpdateItem={updateCatalogItem}
          onRemoveItem={removeCatalogItem}
        />
      )}

      {/* Catalog Picker Modal */}
      {pickerTarget && (
        <CatalogPickerModal
          catalog={catalog}
          roomName={pickerTarget.roomName}
          onSelect={items => {
            addItemsFromCatalog(pickerTarget.floorId, pickerTarget.roomId, items);
            show('success', `Đã thêm ${items.length} vật dụng vào ${pickerTarget.roomName}`);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {/* Presets Modal */}
      {isPresetsModalOpen && (
        <PresetsModal
          currentPreset={preset}
          savedPresets={savedPresets}
          onSaveCurrent={(name, desc) => {
            saveCurrentPreset(name, desc);
            show('success', `Đã lưu bản dựng "${name}" thành công!`);
          }}
          onLoadPreset={presetId => {
            loadPreset(presetId);
            show('success', 'Đã nạp bản dựng thành công!');
          }}
          onDeletePreset={presetId => {
            deletePreset(presetId);
            show('success', 'Đã xóa bản dựng.');
          }}
          onResetDefault={() => {
            resetToDefault();
            show('success', 'Đã khôi phục dữ liệu gốc từ file Excel.');
          }}
          onClose={() => setIsPresetsModalOpen(false)}
        />
      )}
    </div>
  );
};
