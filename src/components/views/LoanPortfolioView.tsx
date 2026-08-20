import React, { lazy, Suspense } from 'react';
import { UI } from '../../lib/uiClasses';
import { Loader2 } from 'lucide-react';
import { getAutoDebtGroupInfo, computeOutstandingBalance } from '../../lib/loanMath';
import { getMasterHdtdNumber, todayIso } from '../../lib/utils';
import { isKunnSettled } from '../../lib/creditContract';
import { graceMonthOptions } from '../../lib/loanProductRules';
import { CustomerSearchBar } from '../portfolio/CustomerSearchBar';
import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';
import { MasterHdtdFilterTabs } from '../portfolio/MasterHdtdFilterTabs';
import { KunnTable } from '../portfolio/KunnTable';
import { Toast } from '../Toast';
import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';
import type { LoanContract } from '../../types';

const PaymentModal = lazy(() => import('../portfolio/PaymentModal').then(m => ({ default: m.PaymentModal })));
const KunnForm = lazy(() => import('../portfolio/KunnForm').then(m => ({ default: m.KunnForm })));
const ScheduleTab = lazy(() => import('../portfolio/ScheduleTab').then(m => ({ default: m.ScheduleTab })));

const ComponentFallback = () => (
  <div className="flex items-center justify-center p-8 text-ink-muted">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải phân hệ...</span>
  </div>
);

