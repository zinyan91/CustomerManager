import React, { useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Plus, UserCheck, Landmark, Building2, ShieldCheck } from 'lucide-react';
import { Toast } from '../Toast';
import { useCreditContractController } from '../../hooks/useCreditContractController';
import { totalsOfCreditContracts } from '../../lib/creditContract';
import { fmtMoney } from '../../lib/utils';
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

  const { granted: totalGranted } = totalsOfCreditContracts(summaries);
  const activeContractCount = summaries.filter(s => !s.contract.IsClosed).length;

  return (
    <div className="space-y-4 md:space-y-4.5 w-full pb-8">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      {/* Sleek Action Header, Customer Switcher & Integrated Telemetry */}
      <div className={`${containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs space-y-4 specular-card`}>
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
                Theo dõi hạn mức cấp, giải ngân KUNN và quản lý vòng đời HĐTD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-full sm:w-80">
              <select
                value={customer?.Id ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  setSelectedCustomerId(raw ? parseInt(raw, 10) : null);
                }}
                className="w-full rounded-xl px-3 py-2 text-xs font-bold text-ink border border-line/70 bg-surface/80 focus:border-accent transition-colors shadow-2xs"
              >
                <option value="">— Chọn Khách hàng để tác nghiệp —</option>
                {allCustomers.map(c => (
                  <option key={c.Id} value={c.Id}>
                    {c.FullName} ({c.CifKh})
                  </option>
                ))}
              </select>
            </div>

            {customer && (
              <button
                type="button"
                onClick={openNew}
                className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-3.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">TẠO HỢP ĐỒNG</span>
                <span className="sm:hidden">TẠO MỚI</span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated Portfolio Telemetry Strip */}
        {customer && (
          <div className="pt-3.5 border-t border-line/60 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
            {/* 1. Tổng hạn mức đã cấp */}
            <div className="p-3 rounded-xl bg-surface/60 border border-line/60 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Hạn mức đã cấp</div>
                <div className="font-mono font-bold text-sm sm:text-base text-accent truncate">
                  {fmtMoney(totalGranted)}
                </div>
              </div>
            </div>

            {/* 2. Quy mô HĐTD */}
            <div className="p-3 rounded-xl bg-surface/60 border border-line/60 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-pos-soft text-pos shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Quy mô HĐTD</div>
                <div className="font-mono font-bold text-sm sm:text-base text-ink truncate">
                  {activeContractCount} <span className="text-xs font-normal text-ink-faint">mở / {summaries.length} tổng</span>
                </div>
              </div>
            </div>

            {/* 3. Khả năng bảo đảm TSBĐ */}
            <div className="p-3 rounded-xl bg-surface/60 border border-line/60 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-warn-soft text-warn shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Khả năng bảo đảm</div>
                <div className="font-mono font-bold text-sm sm:text-base text-ink truncate">
                  {fmtMoney(tongKhaNangBaoDam)}
                </div>
              </div>
            </div>

            {/* 4. Tỷ lệ bảo đảm */}
            <div className="p-3 rounded-xl bg-surface/60 border border-line/60 flex items-center space-x-3">
              <div className={`p-2 rounded-lg shrink-0 ${vuotKhaNangBaoDam ? 'bg-neg-soft text-neg' : 'bg-pos-soft text-pos'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Tỷ lệ bảo đảm</div>
                <div className={`font-mono font-bold text-sm sm:text-base truncate ${vuotKhaNangBaoDam ? 'text-neg' : 'text-pos'}`}>
                  {totalGranted > 0 ? `${((tongKhaNangBaoDam / totalGranted) * 100).toFixed(0)}%` : '100%'}
                  {vuotKhaNangBaoDam && <span className="text-[10px] font-normal text-neg ml-1">(Thiếu TSBĐ)</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zero State when no customer is selected */}
      {!customer && (
        <div className={`${containerCardBg} rounded-2xl p-12 border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs text-center space-y-3 specular-card`}>
          <div className="w-14 h-14 rounded-2xl bg-accent-soft/70 border border-accent/30 text-accent flex items-center justify-center mx-auto shadow-xs">
            <UserCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-ink">Chưa chọn Khách hàng</h3>
            <p className="text-xs text-ink-faint max-w-md mx-auto">
              Vui lòng chọn khách hàng từ danh sách phía trên hoặc thanh Header để xem danh sách Hợp đồng tín dụng, hạn mức khả dụng và TSBĐ thế chấp.
            </p>
          </div>
        </div>
      )}

      {/* When customer is selected */}
      {customer && (
        <>
          {/* Main Contract List Card */}
          <div className={`${containerCardBg} rounded-2xl border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs overflow-hidden specular-card`}>
            {/* Header Action Bar */}
            <div className="p-4 sm:p-5 border-b border-line/60 bg-surface/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="font-bold text-xs text-ink tracking-tight flex items-center gap-2">
                  <span className="uppercase font-bold tracking-wider text-ink-faint text-[11px]">Danh Sách Hợp Đồng Tín Dụng</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent border border-accent/20">
                    {visibleSummaries.length} HĐ
                  </span>
                </div>

                {closedCount > 0 && (
                  <label className="text-[11px] font-semibold text-ink-muted flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showSettled}
                      onChange={e => setShowSettled(e.target.checked)}
                      className="rounded border-line text-accent focus:ring-accent"
                    />
                    <span>Hiện {closedCount} HĐTD đã đóng</span>
                  </label>
                )}
              </div>
            </div>

            {/* Contract Cards Body */}
            <div className="p-4 sm:p-5 space-y-4">
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
