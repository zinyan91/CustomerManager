import { ShieldCheck, Coins, Percent, AlertOctagon, Clock, HelpCircle } from 'lucide-react';
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
    searchCif,
    setSearchCif,
    searchOwnerName,
    setSearchOwnerName,
    searchAssetCode,
    setSearchAssetCode,
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
    totalPages,
    customerScopedCollateralCount,
    totalCollateralVal,
    totalMaxLoanVal,
    weightedLtvVal,
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

      {/* Collateral Executive Telemetry Grid - Clickable Filter Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <button
          type="button"
          onClick={() => { setStatusFilter('all'); setColPage(1); }}
          className={`rounded-2xl p-4 sm:p-4.5 border text-left transition-all duration-200 cursor-pointer shadow-xs specular-card interactive-card flex flex-col justify-between ${
            statusFilter === 'all'
              ? 'border-accent ring-2 ring-accent/30 bg-panel'
              : 'border-line/65 bg-panel/85 backdrop-blur-xl hover:border-accent/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng giá trị TSĐB</span>
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-accent tracking-tight">{fmtMoney(totalCollateralVal)}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">{customerScopedCollateralCount} tài sản</div>
          </div>
        </button>

        <div className="rounded-2xl p-4 sm:p-4.5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card interactive-card flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Sức cấp tín dụng tối đa</span>
            <div className="p-1.5 rounded-lg bg-pos-soft text-pos shrink-0 shadow-2xs">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-pos tracking-tight">{fmtMoney(totalMaxLoanVal)}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Theo tỷ lệ LTV tối đa</div>
          </div>
        </div>

        <div className="rounded-2xl p-4 sm:p-4.5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card interactive-card flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">LTV Bình quân</span>
            <div className="p-1.5 rounded-lg bg-warn-soft text-warn shrink-0 shadow-2xs">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-warn tracking-tight">{weightedLtvVal.toFixed(1)}%</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Toàn bộ danh mục</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired'); setColPage(1); }}
          className={`rounded-2xl p-4 sm:p-4.5 border text-left transition-all duration-200 cursor-pointer shadow-xs specular-card interactive-card flex flex-col justify-between ${
            statusFilter === 'expired'
              ? 'border-neg ring-2 ring-neg/30 bg-neg-soft/20'
              : 'border-line/65 bg-panel/85 backdrop-blur-xl hover:border-neg/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hết hiệu lực định giá</span>
            <div className="p-1.5 rounded-lg bg-neg-soft text-neg shrink-0 shadow-2xs">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-neg tracking-tight">{appraisalStatusCounts.expired} tài sản</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Cần tái định giá gấp</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon'); setColPage(1); }}
          className={`rounded-2xl p-4 sm:p-4.5 border text-left transition-all duration-200 cursor-pointer shadow-xs specular-card interactive-card flex flex-col justify-between ${
            statusFilter === 'expiring_soon'
              ? 'border-warn ring-2 ring-warn/30 bg-warn-soft/20'
              : 'border-line/65 bg-panel/85 backdrop-blur-xl hover:border-warn/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Sắp hết hạn định giá</span>
            <div className="p-1.5 rounded-lg bg-warn-soft text-warn shrink-0 shadow-2xs">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-warn tracking-tight">{appraisalStatusCounts.expiring_soon} tài sản</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Đáo hạn trong 30 ngày</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'missing' ? 'all' : 'missing'); setColPage(1); }}
          className={`rounded-2xl p-4 sm:p-4.5 border text-left transition-all duration-200 cursor-pointer shadow-xs specular-card interactive-card flex flex-col justify-between ${
            statusFilter === 'missing'
              ? 'border-neg ring-2 ring-neg/30 bg-neg-soft/20'
              : 'border-line/65 bg-panel/85 backdrop-blur-xl hover:border-neg/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Chưa định giá</span>
            <div className="p-1.5 rounded-lg bg-neg-soft text-neg shrink-0 shadow-2xs">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-base sm:text-lg text-neg tracking-tight">{appraisalStatusCounts.missing} tài sản</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Chưa có ngày định giá</div>
          </div>
        </button>
      </div>

      <CollateralSearchBar
        searchCif={searchCif}
        setSearchCif={setSearchCif}
        searchOwnerName={searchOwnerName}
        setSearchOwnerName={setSearchOwnerName}
        searchAssetCode={searchAssetCode}
        setSearchAssetCode={setSearchAssetCode}
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