export const LoanPortfolioView: React.FC = () => {
  const {
    notification,
    setNotification,
    loading,
    mainTab,
    setMainTab,
    showForm,
    setShowForm,
    selectedMasterFilter,
    setSelectedMasterFilter,
    form,
    setForm,
    formKunnNumber,
    setFormKunnNumber,
    formLoanAmount,
    setFormLoanAmount,
    formMonthlyPrincipal,
    setFormMonthlyPrincipal,
    interestRateMode,
    setInterestRateMode,
    ratePreferential,
    setRatePreferential,
    ratePreferentialMonths,
    setRatePreferentialMonths,
    rateBase,
    setRateBase,
    rateMargin,
    setRateMargin,
    rateConditionSurcharge,
    setRateConditionSurcharge,
    rateFloor,
    setRateFloor,
    rateHistory,
    setRateHistory,
    newAdjDate,
    setNewAdjDate,
    newAdjBaseRate,
    setNewAdjBaseRate,
    newAdjMargin,
    setNewAdjMargin,
    newAdjPenalty,
    setNewAdjPenalty,
    newAdjReason,
    setNewAdjReason,
    selectedCollateralIds,
    searchCif,
    setSearchCif,
    searchName,
    setSearchName,
    searchContract,
    setSearchContract,
    isSearching,
    allCustomers,
    dropdownQuery,
    setDropdownQuery,
    showDropdown,
    setShowDropdown,
    foundCustomer,
    creditContracts,
    contracts,
    collaterals,
    selectedContract,
    schedules,
    allSchedulesMap,
    handlePickCustomer,
    handleSearch,
    handleSelectContract,
    paymentModalProps,
    postPrefRate,
    normalRate,
    surchargeVal,
    currentActiveRateDisplay,
    customerLimitTotals,
    kunnLoanAmountNum,
    suggestedMonthlyPrincipal,
    dropdownFiltered,
    masterHdtdInfo,
    selectableCreditContracts,
    masterHdtdGroups,
    visibleContracts,
    settledInScopeCount,
    hiddenSettledCount,
    showSettledKunn,
    setShowSettledKunn,
    activeGroupForForm,
    matchedHdtdAmount,
    maxAllowedLoanLtv,
    applyCreditContractToForm,
    handleNewContract,
    handleSaveContract,
    handleDeleteContract,
    showNotify,
    setSelectedCustomerId,
  } = useLoanPortfolioController();

  const selectedCollaterals = collaterals.filter(c => selectedCollateralIds.includes(c.Id));

  const totalExistingKunnBal = activeGroupForForm?.outstanding || activeGroupForForm?.used || 0;
  const availBeforeThisKunn = activeGroupForForm?.available || Math.max(0, matchedHdtdAmount - totalExistingKunnBal);
  const remainingHmtd = Math.max(0, availBeforeThisKunn - kunnLoanAmountNum);

  return (
    <div className="space-y-4 font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Customer Search Section */}
      <CustomerSearchBar
        inputStyle={UI.inputStyle}
        labelStyle={UI.labelStyle}
        allCustomers={allCustomers}
        dropdownQuery={dropdownQuery}
        setDropdownQuery={setDropdownQuery}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        dropdownFiltered={dropdownFiltered}
        handlePickCustomer={handlePickCustomer}
        searchCif={searchCif}
        setSearchCif={setSearchCif}
        searchName={searchName}
        setSearchName={setSearchName}
        searchContract={searchContract}
        setSearchContract={setSearchContract}
        isSearching={isSearching}
        handleSearch={handleSearch}
        foundCustomer={foundCustomer}
        handleClearSearch={() => {
          setSearchCif('');
          setSearchName('');
          setSearchContract('');
          setSelectedCustomerId(null);
        }}
        containerCardBg={UI.containerCardBg}
      />

      {/* Summary Header */}
      {foundCustomer && (
        <CustomerSummaryHeader
          foundCustomer={foundCustomer}
          containerCardBg={UI.containerCardBg}
          selectedMasterFilter={selectedMasterFilter}
          totalCreditLimit={customerLimitTotals.granted}
          totalKunnAmount={customerLimitTotals.outstanding}
          remainingCreditLimit={customerLimitTotals.available}
          handleNewContract={handleNewContract}
        />
      )}

      {/* Main Tab Controls & Master HDTD Filter */}
      {foundCustomer && (
        <div className={`${UI.containerCardBg} rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs`}>
          <MasterHdtdFilterTabs
            masterHdtdGroups={masterHdtdGroups}
            selectedMasterFilter={selectedMasterFilter}
            setSelectedMasterFilter={setSelectedMasterFilter}
            contractsCount={contracts.length}
          />

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMainTab('kunn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mainTab === 'kunn' ? 'bg-accent text-accent-ink shadow-xs' : 'bg-panel-muted text-ink-muted hover:text-ink'
              }`}
            >
              Danh sách KUNN ({visibleContracts.length})
            </button>
            <button
              disabled={!selectedContract}
              onClick={() => setMainTab('schedule')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                mainTab === 'schedule' ? 'bg-accent text-accent-ink shadow-xs' : 'bg-panel-muted text-ink-muted hover:text-ink'
              }`}
            >
              Lịch trả nợ KUNN {selectedContract ? `(#${selectedContract.ContractNumber})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content 1: KUNN List */}
      {foundCustomer && mainTab === 'kunn' && (
        <KunnTable
          containerCardBg={UI.containerCardBg}
          tableHeaderStyle={UI.tableHeaderStyle}
          filteredContracts={visibleContracts}
          selectedContract={selectedContract}
          handleSelectContract={handleSelectContract}
          allSchedulesMap={allSchedulesMap}
          getAutoDebtGroupInfo={(schs) => getAutoDebtGroupInfo(schs || [], todayIso())}
          getMasterHdtdNumber={(c) => getMasterHdtdNumber(c)}
          isSettled={isKunnSettled}
          settledCount={settledInScopeCount}
          hiddenCount={hiddenSettledCount}
          showSettled={showSettledKunn}
          onToggleShowSettled={setShowSettledKunn}
          getEffectiveBalanceForContract={(c) => computeOutstandingBalance(allSchedulesMap[c.Id], c)}
        />
      )}

      {/* Tab Content 2: Schedule & Repayment Details */}
      {foundCustomer && mainTab === 'schedule' && selectedContract && (
        <Suspense fallback={<ComponentFallback />}>
          <ScheduleTab
            contracts={contracts}
            selectedContract={selectedContract}
            handleSelectContract={handleSelectContract}
            schedules={schedules}
            openPaymentModal={paymentModalProps.open}
            onQuickSettleAll={paymentModalProps.quickSettleAllDue}
          />
        </Suspense>
      )}

      {/* Drawer / Modal Form for KUNN */}
      {showForm && foundCustomer && mainTab === 'kunn' && (
        <Suspense fallback={<ComponentFallback />}>
          <KunnForm
            containerCardBg={UI.containerCardBg}
            sectionBoxBg={UI.sectionBoxBg}
            inputStyle={UI.inputStyle}
            readonlyInputStyle={UI.readonlyInputStyle}
            labelStyle={UI.labelStyle}
            tableHeaderStyle={UI.tableHeaderStyle}
            selectedContract={selectedContract}
            foundCustomer={foundCustomer}
            setShowForm={setShowForm}
            form={form}
            setForm={setForm}
            handleSaveContract={handleSaveContract}
            handleDeleteContract={(e, id, num) => {
              e.preventDefault();
              handleDeleteContract({ Id: id, ContractNumber: num } as LoanContract);
            }}
            loading={loading}
            creditContracts={creditContracts}
            selectableCreditContracts={selectableCreditContracts}
            applyCreditContractToForm={applyCreditContractToForm}
            formCreditContract={masterHdtdInfo?.matchedCc || null}
            formKunnNumber={formKunnNumber}
            setFormKunnNumber={setFormKunnNumber}
            formLimitStatus={activeGroupForForm}
            kunnIssues={masterHdtdInfo?.issues || []}
            formGrantedLimit={matchedHdtdAmount}
            totalExistingKunnBalance={totalExistingKunnBal}
            availableBeforeThisKunn={availBeforeThisKunn}
            remainingHmtdLimit={remainingHmtd}
            formLoanAmount={formLoanAmount}
            setFormLoanAmount={setFormLoanAmount}
            formMonthlyPrincipal={formMonthlyPrincipal}
            setFormMonthlyPrincipal={setFormMonthlyPrincipal}
            suggestedMonthlyPrincipal={suggestedMonthlyPrincipal}
            interestRateMode={interestRateMode}
            setInterestRateMode={setInterestRateMode}
            ratePreferential={ratePreferential}
            setRatePreferential={setRatePreferential}
            ratePreferentialMonths={ratePreferentialMonths}
            setRatePreferentialMonths={setRatePreferentialMonths}
            rateBase={rateBase}
            setRateBase={setRateBase}
            rateMargin={rateMargin}
            setRateMargin={setRateMargin}
            postPrefRate={postPrefRate}
            normalRate={normalRate}
            surchargeVal={surchargeVal}
            currentActiveRateDisplay={currentActiveRateDisplay}
            rateConditionSurcharge={rateConditionSurcharge}
            setRateConditionSurcharge={setRateConditionSurcharge}
            rateFloor={rateFloor}
            setRateFloor={setRateFloor}
            rateHistory={rateHistory}
            setRateHistory={setRateHistory}
            newAdjDate={newAdjDate}
            setNewAdjDate={setNewAdjDate}
            newAdjBaseRate={newAdjBaseRate}
            setNewAdjBaseRate={setNewAdjBaseRate}
            newAdjMargin={newAdjMargin}
            setNewAdjMargin={setNewAdjMargin}
            newAdjPenalty={newAdjPenalty}
            setNewAdjPenalty={setNewAdjPenalty}
            newAdjReason={newAdjReason}
            setNewAdjReason={setNewAdjReason}
            showNotify={showNotify}
            graceOptions={graceMonthOptions(form.LoanMethod)}
            selectedCollaterals={selectedCollaterals}
            maxAllowedLoanLtv={maxAllowedLoanLtv}
          />
        </Suspense>
      )}

      {/* Payment Modal */}
      {paymentModalProps.editingSchedule && selectedContract && (
        <Suspense fallback={<ComponentFallback />}>
          <PaymentModal
            editingSchedule={paymentModalProps.editingSchedule}
            selectedContract={selectedContract}
            containerCardBg={UI.containerCardBg}
            loading={loading}
            modalActualPaidPrincipalStr={paymentModalProps.actualPaidPrincipalStr}
            setModalActualPaidPrincipalStr={paymentModalProps.setActualPaidPrincipalStr}
            modalActualPaidInterestStr={paymentModalProps.actualPaidInterestStr}
            setModalActualPaidInterestStr={paymentModalProps.setActualPaidInterestStr}
            modalPrepaidPrincipalStr={paymentModalProps.prepaidPrincipalStr}
            setModalPrepaidPrincipalStr={paymentModalProps.setPrepaidPrincipalStr}
            modalOverdueDaysStr={paymentModalProps.overdueDaysStr}
            setModalOverdueDaysStr={paymentModalProps.setOverdueDaysStr}
            modalOverdueInterestStr={paymentModalProps.overdueInterestStr}
            setModalOverdueInterestStr={paymentModalProps.setOverdueInterestStr}
            modalPaymentDate={paymentModalProps.paymentDate}
            setModalPaymentDate={paymentModalProps.setPaymentDate}
            modalIsPaid={paymentModalProps.isPaid}
            setModalIsPaid={paymentModalProps.setIsPaid}
            onClose={paymentModalProps.close}
            onSave={paymentModalProps.save}
          />
        </Suspense>
      )}
    </div>
  );
};
