import React, { useState } from 'react';
import { BTN_PRIMARY, RADIUS_CONTROL, UI } from '../../lib/uiClasses';
import { FileText, Plus } from 'lucide-react';
import { Toast } from '../Toast';
import { useCreditContractController } from '../../hooks/useCreditContractController';
import { totalsOfCreditContracts } from '../../lib/creditContract';
import { mortgagesOfCreditContract } from '../../lib/mortgageContract';
import { CreditContractFormModal } from '../creditContract/CreditContractFormModal';
import { KunnAccordionItem } from '../creditContract/KunnAccordionItem';
import { CreditContractKpiStrip } from '../creditContract/CreditContractKpiStrip';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader';

export const CreditContractView: React.FC = () => {
  const {
    allCustomers,
    customer,
    collaterals,
    mortgages,
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
    <div data-workspace-page className="space-y-0 w-full pb-8 font-app">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      <WorkspacePageHeader
        title="Hợp đồng tín dụng"
        icon={FileText}
        actions={customer && (
          <button type="button" onClick={openNew} className={`${BTN_PRIMARY} text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer`}>
            <Plus className="w-4 h-4" />
            <span>Tạo hợp đồng</span>
          </button>
        )}
      />

      {!customer ? (
        <div data-workspace-panel className="workspace-toolbar px-4 py-3 border-b border-line">
          <div className="max-w-md space-y-2">
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
                className={`w-full ${RADIUS_CONTROL} px-3 py-2 text-xs border cursor-pointer ${UI.inputStyle}`}
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
        <>
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

          <CreditContractKpiStrip
            totalGranted={totalGranted}
            activeContractCount={activeContractCount}
            totalContractCount={summaries.length}
            tongKhaNangBaoDam={tongKhaNangBaoDam}
            vuotKhaNangBaoDam={vuotKhaNangBaoDam}
          />
          <div data-workspace-panel className="bg-panel">
            {closedCount > 0 && (
              <div className="workspace-toolbar flex items-center justify-end px-4 py-3 border-b border-line">
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
              <div className="space-y-0">
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
                    mortgageNumbers={mortgagesOfCreditContract(contractSummary.contract.Id, mortgages).map(m => m.MortgageNumber)}
                    today={today}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
