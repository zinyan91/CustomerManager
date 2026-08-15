import React from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Save, X, AlertTriangle } from 'lucide-react';
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
  if (!isOpen) return null;

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;
  const labelStyle = UI.labelStyle;
  const today = todayIso();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`${containerCardBg} rounded-2xl border border-line shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-xs`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent border border-accent/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink uppercase">
                {editing ? 'CHỈNH SỬA HỢP ĐỒNG TÍN DỤNG' : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}
              </h3>
              <p className="text-[11px] text-ink-faint">
                {editing ? `HĐTD số: ${editing.HdtdNumber}` : 'Thiết lập hạn mức cấp và thế chấp TSBĐ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-panel transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>
                Số Hợp đồng Tín dụng <span className="text-neg">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus={!editing}
                placeholder="VD: HĐTD-2026/001..."
                value={form.HdtdNumber || ''}
                onChange={e => setForm({ ...form, HdtdNumber: e.target.value })}
                className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>
                Phương thức cho vay <span className="text-neg">*</span>
              </label>
              <select
                value={form.LoanMethod || LOAN_METHODS[0]}
                onChange={e => setForm({ ...form, LoanMethod: e.target.value })}
                className={`w-full rounded-lg p-2.5 font-semibold ${inputStyle}`}
              >
                {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>
                Hạn mức cấp HĐTD (VNĐ) <span className="text-neg">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 1.000.000.000"
                value={formAmount}
                onChange={e => setFormAmount(formatMoneyInput(e.target.value))}
                className={`w-full rounded-lg p-2.5 font-mono font-bold text-sm text-accent ${inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>Thời hạn vay tối đa (Tháng)</label>
              <input
                type="number"
                min={1}
                max={360}
                value={form.LoanTenorMonths ?? 12}
                onChange={e => setForm({ ...form, LoanTenorMonths: parseInt(e.target.value, 10) || 12 })}
                className={`w-full rounded-lg p-2.5 font-mono font-bold ${inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>Ngày bắt đầu hiệu lực</label>
              <DateInput
                value={form.ContractStartDate}
                onChange={d => setForm({ ...form, ContractStartDate: d })}
                className={`w-full rounded-lg p-2.5 ${inputStyle}`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-semibold ${labelStyle}`}>Ngày hết hạn hiệu lực</label>
              <DateInput
                value={form.ContractEndDate}
                onChange={d => setForm({ ...form, ContractEndDate: d })}
                className={`w-full rounded-lg p-2.5 ${inputStyle}`}
              />
            </div>
          </div>

          <div>
            <label className={`block mb-1 font-semibold ${labelStyle}`}>Mục đích sử dụng vốn</label>
            <select
              value={form.LoanPurpose || ''}
              onChange={e => setForm({ ...form, LoanPurpose: e.target.value })}
              className={`w-full rounded-lg p-2.5 font-medium ${inputStyle}`}
            >
              <option value="">— Chọn mục đích sử dụng vốn —</option>
              {purposeOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Tờ trình phê duyệt chung */}
          <div className="space-y-2 pt-2 border-t border-line">
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
                  <label className={`block mb-1 font-semibold ${labelStyle}`}>Mã Tờ trình phê duyệt</label>
                  <input
                    type="text"
                    placeholder="VD: TT-2026/999"
                    value={form.ApprovalCode || ''}
                    onChange={e => setForm({ ...form, ApprovalCode: e.target.value })}
                    className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-semibold ${labelStyle}`}>Tổng hạn mức phê duyệt chung (VNĐ)</label>
                  <input
                    type="text"
                    placeholder="VD: 5.000.000.000"
                    value={formApprovalAmount}
                    onChange={e => setFormApprovalAmount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gán TSBĐ */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className={`block font-bold text-ink ${labelStyle}`}>
                Tài sản Bảo đảm Thế chấp cho HĐTD ({selectedCollateralIds.length} đã chọn) <span className="text-neg">*</span>
              </label>
              {tongKhaNangBaoDam > 0 && (
                <span className="text-[11px] font-bold text-pos font-mono">
                  Khả năng bảo đảm: {fmtMoney(tongKhaNangBaoDam)}
                </span>
              )}
            </div>

            {vuotKhaNangBaoDam && (
              <div className="p-2.5 rounded-lg bg-warn-soft border border-warn/30 text-warn text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Cảnh báo: Hạn mức cấp ({fmtMoney(parseMoneyInput(formAmount))}) vượt quá Khả năng bảo đảm khả dụng của TSBĐ ({fmtMoney(tongKhaNangBaoDam)}).
                </span>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-line bg-panel-muted/30 custom-scrollbar">
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
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent-soft border-accent/40 text-ink shadow-xs'
                          : 'bg-panel border-line text-ink-muted hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
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
                            <p className="text-[10px] text-ink-faint truncate">{c.Address}</p>
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
            <label className={`block mb-1 font-semibold ${labelStyle}`}>Ghi chú bổ sung</label>
            <textarea
              rows={2}
              placeholder="Ghi chú điều kiện cấp tín dụng, phê duyệt..."
              value={form.Note || ''}
              onChange={e => setForm({ ...form, Note: e.target.value })}
              className={`w-full rounded-lg p-2.5 ${inputStyle}`}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-line text-ink-muted hover:bg-panel-muted text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-xs transition-opacity"
            >
              <Save className="w-4 h-4" />
              <span>{editing ? 'Lưu cập nhật HĐTD' : 'Tạo mới HĐTD'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
