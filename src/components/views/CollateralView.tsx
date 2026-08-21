import React from 'react';
import { fmtMoney } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { CollateralSearchBar } from '../collateral/CollateralSearchBar';
import { CollateralTable } from '../collateral/CollateralTable';
import { CollateralForm } from '../collateral/CollateralForm';
import { Toast } from '../Toast';
import { useCollateralController } from '../../hooks/useCollateralController';

export const CollateralView: React.FC = () => {
  const styles = UI;
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

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Collateral KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng giá trị TSĐB</div>
          <div className="font-mono font-bold text-base text-accent">{fmtMoney(totalCollateralVal)}</div>
          <div className="text-[11px] text-ink-faint">{customerScopedCollateralCount} tài sản</div>
        </div>

        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-pos" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Sức cấp tín dụng tối đa</div>
          <div className="font-mono font-bold text-base text-pos">{fmtMoney(totalMaxLoanVal)}</div>
        </div>

        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-warn" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">LTV Bình quân danh mục</div>
          <div className="font-mono font-bold text-base text-warn">{weightedLtvVal.toFixed(1)}%</div>
        </div>

        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-neg" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hết hiệu lực định giá</div>
          <div className="font-mono font-bold text-base text-neg">{appraisalStatusCounts.expired} tài sản</div>
        </div>

        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-warn" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Sắp hết hạn định giá</div>
          <div className="font-mono font-bold text-base text-warn">{appraisalStatusCounts.expiring_soon} tài sản</div>
        </div>

        <div className={`${styles.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-neg" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Chưa định giá</div>
          <div className="font-mono font-bold text-base text-neg">{appraisalStatusCounts.missing} tài sản</div>
        </div>
      </div>

      <CollateralSearchBar
        styles={styles}
        searchCif={searchCif}
        setSearchCif={setSearchCif}
        searchOwnerName={searchOwnerName}
        setSearchOwnerName={setSearchOwnerName}
        searchAssetCode={searchAssetCode}
        setSearchAssetCode={setSearchAssetCode}
        setColPage={setColPage}
      />

      <CollateralTable
        styles={styles}
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
        styles={styles}
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
