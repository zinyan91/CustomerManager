import { ShieldCheck, AlertOctagon, Clock, HelpCircle } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';
import { CollateralSearchBar } from '../collateral/CollateralSearchBar';
import { CollateralTable } from '../collateral/CollateralTable';
import { CollateralForm } from '../collateral/CollateralForm';
import { Toast } from '../Toast';
import { useCollateralController } from '../../hooks/useCollateralController';

export const CollateralView: React.FC = () => {
  const {
    customers,
    loading,
    selectedCollateral,
    formCollapsed,
    setFormCollapsed,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    inputCustomerId,
    setInputCustomerId,
    inputAssetCode,
    setInputAssetCode,
    inputAssetType,
    setInputAssetType,
    inputAddress,
    setInputAddress,
    inputAppraisedValue,
    setInputAppraisedValue,
    inputLtvPercent,
    setInputLtvPercent,
    inputAppraisalDate,
    setInputAppraisalDate,
    inputAppraisalTenorMonths,
    setInputAppraisalTenorMonths,
    inputAppraisalExpiryDate,
    notification,
    setNotification,
    colPage,
    setColPage,
    deletingId,
    handleSelectRow,
    handleResetForm,
    handleDelete,
    handleSave,
    filteredCollaterals,
    paginatedCollaterals,
    mortgageNumbersOf,
    totalPages,
    customerScopedCollateralCount,
    totalCollateralVal,
    appraisalStatusCounts,
  } = useCollateralController();

  const handleOpenCreateForm = () => {
    handleResetForm();
    setFormCollapsed(false);
    document.getElementById('collateral-form-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-4 text-xs transition-colors duration-200 font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Bộ lọc theo tình trạng định giá - dạng pill gọn */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setStatusFilter('all'); setColPage(1); }}
          className={`rounded-xl p-3 border text-left transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'border-accent ring-1 ring-accent/30 bg-accent-soft/30'
              : 'border-line/65 bg-panel hover:border-accent/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint truncate">Tổng giá trị TSĐB</span>
            <div className="p-1 rounded-md bg-accent-soft text-accent shrink-0">
              <ShieldCheck className="w-3 h-3" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-accent tracking-tight truncate">{fmtMoney(totalCollateralVal)}</div>
          <div className="text-[10px] text-ink-faint">{customerScopedCollateralCount} tài sản</div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired'); setColPage(1); }}
          className={`rounded-xl p-3 border text-left transition-colors cursor-pointer ${
            statusFilter === 'expired'
              ? 'border-neg ring-1 ring-neg/30 bg-neg-soft/25'
              : 'border-line/65 bg-panel hover:border-neg/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint truncate">Hết hiệu lực</span>
            <div className="p-1 rounded-md bg-neg-soft text-neg shrink-0">
              <AlertOctagon className="w-3 h-3" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-neg tracking-tight">
            {appraisalStatusCounts.expired} <span className="text-[10px] font-normal text-ink-faint">tài sản</span>
          </div>
          <div className="text-[10px] text-ink-faint">Cần tái định giá</div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon'); setColPage(1); }}
          className={`rounded-xl p-3 border text-left transition-colors cursor-pointer ${
            statusFilter === 'expiring_soon'
              ? 'border-warn ring-1 ring-warn/30 bg-warn-soft/25'
              : 'border-line/65 bg-panel hover:border-warn/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint truncate">Sắp hết hạn</span>
            <div className="p-1 rounded-md bg-warn-soft text-warn shrink-0">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-warn tracking-tight">
            {appraisalStatusCounts.expiring_soon} <span className="text-[10px] font-normal text-ink-faint">tài sản</span>
          </div>
          <div className="text-[10px] text-ink-faint">Trong 30 ngày</div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'missing' ? 'all' : 'missing'); setColPage(1); }}
          className={`rounded-xl p-3 border text-left transition-colors cursor-pointer ${
            statusFilter === 'missing'
              ? 'border-neg ring-1 ring-neg/30 bg-neg-soft/25'
              : 'border-line/65 bg-panel hover:border-neg/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint truncate">Chưa định giá</span>
            <div className="p-1 rounded-md bg-neg-soft text-neg shrink-0">
              <HelpCircle className="w-3 h-3" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-neg tracking-tight">
            {appraisalStatusCounts.missing} <span className="text-[10px] font-normal text-ink-faint">tài sản</span>
          </div>
          <div className="text-[10px] text-ink-faint">Chưa có ngày ĐG</div>
        </button>
      </div>

      <CollateralSearchBar
        searchText={searchText}
        setSearchText={setSearchText}
        setColPage={setColPage}
        onNewCollateral={handleOpenCreateForm}
      />

      <CollateralTable
        filteredCollaterals={filteredCollaterals}
        paginatedCollaterals={paginatedCollaterals}
        customers={customers}
        selectedCollateral={selectedCollateral}
        handleSelectRow={handleSelectRow}
        colPage={colPage}
        setColPage={setColPage}
        totalPages={totalPages}
        onDelete={handleDelete}
        deletingId={deletingId}
        mortgageNumbersOf={mortgageNumbersOf}
      />

      <CollateralForm
        selectedCollateral={selectedCollateral}
        formCollapsed={formCollapsed}
        setFormCollapsed={setFormCollapsed}
        customers={customers}
        inputCustomerId={inputCustomerId}
        setInputCustomerId={setInputCustomerId}
        inputAssetCode={inputAssetCode}
        setInputAssetCode={setInputAssetCode}
        inputAssetType={inputAssetType}
        setInputAssetType={setInputAssetType}
        inputAddress={inputAddress}
        setInputAddress={setInputAddress}
        inputAppraisedValue={inputAppraisedValue}
        setInputAppraisedValue={setInputAppraisedValue}
        inputLtvPercent={inputLtvPercent}
        setInputLtvPercent={setInputLtvPercent}
        inputAppraisalDate={inputAppraisalDate}
        setInputAppraisalDate={setInputAppraisalDate}
        inputAppraisalTenorMonths={inputAppraisalTenorMonths}
        setInputAppraisalTenorMonths={setInputAppraisalTenorMonths}
        inputAppraisalExpiryDate={inputAppraisalExpiryDate}
        handleSave={handleSave}
        handleReset={handleResetForm}
        loading={loading}
      />
    </div>
  );
};
