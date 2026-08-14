import React from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_POLICY_SOURCE,
} from '../../lib/cardContract';
import { CARD_POLICY_GENERAL_NOTES, cardPolicyRuleOf } from '../../lib/cardPolicyRules';
import { CARD_FEE_GROUPS } from '../../lib/cardFeeProfiles';
import { fmtMoney } from '../../lib/utils';
import {
  BookOpen, Search, CreditCard, Tag, Copy, Check, Info, Plus, Pencil, Trash2, RefreshCw, X, Save,
} from 'lucide-react';
import { useCardPolicyController, type KindFilter } from '../../hooks/useCardPolicyController';

export const CardPolicyLookupView: React.FC = () => {
  const {
    mainTab,
    setMainTab,
    query,
    setQuery,
    kind,
    setKind,
    openKey,
    setOpenKey,
    feeProfiles,
    commonNote,
    feeQuery,
    setFeeQuery,
    feeGroup,
    setFeeGroup,
    copiedCode,
    modalOpen,
    setModalOpen,
    editingItem,
    formData,
    setFormData,
    editingNote,
    setEditingNote,
    noteForm,
    setNoteForm,
    rows,
    total,
    countOf,
    groupedProfiles,
    handleCopy,
    openAddModal,
    openEditModal,
    handleSaveModal,
    handleDeleteProfile,
    handleResetDefaults,
    handleSaveNote,
  } = useCardPolicyController();

  return (
    <div className="space-y-4 text-xs">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setMainTab('issuance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'issuance'
              ? 'bg-accent text-accent-ink shadow-sm'
              : 'bg-panel border border-line text-ink-muted hover:text-ink hover:bg-panel-muted'
          }`}
        >
          <CreditCard size={15} /> Mã chính sách phát hành thẻ ({total})
        </button>

        <button
          type="button"
          onClick={() => setMainTab('fee-codes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'fee-codes'
              ? 'bg-accent text-accent-ink shadow-sm'
              : 'bg-panel border border-line text-ink-muted hover:text-ink hover:bg-panel-muted'
          }`}
        >
          <Tag size={15} /> Tra cứu Mã phí thẻ (Product Man & Fee Int Profile) ({feeProfiles.length})
        </button>
      </div>

      {/* --- TAB 1: ISSUANCE POLICY CODES --- */}
      {mainTab === 'issuance' && (
        <>
          <div className={`${PANEL} p-4 space-y-3`}>
            <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
              <BookOpen size={16} /> TRA CỨU MÃ CHÍNH SÁCH PHÁT HÀNH THẺ
            </div>

            <div className="text-[10px] text-ink-faint leading-relaxed">
              Nguồn: <strong className="text-ink-muted">QĐ {CARD_POLICY_SOURCE.decision}</strong>
              {' '}· ban hành {CARD_POLICY_SOURCE.issuedDate} · hiệu lực {CARD_POLICY_SOURCE.effectiveDate}
              {' '}· lần hiệu chính {CARD_POLICY_SOURCE.revision}
              <br />
              {CARD_POLICY_SOURCE.annex}
              <br />
              Thay thế: {CARD_POLICY_SOURCE.supersedes.join(' · ')}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Tìm theo mã, nhóm chính sách hoặc đối tượng khách hàng"
                className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`} />
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              {([['ALL', 'Tất cả'], ...CARD_COLLATERAL_KINDS.map(k => [k.value, k.label] as const)] as
                [KindFilter, string][]).map(([value, label]) => (
                <button key={value} type="button"
                  onClick={() => setKind(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    kind === value
                      ? 'bg-accent text-accent-ink border-accent shadow-xs'
                      : 'bg-panel-muted text-ink-muted border-line hover:border-accent hover:text-accent'
                  }`}>
                  {label} <span className="font-mono font-normal opacity-75">({countOf(value)})</span>
                </button>
              ))}
            </div>

            <div className="text-[11px] text-ink-faint pt-1">
              Hiện {rows.length}/{total} mã chính sách phát hành thẻ. Nhấp vào dòng để xem chi tiết điều kiện.
            </div>
          </div>

          <div className={`${PANEL} overflow-x-auto`}>
            <table className="w-full">
              <thead className={UI.tableHeaderStyle}>
                <tr>
                  <th className="px-3 py-2 text-left w-14">Mã</th>
                  <th className="px-3 py-2 text-left min-w-[15rem]">Đối tượng áp dụng</th>
                  <th className="px-3 py-2 text-left min-w-[11rem]">Nhóm chính sách</th>
                  <th className="px-3 py-2 text-left w-24">Phân loại TSĐB</th>
                  <th className="px-3 py-2 text-right min-w-[11rem]">Hạn mức cấp tối đa</th>
                  <th className="px-3 py-2 text-center w-28">Thẻ phụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-app">
                {rows.map(p => {
                  const isOpen = openKey === p.code;
                  const rule = cardPolicyRuleOf(p.code);
                  const isCollateral = p.collateralKind !== 'KHONG_TSBD';
                  const collateralLabel = CARD_COLLATERAL_KINDS.find(k => k.value === p.collateralKind)?.label ?? p.collateralKind;
                  const limitSummary = rule?.limitRule || (rule?.maxLimit ? `Tối đa ${fmtMoney(rule.maxLimit)}` : 'Theo quy định');

                  return (
                    <React.Fragment key={p.code}>
                      <tr
                        onClick={() => setOpenKey(isOpen ? null : p.code)}
                        className="hover:bg-panel-muted/60 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-accent align-top">{p.code}</td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="font-bold text-ink">{p.subject}</div>
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted align-top">{p.group}</td>
                        <td className="px-3 py-2.5 align-top">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCollateral
                              ? 'bg-warn-soft border-warn/30 text-warn'
                              : 'bg-accent-soft border-accent/30 text-accent'
                          }`}>
                            {collateralLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-ink align-top">
                          {limitSummary}
                        </td>
                        <td className="px-3 py-2.5 text-center text-ink-muted align-top">
                          <span className="text-pos font-bold">Theo quy định</span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-panel-muted/40">
                          <td colSpan={6} className="px-4 py-3 border-t border-b border-line space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <div className={SECTION_LABEL}>Điều kiện & Tiêu chuẩn cấp thẻ</div>
                                {rule?.conditions && rule.conditions.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                    {rule.conditions.map((cond, i) => (
                                      <li key={i}>{cond}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-ink-faint italic">Theo điều kiện chung của Vietbank.</p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <div className={SECTION_LABEL}>Hồ sơ & Đánh giá định kỳ</div>
                                {rule?.documents && rule.documents.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                    {rule.documents.map((doc, i) => (
                                      <li key={i}>{doc}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-ink-faint italic">Theo bộ hồ sơ tiêu chuẩn.</p>
                                )}
                              </div>
                            </div>

                            {rule?.reassessment && rule.reassessment.length > 0 && (
                              <div className="pt-2 border-t border-line/60 space-y-1">
                                <div className="text-[10px] font-bold text-ink-faint uppercase">Tái thẩm định & Kiểm soát</div>
                                <div className="text-[11px] text-ink-muted space-y-0.5">
                                  {rule.reassessment.map((note, idx) => (
                                    <div key={idx}>• {note}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* General Notes Footer Section */}
          <div className={`${PANEL} p-4 space-y-2`}>
            <div className={`${SECTION_LABEL} flex items-center gap-1.5`}>
              <Info size={13} className="text-accent" /> Quy định chung về phát hành thẻ tín dụng
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-ink-muted">
              {CARD_POLICY_GENERAL_NOTES.map((note, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-line bg-panel-muted/30 space-y-1">
                  <div className="font-bold text-ink text-xs">Mục {idx + 1}</div>
                  <div className="text-ink-muted leading-relaxed">{note}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* --- TAB 2: CARD FEE CODES & PROFILES --- */}
      {mainTab === 'fee-codes' && (
        <div className="space-y-4">
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

          {/* Grouped Tables */}
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
      )}

      {/* Add / Edit Profile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${PANEL} max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-ink">
                {editingItem ? 'Sửa Mã Phí Thẻ' : 'Thêm Mã Phí Thẻ Mới'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-ink-faint hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-ink">Nhóm phân loại thẻ *</label>
                <select
                  value={formData.group}
                  onChange={e => setFormData({ ...formData, group: e.target.value })}
                  className={`w-full rounded-md p-2 border font-semibold ${UI.inputStyle}`}
                >
                  {CARD_FEE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Loại thẻ / Sản phẩm *</label>
                <input
                  type="text"
                  placeholder="VD: Platinum Cashback..."
                  value={formData.cardType}
                  onChange={e => setFormData({ ...formData, cardType: e.target.value })}
                  className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Product Man (Mã sản phẩm) *</label>
                <input
                  type="text"
                  placeholder="VD: CR_PLT_CB..."
                  value={formData.productMan}
                  onChange={e => setFormData({ ...formData, productMan: e.target.value })}
                  className={`w-full rounded-md p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Fee Int Profile (Mã biểu phí) *</label>
                <input
                  type="text"
                  placeholder="VD: PROFILE_FEE_01..."
                  value={formData.feeIntProfile}
                  onChange={e => setFormData({ ...formData, feeIntProfile: e.target.value })}
                  className={`w-full rounded-md p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`${BTN_SECONDARY} text-xs py-2 px-4`}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className={`${BTN_PRIMARY} text-xs py-2 px-4 flex items-center gap-1.5`}
              >
                <Save size={14} /> Lưu mã phí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
