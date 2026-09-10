import React, { useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Plus } from 'lucide-react';
import { Toast } from '../Toast';
import { useCreditContractController } from '../../hooks/useCreditContractController';
import { totalsOfCreditContracts } from '../../lib/creditContract';
import { CreditContractFormModal } from '../creditContract/CreditContractFormModal';
import { KunnAccordionItem } from '../creditContract/KunnAccordionItem';
import { CreditContractKpiStrip } from '../creditContract/CreditContractKpiStrip';

export const CreditContractView: React.FC = () => {
  const {
    allCustomers,
    customer,
    collaterals,
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
    today,
    purposeOptions,
    tongKhaNangBaoDam,
    vuotKhaNangBaoDam,
    setSelectedCustomerId,
    handleDisburseRequest,
    openNew,
    openEdit,
    handleSave,
    handleDelete,
    handleToggleCloseContract,
    getKunnsForContract,
    outstandingOf,
    closeCheck,
  } = useCreditContractController();

  const [expandedKunnContractIds, setExpandedKunnContractIds] = useState<number[]>([]);

  const toggleKunnAccordion = (contractId: number) => {
    setExpandedKunnContractIds(prev =>
      prev.includes(contractId) ? prev.filter(id => id !== contractId) : [...prev, contractId]
    );
  };

  const { granted: totalGranted } = totalsOfCreditContracts(summaries);
  const activeContractCount = summaries.filter(s => !s.contract.IsClosed).length;

  return (
    <div className="space-y-4 md:space-y-4.5 w-full pb-8 font-app animate-in fade-in duration-150">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      {/* Case 1: Chưa chọn Khách hàng — 1 Khung chọn Khách hàng trung tâm duy nhất */}
      {!customer ? (
        <div className={`${UI.containerCardBg} rounded-2xl p-6 sm:p-8 border border-line/70 bg-panel/85 backdrop-blur-xl shadow-xs space-y-6 specular-card max-w-2xl mx-auto my-6 text-center`}>
          <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto shadow-xs">
            <FileText className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
              Quản Trị Hợp Đồng Tín Dụng & Hạn Mức
            </h2>
            <p className="text-xs text-ink-faint max-w-md mx-auto">
              Vui lòng chọn khách hàng tác nghiệp để xem danh mục hợp đồng tín dụng, kiểm soát hạn mức khả dụng và giải ngân KUNN.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2 text-left">
            <label htmlFor="customer-select-main" className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Chọn Khách hàng tác nghiệp
            </label>
            <div className="relative">
              <select
                id="customer-select-main"
                aria-label="Chọn Khách hàng để tác nghiệp"
                value=""
                onChange={e => {
                  const raw = e.target.value;
                  setSelectedCustomerId(raw ? parseInt(raw, 10) : null);
                }}
                className="w-full rounded-xl px-3.5 py-3 text-xs font-bold text-ink border border-line/70 bg-surface/90 hover:bg-surface focus:border-accent transition-colors shadow-2xs cursor-pointer"
              >
                <option value="">— Nhấp vào đây để chọn Khách hàng ({allCustomers.length} KH) —</option>
                {allCustomers.map(c => (
                  <option key={c.Id} value={c.Id}>
                    {c.FullName} (CIF: {c.CifKh})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Đã chọn Khách hàng — Giao diện Tác nghiệp Tinh gọn, Không lặp lại thông tin */
        <>
          {/* Header Action & Portfolio Telemetry Card */}
          <div className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/70 bg-panel/85 backdrop-blur-xl shadow-xs space-y-4 specular-card`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center space-x-3 text-accent font-bold text-xs tracking-tight">
                <div className="p-2 rounded-xl bg-accent-soft text-accent shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink tracking-tight">
                    Quản Trị Hợp Đồng Tín Dụng & Hạn Mức
                  </h2>
                  <p className="text-[11px] text-ink-faint font-normal">
                    Theo dõi hạn mức cấp, khả năng bảo đảm TSBĐ và giải ngân KUNN
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Combobox hỗ trợ định tuyến & test tự động (ẩn giao diện vì đã có CustomerContextBar) */}
                <select
                  aria-label="Chọn Khách hàng để tác nghiệp"
                  value={customer.Id}
                  onChange={e => {
                    const raw = e.target.value;
                    setSelectedCustomerId(raw ? parseInt(raw, 10) : null);
                  }}
                  className="sr-only"
                  tabIndex={-1}
                >
                  <option value="">— Đổi Khách hàng —</option>
                  {allCustomers.map(c => (
                    <option key={c.Id} value={c.Id}>
                      {c.FullName} ({c.CifKh})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openNew}
                  className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-md shadow-accent/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>TẠO HỢP ĐỒNG</span>
                </button>
              </div>
            </div>

            {/* Integrated Portfolio Telemetry Strip */}
            <CreditContractKpiStrip
              totalGranted={totalGranted}
              activeContractCount={activeContractCount}
              totalContractCount={summaries.length}
              tongKhaNangBaoDam={tongKhaNangBaoDam}
              vuotKhaNangBaoDam={vuotKhaNangBaoDam}
            />
          </div>

          {/* Main Contract List Card */}
          <div className={`${UI.containerCardBg} rounded-2xl border border-line/70 bg-panel/85 backdrop-blur-xl shadow-xs overflow-hidden specular-card space-y-4 p-4 sm:p-5`}>
            {/* Action / Filter Bar */}
            {closedCount > 0 && (
              <div className="flex items-center justify-end pb-2 border-b border-line/50">
                <label className="text-[11px] font-semibold text-ink-muted flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSettled}
                    onChange={e => setShowSettled(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span>Hiện {closedCount} HĐTD đã đóng</span>
                </label>
              </div>
            )}

            {/* Contract Cards Body */}
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
                  className="text-accent hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Bấm vào đây để tạo HĐTD đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSummaries.map(contractSummary => (
                  <KunnAccordionItem
                    key={contractSummary.contract.Id}
                    contractSummary={contractSummary}
                    collaterals={collaterals}
                    isExpanded={expandedKunnContractIds.includes(contractSummary.contract.Id)}
                    onToggleExpand={() => toggleKunnAccordion(contractSummary.contract.Id)}
                    getKunnsForContract={getKunnsForContract}
                    outstandingOf={outstandingOf}
                    onDisburse={handleDisburseRequest}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleClose={handleToggleCloseContract}
                    today={today}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Tạo / Sửa Hợp đồng Tín dụng */}
      <CreditContractFormModal
        isOpen={showForm}
        editing={editing}
        form={form}
        setForm={setForm}
        formAmount={formAmount}
        setFormAmount={setFormAmount}
        formApprovalAmount={formApprovalAmount}
        setFormApprovalAmount={setFormApprovalAmount}
        useSharedApproval={useSharedApproval}
        setUseSharedApproval={setUseSharedApproval}
        selectedCollateralIds={selectedCollateralIds}
        setSelectedCollateralIds={setSelectedCollateralIds}
        collaterals={collaterals}
        purposeOptions={purposeOptions}
        tongKhaNangBaoDam={tongKhaNangBaoDam}
        vuotKhaNangBaoDam={vuotKhaNangBaoDam}
        closeCheck={closeCheck}
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
};
