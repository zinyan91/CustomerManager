import React from 'react';
import { UI } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_HOLDER_SIDES, CARD_PRODUCTS, CARD_TENOR_MONTHS,
  MAX_SUPPLEMENTARY_PER_CONTRACT, SUPPLEMENTARY_RELATIONS,
  type CardCollateralKind, type CardHolderSide, type CardPolicy,
} from '../../lib/cardContract';
import type { CardPolicyRule } from '../../lib/cardPolicyRules';
import type { Collateral } from '../../types';
import type { SupRow } from '../../hooks/useCardContractController';
import { blankSup } from '../../hooks/useCardContractController';
import { fmtMoney, formatMoneyInput } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { Plus, ShieldCheck } from 'lucide-react';

interface CardContractModalProps {
  isOpen: boolean;
  editingId: number | null;
  fNumber: string;
  setFNumber: (val: string) => void;
  fHolderSide: CardHolderSide;
  setFHolderSide: (val: CardHolderSide) => void;
  fHolderName: string;
  setFHolderName: (val: string) => void;
  fProducts: string[];
  toggleProduct: (name: string) => void;
  fLimit: string;
  setFLimit: (val: string) => void;
  fCollateralKind: CardCollateralKind;
  setFCollateralKind: (val: CardCollateralKind) => void;
  fPolicyKey: string;
  setFPolicyKey: (val: string) => void;
  fCollateralId: number | '';
  setFCollateralId: (val: number | '') => void;
  fIssueDate: string;
  setFIssueDate: (val: string) => void;
  fNote: string;
  setFNote: (val: string) => void;
  fClosed: boolean;
  setFClosed: (val: boolean) => void;
  sups: SupRow[];
  setSups: (val: SupRow[]) => void;
  laGhiNo: boolean;
  policy?: CardPolicy | null;
  rule?: CardPolicyRule | null;
  policiesForKind: CardPolicy[];
  collaterals: Collateral[];
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

export const CardContractModal: React.FC<CardContractModalProps> = ({
  isOpen,
  editingId,
  fNumber,
  setFNumber,
  fHolderSide,
  setFHolderSide,
  fHolderName,
  setFHolderName,
  fProducts,
  toggleProduct,
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
  laGhiNo,
  policy,
  rule,
  policiesForKind,
  collaterals,
  loading,
  onSave,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-surface/40 flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <DialogTitle className="font-bold text-sm text-ink uppercase tracking-tight">
              {editingId ? `Sửa hợp đồng thẻ ${fNumber}` : 'Thêm hợp đồng thẻ mới'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Số HĐ Thẻ *</label>
              <input
                type="text"
                value={fNumber}
                onChange={e => setFNumber(e.target.value)}
                placeholder="VD: HDT-2026/001"
                className={`w-full rounded-xl p-2 font-mono font-bold border ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Đối tượng đứng tên chủ thẻ chính *</label>
              <select
                value={fHolderSide}
                onChange={e => setFHolderSide(e.target.value as CardHolderSide)}
                className={`w-full rounded-xl p-2 border ${UI.inputStyle}`}
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
              className={`w-full rounded-xl p-2 font-semibold border ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Sản phẩm thẻ đăng ký *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border p-3 rounded-xl border-line/70 bg-surface/60">
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
                className={`w-full rounded-xl p-2 border ${UI.inputStyle}`}
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
                className={`w-full rounded-xl p-2 border font-mono font-bold text-accent ${UI.inputStyle}`}
              >
                <option value="">— Chọn mã chính sách —</option>
                {policiesForKind.map(p => (
                  <option key={p.key} value={p.key}>{p.code} ({p.subject})</option>
                ))}
              </select>
            </div>
          </div>

          {policy && (
            <div className="p-3.5 rounded-xl border border-accent/30 bg-accent-soft/30 space-y-1">
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
                className={`w-full rounded-xl p-2 border ${UI.inputStyle}`}
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
              placeholder={laGhiNo ? '0 (Thẻ ghi nợ không cấp hạn mức)' : 'VD: 50.000.000'}
              value={laGhiNo ? '0' : fLimit}
              onChange={e => setFLimit(formatMoneyInput(e.target.value))}
              className={`w-full rounded-xl p-2 font-mono font-bold text-accent border ${UI.inputStyle} disabled:opacity-60`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Ngày phát hành thẻ</label>
              <DateInput
                value={fIssueDate}
                onChange={setFIssueDate}
                className={`w-full rounded-xl p-2 border ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Thời hạn thẻ</label>
              <input
                type="text"
                readOnly
                value={`${CARD_TENOR_MONTHS} tháng (5 năm)`}
                className={`w-full rounded-xl p-2 border font-mono bg-panel-muted text-ink-muted ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Supplementary Cardholders Section */}
          <div className="space-y-2 pt-2 border-t border-line/60">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Danh sách Chủ thẻ phụ (Tối đa {MAX_SUPPLEMENTARY_PER_CONTRACT} thẻ)</span>
              {sups.length < MAX_SUPPLEMENTARY_PER_CONTRACT && (
                <button
                  type="button"
                  onClick={() => setSups([...sups, blankSup()])}
                  className="text-accent hover:underline text-xs flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Plus size={13} /> Thêm thẻ phụ
                </button>
              )}
            </div>

            {sups.length === 0 ? (
              <div className="text-[11px] text-ink-faint italic">Không mở thẻ phụ cho hợp đồng này.</div>
            ) : (
              sups.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-line/70 bg-surface/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent">Thẻ phụ #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setSups(sups.filter((_, i) => i !== idx))}
                      className="text-neg hover:underline text-xs cursor-pointer"
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
                      className={`rounded-xl p-2 border ${UI.inputStyle}`}
                    />
                    <select
                      value={s.Relation}
                      onChange={e => {
                        const copy = [...sups];
                        copy[idx].Relation = e.target.value;
                        setSups(copy);
                      }}
                      className={`rounded-xl p-2 border ${UI.inputStyle}`}
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
            <div className="pt-2 border-t border-line/60">
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
              placeholder="Ghi chú điều kiện phát hành, ngoại lệ..."
              className={`w-full rounded-xl p-2 border ${UI.inputStyle}`}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 p-4 bg-surface/40 border-t border-line/60">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={onSave}
          >
            {editingId ? 'Lưu cập nhật' : 'Tạo hợp đồng thẻ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
