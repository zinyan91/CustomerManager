import React from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import { CARD_FEE_GROUPS } from '../../lib/cardFeeProfiles';
import { Tag, Search, Plus, Pencil, Trash2, RefreshCw, Copy, Check, Info, Save } from 'lucide-react';
import type { CardFeeProfile } from '../../lib/cardFeeProfiles';

interface CardFeeScheduleTabProps {
  feeProfiles: CardFeeProfile[];
  feeQuery: string;
  setFeeQuery: (q: string) => void;
  feeGroup: string;
  setFeeGroup: (g: string) => void;
  copiedCode: string | null;
  commonNote: string;
  editingNote: boolean;
  setEditingNote: (editing: boolean) => void;
  noteForm: string;
  setNoteForm: (val: string) => void;
  groupedProfiles: Array<{ name: string; items: CardFeeProfile[] }>;
  handleCopy: (code: string) => void;
  openAddModal: () => void;
  openEditModal: (item: CardFeeProfile) => void;
  handleDeleteProfile: (id: string) => void;
  handleResetDefaults: () => void;
  handleSaveNote: () => void;
}

export const CardFeeScheduleTab: React.FC<CardFeeScheduleTabProps> = ({
  feeProfiles,
  feeQuery,
  setFeeQuery,
  feeGroup,
  setFeeGroup,
  copiedCode,
  commonNote,
  editingNote,
  setEditingNote,
  noteForm,
  setNoteForm,
  groupedProfiles,
  handleCopy,
  openAddModal,
  openEditModal,
  handleDeleteProfile,
  handleResetDefaults,
  handleSaveNote,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
            <Tag size={16} /> BẢNG TRA CỨU MÃ PHÍ THẺ TÍN DỤNG
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className={`${BTN_SECONDARY} text-[11px] py-1.5 px-3 flex items-center gap-1.5`}
              title="Khôi phục danh mục gốc"
            >
              <RefreshCw size={13} /> Reset Defaults
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className={`${BTN_PRIMARY} text-[11px] py-1.5 px-3.5 flex items-center gap-1.5`}
            >
              <Plus size={14} /> Thêm mã phí mới
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={feeQuery}
              onChange={e => setFeeQuery(e.target.value)}
              placeholder="Tìm theo loại thẻ, Product Man hoặc Fee Int Profile..."
              className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`}
            />
          </div>

          <select
            value={feeGroup}
            onChange={e => setFeeGroup(e.target.value)}
            className={`rounded-md px-3 py-2 border font-semibold ${UI.inputStyle}`}
          >
            <option value="ALL">Tất cả nhóm thẻ ({feeProfiles.length} mã)</option>
            {CARD_FEE_GROUPS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Fee Profile Tables */}
      {groupedProfiles.length === 0 ? (
        <div className={`${PANEL} p-8 text-center text-ink-faint`}>
          Không tìm thấy mã phí thẻ tương ứng với từ khóa "{feeQuery}"
        </div>
      ) : (
        groupedProfiles.map(group => (
          <div key={group.name} className={`${PANEL} overflow-hidden`}>
            <div className="px-4 py-2.5 border-b border-line bg-panel-muted/60 font-bold text-xs text-accent flex justify-between items-center">
              <span>{group.name}</span>
              <span className="text-[11px] font-mono text-ink-faint">{group.items.length} cấu hình</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className={UI.tableHeaderStyle}>
                  <tr>
                    <th className="px-4 py-2 text-left min-w-[12rem]">Loại thẻ / Sản phẩm</th>
                    <th className="px-4 py-2 text-left min-w-[14rem]">Product Man (Mã sản phẩm)</th>
                    <th className="px-4 py-2 text-left min-w-[14rem]">Fee Int Profile (Mã biểu phí)</th>
                    <th className="px-4 py-2 text-right w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-app">
                  {group.items.map(item => (
                    <tr key={item.id} className="hover:bg-panel-muted/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-ink align-middle">
                        {item.cardType}
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-accent">{item.productMan}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.productMan)}
                            className="p-1 rounded hover:bg-panel text-ink-faint hover:text-accent transition-colors"
                            title="Sao chép Product Man"
                          >
                            {copiedCode === item.productMan ? <Check size={13} className="text-pos" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-accent">{item.feeIntProfile}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.feeIntProfile)}
                            className="p-1 rounded hover:bg-panel text-ink-faint hover:text-accent transition-colors"
                            title="Sao chép Fee Int Profile"
                          >
                            {copiedCode === item.feeIntProfile ? <Check size={13} className="text-pos" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right align-middle">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded hover:bg-panel text-ink-faint hover:text-ink transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(item.id)}
                            className="p-1.5 rounded hover:bg-panel text-ink-faint hover:text-neg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Common Notes Section */}
      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex items-center justify-between border-b border-line pb-2">
          <div className={`${SECTION_LABEL} flex items-center gap-1.5`}>
            <Info size={14} className="text-accent" /> Ghi chú chung & Lưu ý khai báo thông tin
          </div>
          {!editingNote && (
            <button
              type="button"
              onClick={() => { setNoteForm(commonNote); setEditingNote(true); }}
              className="text-accent hover:underline text-xs flex items-center gap-1 font-semibold"
            >
              <Pencil size={12} /> Sửa ghi chú
            </button>
          )}
        </div>

        {editingNote ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={noteForm}
              onChange={e => setNoteForm(e.target.value)}
              className={`w-full rounded-md p-3 text-xs border font-mono ${UI.inputStyle}`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNote(false)}
                className={`${BTN_SECONDARY} text-xs py-1.5 px-3`}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className={`${BTN_PRIMARY} text-xs py-1.5 px-3 flex items-center gap-1`}
              >
                <Save size={13} /> Lưu ghi chú
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap font-app bg-panel-muted/40 p-3.5 rounded-xl border border-line/60">
            {commonNote}
          </div>
        )}
      </div>
    </div>
  );
};
