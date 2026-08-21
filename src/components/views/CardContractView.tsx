import React from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_HOLDER_SIDES, CARD_PRODUCTS, CARD_TENOR_MONTHS,
  CARD_POLICY_SOURCE, MAX_SUPPLEMENTARY_PER_CONTRACT, SUPPLEMENTARY_RELATIONS,
  isDebitCard,
  type CardCollateralKind, type CardHolderSide,
} from '../../lib/cardContract';
import { fmtMoney, formatMoneyInput } from '../../lib/utils';
import { Toast } from '../Toast';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useCardContractController, blankSup } from '../../hooks/useCardContractController';

export const CardContractView: React.FC = () => {
  const {
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    contracts,
    collaterals,
    notification,
    setNotification,
    loading,
    showForm,
    setShowForm,
    editingId,
    fNumber,
    setFNumber,
    fHolderSide,
    setFHolderSide,
    fHolderName,
    setFHolderName,
    fProducts,
    fLimit,
    setFLimit,
    fCollateralKind,
    setFCollateralKind,
    fPolicyKey,
    setFPolicyKey,
    fCollateralId,
    setFCollateralId,
    fIssueDate,
    setFIssueDate,
    fNote,
    setFNote,
    fClosed,
    setFClosed,
    sups,
    setSups,
    customer,
    laGhiNo,
    policy,
    rule,
    policiesForKind,
    totalGranted,
    resetForm,
    toggleProduct,
    save,
    remove,
  } = useCardContractController();

  return (
    <div className="space-y-4 font-app">
      {notification && (
        <Toast toast={notification} onDismiss={() => setNotification(null)} />
      )}

      <div className={`${PANEL} rounded-2xl p-4 sm:p-5 space-y-3 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-wider text-xs uppercase">HỢP ĐỒNG THẺ</span>
          </div>
          <span className="text-[10px] text-ink-faint">
            Mã chính sách theo QĐ {CARD_POLICY_SOURCE.decision} · tra cứu chi tiết ở tab Tra cứu chính sách thẻ
          </span>
        </div>

        <div>
          <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>Khách hàng</label>
          <select
            value={selectedCustomerId ?? ''}
            onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
            className={`w-full rounded-xl p-2.5 text-xs border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
          >
            <option value="">— Chọn khách hàng —</option>
            {customers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} (CIF: {c.CifKh})</option>
            ))}
          </select>
        </div>

        {customer && (
          <div className="flex items-center justify-between pt-3 border-t border-line/60 flex-wrap gap-2 text-xs">
            <div>
              Tổng hạn mức thẻ tín dụng đã cấp: <strong className="text-accent font-mono font-bold">{fmtMoney(totalGranted)}</strong>
              {' '}· {contracts.length} hợp đồng ({contracts.filter(x => !x.IsClosed).length} đang mở)
            </div>
            <button
              type="button"
              onClick={() => resetForm()}
              className={`${BTN_PRIMARY} text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs`}
            >
              <Plus size={14} /> Thêm hợp đồng thẻ mới
            </button>
          </div>
        )}
      </div>

      {customer && (
        <div className={`${PANEL} rounded-2xl p-4 sm:p-5 space-y-3 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150`}>
          <div className={`${SECTION_LABEL} text-xs font-bold`}>Danh sách hợp đồng thẻ của {customer.FullName}</div>

          {contracts.length === 0 ? (
            <div className="text-center py-8 text-ink-faint text-xs">Chưa có hợp đồng thẻ nào. Nhấp "Thêm hợp đồng thẻ mới" để mở thẻ.</div>
          ) : (
            <div className="space-y-3">
              {contracts.map(c => {
                const debit = isDebitCard(c);
                return (
                  <div
                    key={c.Id}
                    className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all specular-card interactive-card ${
                      c.IsClosed ? 'bg-panel-muted/40 border-line/50 opacity-75' : 'bg-panel/80 border-line/65 hover:border-accent/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-accent text-sm">{c.CardContractNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.IsClosed ? 'bg-panel-muted border border-line text-ink-faint' : 'bg-pos-soft border border-pos/30 text-pos'
                          }`}>
                            {c.IsClosed ? 'ĐÃ ĐÓNG' : 'HIỆU LỰC'}
                          </span>
                          <span className="text-[10px] text-ink-muted bg-surface/80 px-2 py-0.5 rounded-full border border-line/60">
                            {c.CardHolderSide === 'KHLQ' ? 'Chủ thẻ KHLQ' : 'Chủ thẻ KH'}
                          </span>
                        </div>
                        <div className="text-ink font-semibold">{c.CardHolderName || customer.FullName}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => resetForm(c)}
                          className={`${BTN_SECONDARY} text-[11px] py-1.5 px-3 rounded-lg cursor-pointer`}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          className={`${BTN_DANGER} text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer`}
                        >
                          <Trash2 size={12} /> Xoá
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-line/50 text-[11px]">
                      <div>
                        Sản phẩm: <strong className="text-ink">{c.CardProducts || 'Chưa chọn'}</strong>
                      </div>
                      <div>
                        Hạn mức cấp: <strong className="text-accent font-mono">{debit ? '0 VNĐ (Thẻ ghi nợ)' : fmtMoney(c.GrantedLimit || 0)}</strong>
                      </div>
                      <div>
                        Mã CS: <strong className="text-accent font-mono">{c.PolicyCode || 'Chưa chọn'}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Drawer / Modal */}
      {showForm && customer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${PANEL} max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 rounded-2xl border border-line/70 bg-panel/95 backdrop-blur-2xl shadow-2xl specular-card animate-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-bold text-sm text-ink">
                {editingId ? `Sửa hợp đồng thẻ ${fNumber}` : 'Thêm hợp đồng thẻ mới'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg border border-line/60 text-ink-faint hover:text-ink hover:bg-surface cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Số HĐ Thẻ *</label>
                  <input
                    type="text"
                    value={fNumber}
                    onChange={e => setFNumber(e.target.value)}
                    className={`w-full rounded-md p-2 font-mono font-bold border ${UI.inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Đối tượng đứng tên chủ thẻ chính *</label>
                  <select
                    value={fHolderSide}
                    onChange={e => setFHolderSide(e.target.value as CardHolderSide)}
                    className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                  >
                    {CARD_HOLDER_SIDES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Họ tên chủ thẻ chính *</label>
                <input
                  type="text"
                  value={fHolderName}
                  onChange={e => setFHolderName(e.target.value)}
                  className={`w-full rounded-md p-2 font-semibold border ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Sản phẩm thẻ đăng ký *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border p-2.5 rounded-lg border-line bg-panel-muted/30">
                  {CARD_PRODUCTS.map(p => {
                    const checked = fProducts.includes(p.name);
                    return (
                      <label key={p.name} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.name)}
                          className="rounded border-line"
                        />
                        <span className={checked ? 'font-bold text-accent' : 'text-ink-muted'}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phân loại TSBĐ cho Thẻ *</label>
                  <select
                    value={fCollateralKind}
                    onChange={e => setFCollateralKind(e.target.value as CardCollateralKind)}
                    className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                  >
                    {CARD_COLLATERAL_KINDS.map(k => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Mã chính sách phát hành thẻ *</label>
                  <select
                    value={fPolicyKey}
                    onChange={e => setFPolicyKey(e.target.value)}
                    className={`w-full rounded-md p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
                  >
                    <option value="">— Chọn mã chính sách —</option>
                    {policiesForKind.map(p => (
                      <option key={p.key} value={p.key}>{p.code} ({p.subject})</option>
                    ))}
                  </select>
                </div>
              </div>

              {policy && (
                <div className="p-3 rounded-lg border border-accent/30 bg-accent-soft/30 space-y-1">
                  <div className="font-bold text-accent">{policy.code} — {policy.group}</div>
                  <div className="text-ink-muted text-[11px]">{policy.subject}</div>
                  {rule && (
                    <div className="text-[11px] text-ink-faint pt-1 border-t border-accent/20">
                      Quy định hạn mức: {rule.limitRule || 'Theo quy định'}
                    </div>
                  )}
                </div>
              )}

              {fCollateralKind !== 'KHONG_TSBD' && (
                <div>
                  <label className="block font-semibold mb-1">Chọn Tài sản bảo đảm thế chấp *</label>
                  <select
                    value={fCollateralId}
                    onChange={e => setFCollateralId(e.target.value ? Number(e.target.value) : '')}
                    className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                  >
                    <option value="">— Chọn TSBĐ —</option>
                    {collaterals.map(col => (
                      <option key={col.Id} value={col.Id}>
                        {col.AssetCode || col.AssetType || 'TSBĐ'} (Định giá: {fmtMoney(col.AppraisedValue || 0)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Hạn mức cấp thẻ (VNĐ) *</label>
                <input
                  type="text"
                  disabled={laGhiNo}
                  placeholder={laGhiNo ? '0 (Thẻ ghi nợ không cấp hạn mức)' : 'VD: 50,000,000'}
                  value={laGhiNo ? '0' : fLimit}
                  onChange={e => setFLimit(formatMoneyInput(e.target.value))}
                  className={`w-full rounded-md p-2 font-mono font-bold text-accent border ${UI.inputStyle} disabled:opacity-60`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Ngày phát hành thẻ</label>
                  <input
                    type="date"
                    value={fIssueDate}
                    onChange={e => setFIssueDate(e.target.value)}
                    className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Thời hạn thẻ</label>
                  <input
                    type="text"
                    readOnly
                    value={`${CARD_TENOR_MONTHS} tháng (5 năm)`}
                    className={`w-full rounded-md p-2 border font-mono bg-panel-muted text-ink-muted ${UI.inputStyle}`}
                  />
                </div>
              </div>

              {/* Supplementary Cardholders Section */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">Danh sách Chủ thẻ phụ (Tối đa {MAX_SUPPLEMENTARY_PER_CONTRACT} thẻ)</span>
                  {sups.length < MAX_SUPPLEMENTARY_PER_CONTRACT && (
                    <button
                      type="button"
                      onClick={() => setSups([...sups, blankSup()])}
                      className="text-accent hover:underline text-xs flex items-center gap-1 font-semibold"
                    >
                      <Plus size={13} /> Thêm thẻ phụ
                    </button>
                  )}
                </div>

                {sups.length === 0 ? (
                  <div className="text-[11px] text-ink-faint italic">Không mở thẻ phụ cho hợp đồng này.</div>
                ) : (
                  sups.map((s, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-line bg-panel-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-accent">Thẻ phụ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setSups(sups.filter((_, i) => i !== idx))}
                          className="text-neg hover:underline text-xs"
                        >
                          Xoá thẻ phụ
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Họ và tên chủ thẻ phụ *"
                          value={s.FullName}
                          onChange={e => {
                            const copy = [...sups];
                            copy[idx].FullName = e.target.value;
                            setSups(copy);
                          }}
                          className={`rounded-md p-2 border ${UI.inputStyle}`}
                        />
                        <select
                          value={s.Relation}
                          onChange={e => {
                            const copy = [...sups];
                            copy[idx].Relation = e.target.value;
                            setSups(copy);
                          }}
                          className={`rounded-md p-2 border ${UI.inputStyle}`}
                        >
                          {SUPPLEMENTARY_RELATIONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {editingId && (
                <div className="pt-2 border-t border-line">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={fClosed}
                      onChange={e => setFClosed(e.target.checked)}
                      className="rounded border-line"
                    />
                    <span>Đánh dấu Hợp đồng thẻ ĐÃ ĐÓNG</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={fNote}
                  onChange={e => setFNote(e.target.value)}
                  className={`w-full rounded-md p-2 border ${UI.inputStyle}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`${BTN_SECONDARY} text-xs py-2 px-4`}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={save}
                className={`${BTN_PRIMARY} text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-60`}
              >
                {editingId ? 'Lưu cập nhật' : 'Tạo hợp đồng thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
