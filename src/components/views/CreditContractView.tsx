import React, { useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Plus, UserCheck } from 'lucide-react';
import { Toast } from '../Toast';
import { useCreditContractController } from '../../hooks/useCreditContractController';
import { CreditContractSummaryCards } from '../creditContract/CreditContractSummaryCards';
import { totalsOfCreditContracts } from '../../lib/creditContract';
import { CreditContractFormModal } from '../creditContract/CreditContractFormModal';
import { KunnAccordionItem } from '../creditContract/KunnAccordionItem';

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
    getKunnsForContract,
    outstandingOf,
  } = useCreditContractController();

  const [expandedKunnContractIds, setExpandedKunnContractIds] = useState<number[]>([]);

  const toggleKunnAccordion = (contractId: number) => {
    setExpandedKunnContractIds(prev =>
      prev.includes(contractId) ? prev.filter(id => id !== contractId) : [...prev, contractId]
    );
  };

  const containerCardBg = UI.containerCardBg;

  const { granted: totalGranted, outstanding: totalOutstanding, available: totalAvailable } =
    totalsOfCreditContracts(summaries);

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
            </div>
          </div>

          <div className="w-full sm:w-80">
            <select
              value={customer?.Id ?? ''}
              onChange={e => {
                const raw = e.target.value;
                setSelectedCustomerId(raw ? parseInt(raw, 10) : null);
              }}
              className={`w-full rounded-lg p-2 font-bold text-ink ${UI.inputStyle}`}
            >
              <option value="">— Chọn Khách hàng —</option>
              {allCustomers.map(c => (
                <option key={c.Id} value={c.Id}>
                  {c.FullName} ({c.CifKh})
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
          <CreditContractSummaryCards
            customer={customer}
            totalGranted={totalGranted}
            totalOutstanding={totalOutstanding}
            totalAvailable={totalAvailable}
          />

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
                visibleSummaries.map(contractSummary => (
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
                    today={today}
                  />
                ))
              )}
            </div>
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
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
};
