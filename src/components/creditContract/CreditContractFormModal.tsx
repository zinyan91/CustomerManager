import React from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Save, AlertTriangle } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import { usableCapacity, collateralValue } from '../../lib/collateralMath';
import { DateInput } from '../DateInput';
import { LOAN_METHODS } from '../../hooks/useCreditContractController';
import type { Collateral, CreditContract } from '../../types';

interface CreditContractFormModalProps {
  isOpen: boolean;
  editing: CreditContract | null;
  form: Partial<CreditContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<CreditContract>>>;
  formAmount: string;
  setFormAmount: (val: string) => void;
  formApprovalAmount: string;
  setFormApprovalAmount: (val: string) => void;
  useSharedApproval: boolean;
  setUseSharedApproval: (val: boolean) => void;
  selectedCollateralIds: number[];
  setSelectedCollateralIds: React.Dispatch<React.SetStateAction<number[]>>;
  collaterals: Collateral[];
  purposeOptions: readonly { value: string; label: string }[] | Array<{ value: string; label: string }>;
  tongKhaNangBaoDam: number;
  vuotKhaNangBaoDam: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';

export const CreditContractFormModal: React.FC<CreditContractFormModalProps> = ({
  isOpen,
  editing,
  form,
  setForm,
  formAmount,
  setFormAmount,
  formApprovalAmount,
  setFormApprovalAmount,
  useSharedApproval,
  setUseSharedApproval,
  selectedCollateralIds,
  setSelectedCollateralIds,
  collaterals,
  purposeOptions,
  tongKhaNangBaoDam,
  vuotKhaNangBaoDam,
  onSave,
  onClose,
}) => {
  const today = todayIso();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-surface/40 flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-sm sm:text-base text-ink tracking-tight uppercase">
                {editing ? 'CHỈNH SỬA HỢP ĐỒNG TÍN DỤNG' : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-ink-faint">
                {editing ? `HĐTD số: ${editing.HdtdNumber}` : 'Thiết lập hạn mức cấp và thế chấp TSBĐ'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Form Body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>
                Số Hợp đồng Tín dụng <span className="text-neg">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus={!editing}
                placeholder="VD: HĐTD-2026/001..."
                value={form.HdtdNumber || ''}
                onChange={e => setForm({ ...form, HdtdNumber: e.target.value })}
                className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>
                Phương thức cho vay <span className="text-neg">*</span>
              </label>
              <select
                value={form.LoanMethod || LOAN_METHODS[0]}
                onChange={e => setForm({ ...form, LoanMethod: e.target.value })}
                className={`w-full rounded-xl p-2.5 font-semibold ${UI.inputStyle}`}
              >
                {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>
                Hạn mức cấp HĐTD (VNĐ) <span className="text-neg">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 1.000.000.000"
                value={formAmount}
                onChange={e => setFormAmount(formatMoneyInput(e.target.value))}
                className={`w-full rounded-xl p-2.5 font-mono font-bold text-sm text-accent ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Thời hạn vay tối đa (Tháng)</label>
              <input
                type="number"
                min={1}
                max={360}
                value={form.LoanTenorMonths ?? 12}
                onChange={e => setForm({ ...form, LoanTenorMonths: parseInt(e.target.value, 10) || 12 })}
                className={`w-full rounded-xl p-2.5 font-mono font-bold ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Ngày bắt đầu hiệu lực</label>
              <DateInput
                value={form.ContractStartDate}
                onChange={d => setForm({ ...form, ContractStartDate: d })}
                className={`w-full rounded-xl p-2.5 ${UI.inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Ngày hết hạn hiệu lực</label>
              <DateInput
                value={form.ContractEndDate}
                onChange={d => setForm({ ...form, ContractEndDate: d })}
                className={`w-full rounded-xl p-2.5 ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div>
            <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Mục đích sử dụng vốn</label>
            <select
              value={form.LoanPurpose || ''}
              onChange={e => setForm({ ...form, LoanPurpose: e.target.value })}
              className={`w-full rounded-xl p-2.5 font-medium ${UI.inputStyle}`}
            >
              <option value="">— Chọn mục đích sử dụng vốn —</option>
              {purposeOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Tờ trình phê duyệt chung */}
          <div className="space-y-2 pt-2 border-t border-line/60">
            <label className="text-xs font-bold text-ink flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSharedApproval}
                onChange={e => setUseSharedApproval(e.target.checked)}
                className="rounded border-line"
              />
              <span>Dùng Tờ trình Phê duyệt hạn mức chung</span>
            </label>

            {useSharedApproval && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150">
                <div>
                  <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Mã Tờ trình phê duyệt</label>
                  <input
                    type="text"
                    placeholder="VD: TT-2026/999"
                    value={form.ApprovalCode || ''}
                    onChange={e => setForm({ ...form, ApprovalCode: e.target.value })}
                    className={`w-full rounded-xl p-2.5 font-mono ${UI.inputStyle}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Tổng hạn mức phê duyệt chung (VNĐ)</label>
                  <input
                    type="text"
                    placeholder="VD: 5.000.000.000"
                    value={formApprovalAmount}
                    onChange={e => setFormApprovalAmount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-xl p-2.5 font-mono ${UI.inputStyle}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gán TSBĐ */}
          <div className="space-y-2 pt-2 border-t border-line/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className={`block font-bold text-ink ${UI.labelStyle}`}>
                Tài sản Bảo đảm Thế chấp cho HĐTD ({selectedCollateralIds.length} đã chọn) <span className="text-neg">*</span>
              </label>
              {tongKhaNangBaoDam > 0 && (
                <span className="text-[11px] font-bold text-pos font-mono">
                  Khả năng bảo đảm: {fmtMoney(tongKhaNangBaoDam)}
                </span>
              )}
            </div>

            {vuotKhaNangBaoDam && (
              <div className="p-3 rounded-xl bg-warn-soft border border-warn/30 text-warn text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Cảnh báo: Hạn mức cấp ({fmtMoney(parseMoneyInput(formAmount))}) vượt quá Khả năng bảo đảm khả dụng của TSBĐ ({fmtMoney(tongKhaNangBaoDam)}).
                </span>
              </div>
            )}

            <div className="max-h-52 overflow-y-auto space-y-2 p-2.5 rounded-xl border border-line/70 bg-surface/60 custom-scrollbar">
              {collaterals.length === 0 ? (
                <div className="text-center py-4 text-ink-faint text-xs">
                  Khách hàng chưa có TSBĐ nào. Vui lòng thêm TSBĐ ở phân hệ Tài sản bảo đảm trước.
                </div>
              ) : (
                collaterals.map(c => {
                  const isSelected = selectedCollateralIds.includes(c.Id);
                  const val = collateralValue(c);
                  const cap = usableCapacity(c, today);

                  return (
                    <label
                      key={c.Id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent-soft/40 border-accent/50 text-ink shadow-xs'
                          : 'bg-panel/70 border-line/60 text-ink-muted hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCollateralIds([...selectedCollateralIds, c.Id]);
                            } else {
                              setSelectedCollateralIds(selectedCollateralIds.filter(x => x !== c.Id));
                            }
                          }}
                          className="rounded border-line"
                        />
                        <div className="truncate">
                          <span className="font-bold text-ink">{c.AssetCode || c.AssetType || 'TSBĐ'}</span>
                          <span className="text-[10px] text-ink-faint ml-2">({c.AssetType || 'Khác'})</span>
                          {c.Address && (
                            <p className="text-[10px] text-ink-faint truncate mt-0.5">{c.Address}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3 font-mono">
                        <div className="font-bold text-ink">{fmtMoney(val)}</div>
                        <div className="text-[10px] text-pos font-semibold">Khả dụng: {fmtMoney(cap)}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className={`block mb-1 font-semibold ${UI.labelStyle}`}>Ghi chú bổ sung</label>
            <textarea
              rows={2}
              placeholder="Ghi chú điều kiện cấp tín dụng, phê duyệt..."
              value={form.Note || ''}
              onChange={e => setForm({ ...form, Note: e.target.value })}
              className={`w-full rounded-xl p-2.5 ${UI.inputStyle}`}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-line/60 flex items-center justify-end space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
            >
              {editing ? 'Lưu cập nhật HĐTD' : 'Tạo mới HĐTD'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
