import React, { useState } from 'react';
import { UI } from '../../lib/uiClasses';
import {
  FileText, Plus, Trash2, Save, X, Banknote, AlertTriangle, Building2,
  Calendar, ChevronDown, ChevronUp, UserCheck, Clock
} from 'lucide-react';
import { fmtDate, fmtMoney, fmtRate, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import { usableCapacity, collateralValue } from '../../lib/collateralMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { useCreditContractController, LOAN_METHODS } from '../../hooks/useCreditContractController';
import { isRevolvingCredit } from '../../lib/loanProductRules';

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
    getKunnsForContract,
    outstandingOf,
  } = useCreditContractController();

  const [expandedKunnContractIds, setExpandedKunnContractIds] = useState<number[]>([]);
  const today = todayIso();

  const toggleKunnAccordion = (contractId: number) => {
    setExpandedKunnContractIds(prev =>
      prev.includes(contractId) ? prev.filter(id => id !== contractId) : [...prev, contractId]
    );
  };

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;
  const labelStyle = UI.labelStyle;

  const totalGranted = summaries.reduce((sum, s) => sum + (s.contract.ContractAmount || 0), 0);
  const totalOutstanding = summaries.reduce((sum, s) => sum + s.outstanding, 0);
  const totalAvailable = Math.max(0, totalGranted - totalOutstanding);

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      {/* Customer Selector Top Bar */}
      <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-accent font-bold text-xs tracking-tight">
            <div className="p-1.5 rounded-lg bg-accent-soft border border-accent/30 text-accent">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="uppercase font-bold">HỢP ĐỒNG TÍN DỤNG & QUẢN TRỊ HẠN MỨC</span>
              <p className="text-[11px] font-normal text-ink-faint">
                Quản lý hạn mức cấp, thế chấp TSBĐ, tờ trình phê duyệt và giải ngân KUNN
              </p>
            </div>
          </div>

          <div className="w-full sm:w-80">
            <select
              value={customer?.Id ?? ''}
              onChange={e => {
                const id = parseInt(e.target.value, 10);
                const c = allCustomers.find(x => x.Id === id) || null;
                setSelectedCustomerId(c?.Id ?? null);
                loadCustomer(c);
              }}
              className={`w-full rounded-lg p-2.5 text-xs font-semibold border ${inputStyle}`}
            >
              <option value="">— Chọn Khách hàng để quản lý HĐTD —</option>
              {allCustomers.map(c => (
                <option key={c.Id} value={c.Id}>
                  {c.FullName} (CIF: {c.CifKh})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zero State when no customer is selected */}
      {!customer && (
        <div className={`${containerCardBg} rounded-xl p-10 border border-line shadow-sm text-center space-y-3`}>
          <div className="w-12 h-12 rounded-2xl bg-accent-soft/60 border border-accent/30 text-accent flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-ink">Chưa chọn Khách hàng</h3>
            <p className="text-xs text-ink-faint max-w-md mx-auto">
              Vui lòng chọn khách hàng từ danh sách phía trên hoặc thanh Header để xem danh sách Hợp đồng tín dụng, hạn mức khả dụng và TSBĐ thế chấp.
            </p>
          </div>
        </div>
      )}

      {/* When customer is selected */}
      {customer && (
        <>
          {/* Top 4 KPI Metrics Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Khách hàng / Mã CIF</div>
              <div className="font-mono font-bold text-base text-accent">{customer.CifKh || '—'}</div>
              <div className="text-xs font-bold truncate text-ink" title={customer.FullName}>{customer.FullName}</div>
            </div>

            <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng hạn mức đã cấp</div>
              <div className="font-mono font-bold text-base text-ink">{fmtMoney(totalGranted)}</div>
              <div className="text-[11px] text-ink-faint font-semibold">
                {openContractsCount} HĐTD đang mở / {summaries.length} Tổng HĐ
              </div>
            </div>

            <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-warn" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Dư nợ KUNN hiện hữu</div>
              <div className="font-mono font-bold text-base text-warn">{fmtMoney(totalOutstanding)}</div>
              <div className="text-[11px] text-ink-faint">
                Tỷ lệ sử dụng: {totalGranted > 0 ? ((totalOutstanding / totalGranted) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>

            <div className={`${containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-pos" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hạn mức khả dụng</div>
              <div className="font-mono font-bold text-base text-pos">{fmtMoney(totalAvailable)}</div>
              <div className="text-[11px] text-ink-faint">Sẵn sàng cấp/giải ngân KUNN mới</div>
            </div>
          </div>

          {/* Main Contract List Card */}
          <div className={`${containerCardBg} rounded-xl border border-line shadow-sm overflow-hidden`}>
            {/* Header Action Bar */}
            <div className="p-4 border-b border-line bg-panel flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="font-bold text-xs text-ink tracking-tight flex items-center gap-2">
                  <span>DANH SÁCH HỢP ĐỒNG TÍN DỤNG</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-panel-muted text-accent border border-line">
                    {visibleSummaries.length} HĐ
                  </span>
                </div>

                {closedCount > 0 && (
                  <label className="text-[11px] font-semibold text-ink-muted flex items-center space-x-1.5 cursor-pointer select-none">
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

              <button
                type="button"
                onClick={openNew}
                className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>TẠO HỢP ĐỒNG MỚI</span>
              </button>
            </div>

            {/* Contract Cards Body */}
            <div className="p-4 space-y-4">
              {visibleSummaries.length === 0 ? (
                <div className="text-center py-10 text-ink-faint text-xs space-y-2">
                  <p>
                    {showSettled
                      ? 'Khách hàng này chưa có Hợp đồng tín dụng nào.'
                      : 'Không có HĐTD nào đang mở hiệu lực.'}
                  </p>
                  <button
                    type="button"
                    onClick={openNew}
                    className="text-accent hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Bấm vào đây để tạo HĐTD đầu tiên
                  </button>
                </div>
              ) : (
                visibleSummaries.map(({ contract: cc, outstanding, available, kunnCount, activeKunnCount }) => {
                  const assignedCols = collaterals.filter(c =>
                    (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).includes(c.Id)
                  );
                  const isExpanded = expandedKunnContractIds.includes(cc.Id);
                  const contractKunns = getKunnsForContract(cc);

                  const granted = cc.ContractAmount || 0;
                  const isRevolving = isRevolvingCredit(cc.LoanMethod);
                  const totalDisbursed = contractKunns.reduce((s, k) => s + (k.LoanAmount || k.ContractAmount || 0), 0);

                  const isExpired = !!(cc.ContractEndDate && cc.ContractEndDate < today);
                  const isExpiringSoon = !isExpired && !!(cc.ContractEndDate && (
                    (new Date(cc.ContractEndDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24) <= 30
                  ));

                  const canDisburse = !cc.IsClosed && !isExpired && available > 0;
                  const canDelete = kunnCount === 0;

                  // Progress bar utilization percent
                  const utilPercent = granted > 0
                    ? isRevolving
                      ? Math.min(100, (outstanding / granted) * 100)
                      : (available <= 0 || totalDisbursed >= granted ? 100 : Math.min(100, (totalDisbursed / granted) * 100))
                    : 0;

                  return (
                    <div
                      key={cc.Id}
                      className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                        cc.IsClosed
                          ? 'bg-panel-muted/30 border-line opacity-75'
                          : 'bg-panel border-line hover:border-accent/40 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Info & Action Buttons */}
                      <div className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-[240px]">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-mono font-bold text-sm text-accent tracking-tight">
                                {cc.HdtdNumber}
                              </span>
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
                              {isExpired && !cc.IsClosed && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neg-soft text-neg border border-neg/30 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> HẾT HẠN HIỆU LỰC
                                </span>
                              )}
                              {isExpiringSoon && !cc.IsClosed && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warn-soft text-warn border border-warn/30 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> SẮP HẾT HẠN
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint">
                              {cc.ApprovalCode && (
                                <span className="font-mono">
                                  Tờ trình: <strong className="text-accent">{cc.ApprovalCode}</strong>
                                  {cc.ApprovalAmount && ` (${fmtMoney(cc.ApprovalAmount)})`}
                                </span>
                              )}
                              {(cc.ContractStartDate || cc.ContractEndDate) && (
                                <span className="flex items-center gap-1 font-mono text-ink-muted">
                                  <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span>
                                    {cc.ContractStartDate ? fmtDate(cc.ContractStartDate) : '—'} → {cc.ContractEndDate ? fmtDate(cc.ContractEndDate) : '—'}
                                  </span>
                                  {cc.LoanTenorMonths && (
                                    <span className="text-[10px] text-ink-faint">({cc.LoanTenorMonths} tháng)</span>
                                  )}
                                </span>
                              )}
                              {cc.LoanPurpose && (
                                <span className="text-ink-faint">
                                  Mục đích: <strong className="text-ink font-medium">{cc.LoanPurpose}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              disabled={!canDisburse}
                              onClick={() => handleDisburseRequest(cc)}
                              className={`font-bold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs ${
                                canDisburse
                                  ? 'bg-accent text-accent-ink hover:opacity-90'
                                  : 'bg-panel-muted border border-line text-ink-faint cursor-not-allowed opacity-60'
                              }`}
                              title={
                                cc.IsClosed
                                  ? 'HĐTD đã đóng tất toán'
                                  : isExpired
                                  ? 'HĐTD đã hết hạn hiệu lực'
                                  : available <= 0
                                  ? (isRevolving ? 'Dư nợ đã đạt tối đa hạn mức' : 'Cho vay từng lần: Đã giải ngân đủ hạn mức')
                                  : 'Giải ngân KUNN mới từ HĐTD này'
                              }
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>{available <= 0 ? 'Hết khả dụng' : isExpired ? 'Hết hạn HĐTD' : 'Giải ngân từ HĐTD'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(cc)}
                              className="border border-line bg-panel text-ink hover:border-accent font-semibold text-xs py-1.5 px-3 rounded-lg transition-colors"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => handleDelete(cc)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                canDelete
                                  ? 'border-line bg-panel text-ink-faint hover:text-neg hover:border-neg'
                                  : 'border-line bg-panel-muted/50 text-ink-faint/40 cursor-not-allowed'
                              }`}
                              title={
                                canDelete
                                  ? 'Xóa HĐTD'
                                  : `Không thể xóa: Có ${kunnCount} KUNN liên kết (Ràng buộc Postgres RESTRICT)`
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Financial Metrics & Visual Utilization Progress Bar */}
                        <div className="space-y-2 pt-2 border-t border-line">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                              <div className={`font-mono font-bold ${available > 0 ? 'text-pos' : 'text-ink-faint'}`}>
                                {fmtMoney(available)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-ink-faint font-semibold uppercase">Quy mô KUNN</div>
                              <div className="font-semibold text-ink">{activeKunnCount} mở / {kunnCount} tổng KUNN</div>
                            </div>
                          </div>

                          {/* Visual Headroom Progress Bar */}
                          <div className="space-y-1">
                            <div className="w-full bg-panel-muted rounded-full h-2 overflow-hidden flex border border-line">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  utilPercent >= 100 || available <= 0
                                    ? 'bg-neg'
                                    : utilPercent > 80
                                    ? 'bg-warn'
                                    : 'bg-pos'
                                }`}
                                style={{ width: `${utilPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-ink-faint">
                              <span>
                                {isRevolving
                                  ? `Hạn mức quay vòng: Đã sử dụng ${utilPercent.toFixed(1)}%`
                                  : `Cho vay từng lần: Đã giải ngân ${fmtMoney(totalDisbursed)} / ${fmtMoney(granted)}`}
                              </span>
                              <span>
                                {available > 0 ? `Còn trống ${fmtMoney(available)}` : 'Hết hạn mức giải ngân (0 VNĐ)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Collateral Tag Badges */}
                        {assignedCols.length > 0 && (
                          <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                            <span className="flex items-center gap-1 font-semibold text-ink-faint shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                              TSBĐ thế chấp ({assignedCols.length}):
                            </span>
                            {assignedCols.map(c => (
                              <span
                                key={c.Id}
                                className="px-2 py-0.5 rounded-md bg-panel-muted border border-line text-ink font-mono text-[10px] flex items-center gap-1.5"
                              >
                                <strong>{c.AssetCode || c.AssetType || 'TSBĐ'}</strong>
                                <span className="text-ink-faint">({fmtMoney(collateralValue(c))})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Accordion Toggle Footer */}
                      <div className="border-t border-line bg-panel-muted/40 px-4 py-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleKunnAccordion(cc.Id)}
                          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1.5"
                        >
                          {isExpanded ? (
                            <><span>Thu gọn danh sách KUNN</span><ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <><span>Xem chi tiết {contractKunns.length} Khế ước nhận nợ (KUNN)</span><ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>

                        <span className="text-[10px] text-ink-faint">
                          {contractKunns.filter(k => !k.IsSettled).length} KUNN đang lưu nợ
                        </span>
                      </div>

                      {/* Expanded KUNN Table */}
                      {isExpanded && (
                        <div className="p-3 bg-panel-muted/20 border-t border-line animate-in fade-in-50 duration-150">
                          {contractKunns.length === 0 ? (
                            <div className="text-center py-3 text-ink-faint text-xs">
                              Chưa có KUNN nào được giải ngân dưới HĐTD này.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-ink-faint uppercase border-b border-line text-left">
                                    <th className="pb-1.5 font-bold">Số KUNN</th>
                                    <th className="pb-1.5 font-bold text-right">Số tiền vay</th>
                                    <th className="pb-1.5 font-bold text-right">Dư nợ hiện tại</th>
                                    <th className="pb-1.5 font-bold text-center">Lãi suất</th>
                                    <th className="pb-1.5 font-bold">Ngày vay → Đáo hạn</th>
                                    <th className="pb-1.5 font-bold text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-line/60">
                                  {contractKunns.map(k => {
                                    const kunnBalance = outstandingOf(k);
                                    return (
                                      <tr key={k.Id} className="hover:bg-panel-muted/60 transition-colors">
                                        <td className="py-2 font-mono font-bold text-accent">
                                          {k.ContractNumber}
                                        </td>
                                        <td className="py-2 font-mono font-semibold text-right text-ink">
                                          {fmtMoney(k.LoanAmount || k.ContractAmount || 0)}
                                        </td>
                                        <td className="py-2 font-mono font-bold text-right text-warn">
                                          {fmtMoney(kunnBalance)}
                                        </td>
                                        <td className="py-2 font-mono text-center text-accent font-semibold">
                                          {fmtRate(getEffectiveActiveRate(k))}
                                        </td>
                                        <td className="py-2 font-mono text-ink-faint">
                                          {k.DisbursementDate ? fmtDate(k.DisbursementDate) : (k.ContractStartDate ? fmtDate(k.ContractStartDate) : '—')} → {k.KunnDueDate ? fmtDate(k.KunnDueDate) : (k.ContractEndDate ? fmtDate(k.ContractEndDate) : '—')}
                                        </td>
                                        <td className="py-2 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                            k.IsSettled
                                              ? 'bg-panel-muted text-ink-faint border border-line'
                                              : 'bg-pos-soft text-pos border border-pos/30'
                                          }`}>
                                            {k.IsSettled ? 'ĐÃ TẤT TOÁN' : 'ĐANG VAY'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Tạo / Sửa Hợp đồng Tín dụng */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setShowForm(false)}
        >
          <div
            className={`${containerCardBg} rounded-2xl border border-line-strong shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden text-xs`}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') setShowForm(false);
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave(e);
              }
            }}
          >
            {/* Modal Header */}
            <div className="p-4 sm:px-6 border-b border-line bg-panel-muted/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent-soft border border-accent/30 text-accent">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                    {editing ? `SỬA HỢP ĐỒNG: ${editing.HdtdNumber}` : 'TẠO HỢP ĐỒNG TÍN DỤNG MỚI'}
                  </h3>
                  <p className="text-[11px] text-ink-faint">
                    Khách hàng: <strong className="text-accent">{customer?.FullName}</strong> (CIF: {customer?.CifKh})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-panel transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
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
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] space-x-3">
                            <span>Định giá: <strong className="text-accent">{fmtMoney(val)}</strong></span>
                            <span>Khả dụng: <strong className="text-pos">{fmtMoney(cap)}</strong></span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Đóng / Tất toán HĐTD */}
              {editing && (
                <div className="space-y-2 pt-2 border-t border-line">
                  <label className="text-xs font-bold text-ink flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.IsClosed ?? false}
                      onChange={e => setForm({ ...form, IsClosed: e.target.checked })}
                      className="rounded border-line"
                    />
                    <span>Đánh dấu HĐTD ĐÃ ĐÓNG / TẤT TOÁN HẠN MỨC</span>
                  </label>

                  {!closeCheck.allowed && form.IsClosed && (
                    <div className="p-2.5 rounded-lg bg-neg-soft border border-neg/30 text-neg text-xs font-semibold">
                      Chưa thể đóng HĐTD: còn {closeCheck.unsettledKunnNumbers.length} KUNN chưa tất toán ({closeCheck.unsettledKunnNumbers.join(', ')}). Tất toán các KUNN trước.
                    </div>
                  )}
                </div>
              )}

              {/* Sticky Footer */}
              <div className="border-t border-line pt-4 flex items-center justify-between gap-3 sticky bottom-0 bg-panel -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:px-6 z-10">
                <div className="text-[11px] text-ink-faint hidden sm:block">
                  Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-panel-muted border border-line font-mono font-bold text-ink">Ctrl + Enter</kbd> để lưu nhanh
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-line bg-panel-muted text-ink-muted hover:text-ink font-semibold"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-accent hover:opacity-90 text-accent-ink font-bold py-2 px-5 rounded-lg flex items-center space-x-1.5 shadow-xs disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editing ? 'CẬP NHẬT HĐTD' : 'LƯU HỢP ĐỒNG MỚI'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
