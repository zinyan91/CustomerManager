import React from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Plus, Trash2, Save, X, Banknote, AlertTriangle, Building2 } from 'lucide-react';
import { fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { usableCapacity, collateralValue } from '../../lib/collateralMath';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { useCreditContractController, LOAN_METHODS } from '../../hooks/useCreditContractController';

export const CreditContractView: React.FC = () => {
  const {
    allCustomers,
    customer,
    collaterals,
    loading,
    notify,
    setNotify,
    showForm,
    setShowForm,
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
    showSettled,
    setShowSettled,
    summaries,
    visibleSummaries,
    closedCount,
    openContractsCount,
    closeCheck,
    purposeOptions,
    tongKhaNangBaoDam,
    vuotKhaNangBaoDam,
    setSelectedCustomerId,
    handleDisburseRequest,
    loadCustomer,
    openNew,
    openEdit,
    handleSave,
    handleDelete,
  } = useCreditContractController();

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;
  const labelStyle = UI.labelStyle;

  return (
    <div className="space-y-4">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      <div className={`${containerCardBg} rounded-lg p-4 border space-y-3`}>
        <div className="flex items-center space-x-2 text-accent font-bold text-xs tracking-tight">
          <FileText className="w-4 h-4" />
          <span>Quản lý Hợp đồng Tín dụng</span>
        </div>
        <div>
          <label className={`block mb-1 ${labelStyle}`}>Khách hàng ({allCustomers.length} KH)</label>
          <select
            value={customer?.Id ?? ''}
            onChange={e => {
              const id = parseInt(e.target.value, 10);
              const c = allCustomers.find(x => x.Id === id) || null;
              setSelectedCustomerId(c?.Id ?? null);
              loadCustomer(c);
            }}
            className={`w-full rounded-md p-2.5 text-sm font-semibold ${inputStyle}`}
          >
            <option value="">— Chọn khách hàng —</option>
            {allCustomers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} — CIF {c.CifKh}</option>
            ))}
          </select>
        </div>
      </div>

      {customer && (
        <div className={`${containerCardBg} rounded-xl border border-line shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4`}>
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Mã CIF & Khách hàng</div>
            <div className="font-mono font-bold text-sm text-accent">{customer.CifKh || '—'}</div>
            <div className="font-bold text-xs truncate text-ink" title={customer.FullName}>{customer.FullName}</div>
          </div>

          <div className="space-y-1 border-l border-line pl-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng hạn mức đã cấp</div>
            <div className="font-mono font-bold text-sm text-accent">
              {fmtMoney(summaries.reduce((sum, s) => sum + (s.contract.ContractAmount || 0), 0))}
            </div>
            <div className="text-[11px] text-ink-faint">
              {openContractsCount} HĐTD mở / {summaries.length} Tổng HĐ
            </div>
          </div>

          <div className="space-y-1 border-l border-line pl-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Dư nợ KUNN hiện hữu</div>
            <div className="font-mono font-bold text-sm text-warn">
              {fmtMoney(summaries.reduce((sum, s) => sum + s.outstanding, 0))}
            </div>
            <div className="text-[11px] text-ink-faint">
              Quy mô đang lưu nợ
            </div>
          </div>

          <div className="space-y-1 border-l border-line pl-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hạn mức khả dụng</div>
            <div className="font-mono font-bold text-sm text-pos">
              {fmtMoney(Math.max(0, summaries.reduce((sum, s) => sum + (s.contract.ContractAmount || 0), 0) - summaries.reduce((sum, s) => sum + s.outstanding, 0)))}
            </div>
            <div className="text-[11px] text-ink-faint">Sẵn sàng giải ngân mới</div>
          </div>

          <div className="space-y-1 border-l border-line pl-4 flex flex-col justify-center">
            <button
              onClick={openNew}
              className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo HĐTD mới</span>
            </button>
          </div>
        </div>
      )}

      {customer && (
        <div className={`${containerCardBg} rounded-xl border border-line shadow-sm overflow-hidden`}>
          <div className="p-3.5 border-b border-line bg-panel flex items-center justify-between flex-wrap gap-2">
            <div className="font-bold text-xs text-ink tracking-tight">
              Danh sách HĐTD của {customer.FullName} ({visibleSummaries.length})
            </div>
            {closedCount > 0 && (
              <label className="text-[11px] font-semibold text-ink-muted flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSettled}
                  onChange={e => setShowSettled(e.target.checked)}
                  className="rounded border-line"
                />
                <span>Hiện {closedCount} HĐTD đã đóng</span>
              </label>
            )}
          </div>

          <div className="p-4 space-y-3">
            {visibleSummaries.length === 0 ? (
              <div className="text-center py-8 text-ink-faint text-xs">
                {showSettled
                  ? 'Chưa có Hợp đồng tín dụng nào.'
                  : 'Không có HĐTD đang mở. Bấm "Tạo HĐTD mới" hoặc tích "Hiện HĐTD đã đóng".'}
              </div>
            ) : (
              visibleSummaries.map(({ contract: cc, outstanding, available, kunnCount, activeKunnCount }) => {
                const assignedCols = collaterals.filter(c =>
                  (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).includes(c.Id)
                );
                return (
                  <div
                    key={cc.Id}
                    className={`rounded-xl border p-4 transition-all ${
                      cc.IsClosed ? 'bg-panel-muted/40 border-line opacity-75' : 'bg-panel border-line hover:border-accent/40 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-[240px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-accent">{cc.HdtdNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cc.IsClosed
                              ? 'bg-panel-muted border border-line text-ink-faint'
                              : 'bg-pos-soft border border-pos/30 text-pos'
                          }`}>
                            {cc.IsClosed ? 'ĐÃ ĐÓNG' : 'ĐANG HIỆU LỰC'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-panel-muted border border-line text-ink-muted">
                            {cc.LoanMethod || 'HĐTD'}
                          </span>
                        </div>
                        {cc.ApprovalCode && (
                          <div className="text-[11px] text-ink-muted font-mono">
                            Tờ trình phê duyệt: <span className="font-bold text-accent">{cc.ApprovalCode}</span>
                            {cc.ApprovalAmount && ` (${fmtMoney(cc.ApprovalAmount)})`}
                          </div>
                        )}
                        {cc.LoanPurpose && (
                          <div className="text-[11px] text-ink-faint">Mục đích: {cc.LoanPurpose}</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!cc.IsClosed && (
                          <button
                            onClick={() => handleDisburseRequest(cc)}
                            className="bg-accent text-accent-ink hover:opacity-90 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1 transition-all shadow-xs"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Giải ngân từ HĐTD</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(cc)}
                          className="border border-line bg-panel text-ink hover:border-accent font-semibold text-xs py-1.5 px-3 rounded-lg transition-colors"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(cc)}
                          className="border border-line bg-panel text-ink-faint hover:text-neg hover:border-neg p-1.5 rounded-lg transition-colors"
                          title="Xoá HĐTD"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] text-ink-faint font-semibold uppercase">Hạn mức cấp</div>
                        <div className="font-mono font-bold text-ink">{fmtMoney(cc.ContractAmount || 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-faint font-semibold uppercase">Dư nợ hiện tại</div>
                        <div className="font-mono font-bold text-warn">{fmtMoney(outstanding)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-faint font-semibold uppercase">Khả dụng giải ngân</div>
                        <div className="font-mono font-bold text-pos">{fmtMoney(available)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-faint font-semibold uppercase">Quy mô KUNN</div>
                        <div className="font-semibold text-ink">{activeKunnCount} mở / {kunnCount} tổng KUNN</div>
                      </div>
                    </div>

                    {assignedCols.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center space-x-2 text-[11px] text-ink-muted">
                        <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>TSBĐ thế chấp ({assignedCols.length}):</span>
                        <span className="font-semibold text-ink truncate">
                          {assignedCols.map(c => `${c.AssetCode || c.AssetType || 'TSBĐ'} (${fmtMoney(collateralValue(c))})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${containerCardBg} rounded-xl border border-line shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-ink">
                {editing ? `Sửa Hợp đồng Tín dụng "${editing.HdtdNumber}"` : 'Tạo Hợp đồng Tín dụng Mới'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-ink-faint hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Số HĐTD *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: HĐTD-2026/001..."
                    value={form.HdtdNumber || ''}
                    onChange={e => setForm({ ...form, HdtdNumber: e.target.value })}
                    className={`w-full rounded-md p-2 font-mono font-bold text-accent ${inputStyle}`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Phương thức cho vay *</label>
                  <select
                    value={form.LoanMethod || LOAN_METHODS[0]}
                    onChange={e => setForm({ ...form, LoanMethod: e.target.value })}
                    className={`w-full rounded-md p-2 font-semibold ${inputStyle}`}
                  >
                    {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Hạn mức cấp HĐTD (VNĐ) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 1,000,000,000"
                    value={formAmount}
                    onChange={e => setFormAmount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-md p-2 font-mono font-bold text-sm text-accent ${inputStyle}`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Thời hạn vay tối đa (Tháng)</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={form.LoanTenorMonths ?? 12}
                    onChange={e => setForm({ ...form, LoanTenorMonths: parseInt(e.target.value, 10) || 12 })}
                    className={`w-full rounded-md p-2 font-mono font-bold ${inputStyle}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Ngày bắt đầu hiệu lực HĐTD</label>
                  <DateInput
                    value={form.ContractStartDate}
                    onChange={d => setForm({ ...form, ContractStartDate: d })}
                    className={`w-full rounded-md p-2 ${inputStyle}`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Ngày hết hạn HĐTD</label>
                  <DateInput
                    value={form.ContractEndDate}
                    onChange={d => setForm({ ...form, ContractEndDate: d })}
                    className={`w-full rounded-md p-2 ${inputStyle}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${labelStyle}`}>Mục đích sử dụng vốn</label>
                <select
                  value={form.LoanPurpose || ''}
                  onChange={e => setForm({ ...form, LoanPurpose: e.target.value })}
                  className={`w-full rounded-md p-2 font-medium ${inputStyle}`}
                >
                  <option value="">— Chọn mục đích sử dụng vốn —</option>
                  {purposeOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-line">
                <label className="text-xs font-bold text-ink flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSharedApproval}
                    onChange={e => setUseSharedApproval(e.target.checked)}
                    className="rounded border-line"
                  />
                  <span>Dùng Tờ trình Phê duyệt chung (Gắn mã Tờ trình phê duyệt hạn mức)</span>
                </label>

                {useSharedApproval && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className={`block mb-1 ${labelStyle}`}>Mã Tờ trình phê duyệt</label>
                      <input
                        type="text"
                        placeholder="VD: TT-2026/999"
                        value={form.ApprovalCode || ''}
                        onChange={e => setForm({ ...form, ApprovalCode: e.target.value })}
                        className={`w-full rounded-md p-2 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className={`block mb-1 ${labelStyle}`}>Tổng hạn mức phê duyệt chung (VNĐ)</label>
                      <input
                        type="text"
                        placeholder="VD: 5,000,000,000"
                        value={formApprovalAmount}
                        onChange={e => setFormApprovalAmount(formatMoneyInput(e.target.value))}
                        className={`w-full rounded-md p-2 font-mono ${inputStyle}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <label className={`block font-bold text-ink ${labelStyle}`}>
                    Tài sản Bảo đảm Thế chấp cho HĐTD ({selectedCollateralIds.length} TSBĐ chọn) *
                  </label>
                  {tongKhaNangBaoDam > 0 && (
                    <span className="text-[11px] font-bold text-pos font-mono">
                      Khả năng bảo đảm khả dụng: {fmtMoney(tongKhaNangBaoDam)}
                    </span>
                  )}
                </div>

                {vuotKhaNangBaoDam && (
                  <div className="p-2.5 rounded-lg bg-warn-soft border border-warn/30 text-warn text-xs font-semibold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Cảnh báo: Hạn mức cấp ({fmtMoney(parseMoneyInput(formAmount))}) vượt quá Khả năng bảo đảm khả dụng của các TSBĐ được gán ({fmtMoney(tongKhaNangBaoDam)}).</span>
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-md border border-line bg-panel-muted/30">
                  {collaterals.length === 0 ? (
                    <div className="text-center py-3 text-ink-faint text-xs">
                      Khách hàng chưa có TSBĐ nào. Vui lòng thêm TSBĐ ở phân hệ Tài sản bảo đảm trước.
                    </div>
                  ) : (
                    collaterals.map(c => {
                      const isSelected = selectedCollateralIds.includes(c.Id);
                      const val = collateralValue(c);
                      const cap = usableCapacity(c, '2026-08-14');

                      return (
                        <label
                          key={c.Id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected ? 'bg-accent-soft border-accent/40 text-ink' : 'bg-panel border-line text-ink-muted hover:border-line-strong'
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
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] space-x-3">
                            <span>Giá trị: <strong className="text-accent">{fmtMoney(val)}</strong></span>
                            <span>Khả dụng: <strong className="text-pos">{fmtMoney(cap)}</strong></span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {editing && (
                <div className="space-y-2 pt-2 border-t border-line">
                  <label className="text-xs font-bold text-ink flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.IsClosed ?? false}
                      onChange={e => setForm({ ...form, IsClosed: e.target.checked })}
                      className="rounded border-line"
                    />
                    <span>Đánh dấu HĐTD ĐÃ ĐÓNG / TẤT TOÁN</span>
                  </label>

                  {!closeCheck.allowed && form.IsClosed && (
                    <div className="p-2.5 rounded-lg bg-neg-soft border border-neg/30 text-neg text-xs font-semibold">
                      Chưa thể đóng HĐTD: còn {closeCheck.unsettledKunnNumbers.length} KUNN chưa tất toán ({closeCheck.unsettledKunnNumbers.join(', ')}). Tất toán các KUNN trước.
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-line text-ink-muted hover:text-ink font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-accent hover:opacity-90 text-accent-ink font-bold py-2 px-4 rounded-lg flex items-center space-x-1.5 shadow-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{editing ? 'Lưu thay đổi' : 'Tạo HĐTD Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
