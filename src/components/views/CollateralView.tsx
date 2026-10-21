import { ShieldCheck, Plus } from 'lucide-react';
import { BTN_PRIMARY } from '../../lib/uiClasses';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader';
import { CollateralSummaryStrip } from '../collateral/CollateralSummaryStrip';
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
    <div data-workspace-page className="space-y-0 text-xs pb-8 font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <WorkspacePageHeader
        title="Định giá tài sản"
        icon={ShieldCheck}
        actions={
          <button type="button" onClick={handleOpenCreateForm} className={`${BTN_PRIMARY} text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer`}>
            <Plus className="w-4 h-4" />
            <span>Thêm TSBĐ mới</span>
          </button>
        }
      />
      <CollateralSummaryStrip
        totalValue={totalCollateralVal}
        count={customerScopedCollateralCount}
        counts={appraisalStatusCounts}
        filter={statusFilter}
        onFilterChange={filter => { setStatusFilter(filter); setColPage(1); }}
      />

      <CollateralSearchBar
        searchText={searchText}
        setSearchText={setSearchText}
        setColPage={setColPage}
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
