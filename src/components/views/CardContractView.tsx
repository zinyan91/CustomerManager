import React from 'react';
import { UI, PANEL, BTN_PRIMARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import { CARD_POLICY_SOURCE } from '../../lib/cardContract';
import { fmtMoney } from '../../lib/utils';
import { Toast } from '../Toast';
import { CreditCard, Plus } from 'lucide-react';
import { useCardContractController } from '../../hooks/useCardContractController';
import { CardContractModal } from '../card/CardContractModal';
import { CardContractCard } from '../card/CardContractCard';

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
    <div className="space-y-4 font-app animate-in fade-in duration-150">
      {notification && (
        <Toast toast={notification} onDismiss={() => setNotification(null)} />
      )}

      {/* Top Header Card */}
      <div className={`${PANEL} rounded-2xl p-4 sm:p-5 space-y-3.5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={`${HEADING_SCREEN} flex items-center gap-2.5`}>
            <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-sm sm:text-base text-accent uppercase">
              HỢP ĐỒNG & HỒ SƠ THẺ TÍN DỤNG
            </span>
          </div>
          <span className="text-xs text-ink-faint">
            Mã chính sách theo QĐ {CARD_POLICY_SOURCE.decision} ({CARD_POLICY_SOURCE.issuedDate})
          </span>
        </div>

        <div>
          <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
            Khách hàng tác nghiệp
          </label>
          <select
            value={selectedCustomerId ?? ''}
            onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
            className={`w-full rounded-xl p-2.5 text-xs font-bold border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
          >
            <option value="">— Chọn khách hàng để xem danh sách thẻ —</option>
            {customers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} (CIF: {c.CifKh})</option>
            ))}
          </select>
        </div>

        {customer && (
          <div className="flex items-center justify-between pt-3 border-t border-line/60 flex-wrap gap-2 text-xs">
            <div>
              Tổng hạn mức thẻ tín dụng đã cấp: <strong className="text-accent font-mono font-bold text-sm">{fmtMoney(totalGranted)}</strong>
              {' '}· <span className="font-semibold text-ink">{contracts.length} hợp đồng</span> ({contracts.filter(x => !x.IsClosed).length} đang mở)
            </div>
            <button
              type="button"
              onClick={() => resetForm()}
              className={`${BTN_PRIMARY} text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-accent/20`}
            >
              <Plus size={14} /> Thêm hợp đồng thẻ mới
            </button>
          </div>
        )}
      </div>

      {/* Contract List */}
      {customer && (
        <div className={`${PANEL} rounded-2xl p-4 sm:p-5 space-y-3.5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card`}>
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <div className={`${SECTION_LABEL} text-xs font-bold text-accent uppercase tracking-wider`}>
              Danh sách hợp đồng thẻ của {customer.FullName}
            </div>
            <span className="text-xs text-ink-faint font-medium">
              {contracts.length} hợp đồng
            </span>
          </div>

          {contracts.length === 0 ? (
            <div className="text-center py-10 text-ink-faint text-xs">
              Chưa có hợp đồng thẻ nào. Nhấp <strong>"Thêm hợp đồng thẻ mới"</strong> để mở thẻ tín dụng hoặc thẻ ghi nợ cho khách hàng.
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map(c => (
                <CardContractCard
                  key={c.Id}
                  contract={c}
                  customer={customer}
                  onEdit={resetForm}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && customer && (
        <CardContractModal
          isOpen={showForm}
          editingId={editingId}
          fNumber={fNumber}
          setFNumber={setFNumber}
          fHolderSide={fHolderSide}
          setFHolderSide={setFHolderSide}
          fHolderName={fHolderName}
          setFHolderName={setFHolderName}
          fProducts={fProducts}
          toggleProduct={toggleProduct}
          fLimit={fLimit}
          setFLimit={setFLimit}
          fCollateralKind={fCollateralKind}
          setFCollateralKind={setFCollateralKind}
          fPolicyKey={fPolicyKey}
          setFPolicyKey={setFPolicyKey}
          fCollateralId={fCollateralId}
          setFCollateralId={setFCollateralId}
          fIssueDate={fIssueDate}
          setFIssueDate={setFIssueDate}
          fNote={fNote}
          setFNote={setFNote}
          fClosed={fClosed}
          setFClosed={setFClosed}
          sups={sups}
          setSups={setSups}
          laGhiNo={laGhiNo}
          policy={policy}
          rule={rule}
          policiesForKind={policiesForKind}
          collaterals={collaterals}
          loading={loading}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
