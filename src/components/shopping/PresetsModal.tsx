import React, { useState } from 'react';
import { Bookmark, Save, Trash2, X, RotateCcw } from 'lucide-react';
import type { ShoppingPreset } from '../../lib/shoppingChecklist';
import { computePresetTotal, countPresetItems } from '../../lib/shoppingChecklist';
import { fmtNumber, fmtDate } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface PresetsModalProps {
  currentPreset: ShoppingPreset;
  savedPresets: ShoppingPreset[];
  onSaveCurrent: (name: string, description?: string) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  currentPreset,
  savedPresets,
  onSaveCurrent,
  onLoadPreset,
  onDeletePreset,
  onResetDefault,
  onClose,
}) => {
  const [saveName, setSaveName] = useState(`${currentPreset.name} (Bản lưu)`);
  const [saveDesc, setSaveDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'save'>('list');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    onSaveCurrent(saveName.trim(), saveDesc.trim());
    setActiveTab('list');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`${UI.containerCardBg} rounded-2xl border border-line-strong shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-app`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink uppercase tracking-tight">
                QUẢN LÝ BẢN DỰNG & MẪU DỰ TOÁN
              </h3>
              <p className="text-[11px] text-ink-faint">
                Lưu trữ các mẫu nhà, căn hộ để tái sử dụng nhiều lần
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

        {/* Tab switch */}
        <div className="p-2 border-b border-line/60 bg-surface/50 flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-panel'
            }`}
          >
            Danh sách bản dựng ({savedPresets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'save'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-panel'
            }`}
          >
            Lưu bản hiện tại thành mẫu mới
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'list' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-ink-faint text-[11px]">
                  Bản dựng đang mở: <strong className="text-accent">{currentPreset.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Khôi phục lại mẫu gốc ban đầu từ file Excel? Dữ liệu chưa lưu có thể bị ghi đè.')) {
                      onResetDefault();
                      onClose();
                    }
                  }}
                  className="flex items-center space-x-1 text-[11px] text-ink-muted hover:text-warn cursor-pointer font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mẫu gốc Excel</span>
                </button>
              </div>

              {savedPresets.map(preset => {
                const total = computePresetTotal(preset);
                const itemsCount = countPresetItems(preset);
                const isCurrent = preset.id === currentPreset.id;

                return (
                  <div
                    key={preset.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-accent/10 border-accent/70 shadow-xs'
                        : 'bg-surface/60 border-line/60 hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-ink text-xs truncate">{preset.name}</h4>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-accent text-accent-ink text-[10px] font-bold">
                              Đang dùng
                            </span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-[11px] text-ink-muted mt-0.5">{preset.description}</p>
                        )}
                        <div className="text-[11px] text-ink-faint mt-1.5 flex flex-wrap items-center gap-3">
                          <span>
                            Quy mô: <strong>{preset.floors.length}</strong> tầng,{' '}
                            <strong>{itemsCount}</strong> vật dụng
                          </span>
                          <span>•</span>
                          <span className="font-mono font-bold text-accent">
                            {fmtNumber(total)} VNĐ
                          </span>
                          <span>•</span>
                          <span>{fmtDate(preset.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadPreset(preset.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-accent text-accent-ink font-bold text-[11px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            Nạp mẫu này
                          </button>
                        )}
                        {savedPresets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xóa bản dựng "${preset.name}"?`)) {
                                onDeletePreset(preset.id);
                              }
                            }}
                            className="p-1 rounded-lg text-ink-faint hover:text-neg hover:bg-neg/10 transition-colors cursor-pointer"
                            title="Xóa bản dựng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Tên bản dựng mới *</label>
                <input
                  type="text"
                  required
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="VD: Mẫu Nhà Phố 4 Tầng Gỗ Cao Cấp..."
                  className={`w-full p-2.5 rounded-xl font-bold text-ink ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${UI.labelStyle}`}>Mô tả / Ghi chú cho bản dựng</label>
                <textarea
                  rows={3}
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  placeholder="Ghi chú về phân khúc, vật liệu hoặc đối tượng khách hàng..."
                  className={`w-full p-2.5 rounded-xl ${UI.inputStyle}`}
                />
              </div>

              <div className="p-3 rounded-xl bg-surface/80 border border-line/60 space-y-1 text-[11px]">
                <div className="text-ink-muted">
                  Bản dựng sẽ lưu toàn bộ:
                </div>
                <div className="font-semibold text-ink">
                  • {currentPreset.floors.length} tầng và tất cả các phòng
                </div>
                <div className="font-semibold text-ink">
                  • {countPresetItems(currentPreset)} vật dụng với đơn giá hiện tại
                </div>
                <div className="font-semibold text-accent font-mono">
                  • Tổng giá trị: {fmtNumber(computePresetTotal(currentPreset))} VNĐ
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-ink-muted hover:text-ink hover:bg-panel cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-accent-ink font-bold shadow-md shadow-accent/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thành bản dựng mới</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
