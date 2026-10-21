import React, { lazy, Suspense } from 'react';
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
const EarlySettlementModal = lazy(() => import('../portfolio/EarlySettlementModal').then(m => ({ default: m.EarlySettlementModal })));

const ComponentFallback = () => (
  <div className="flex items-center justify-center p-8 text-ink-muted">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải phân hệ...</span>
  </div>
);

export const LoanPortfolioView: React.FC = () => {
  const {
    notification,
    portfolio,
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
    earlySettlementProps,
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
    <div data-workspace-page className="space-y-0 font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Customer Search Section */}
      <CustomerSearchBar
        compact={Boolean(foundCustomer)}
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
      />

      {/* Summary Header & Navigation Cockpit */}
      {foundCustomer && (
        <CustomerSummaryHeader
          selectedMasterFilter={selectedMasterFilter}
          totalCreditLimit={customerLimitTotals.granted}
            outstanding={customerLimitTotals.outstanding}
            available={customerLimitTotals.available}
          handleNewContract={handleNewContract}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-xl bg-surface/80 border border-line/60 gap-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setMainTab('kunn')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  mainTab === 'kunn' ? 'bg-accent text-accent-ink shadow-xs' : 'text-ink-muted hover:text-ink hover:bg-surface'
                }`}
              >
                Danh sách KUNN ({visibleContracts.length})
              </button>
              <button
                type="button"
                disabled={!selectedContract}
                onClick={() => setMainTab('schedule')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  mainTab === 'schedule'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                Lịch trả nợ KUNN {selectedContract ? `(#${selectedContract.ContractNumber})` : ''}
              </button>
            </div>

            <MasterHdtdFilterTabs
              masterHdtdGroups={masterHdtdGroups}
              selectedMasterFilter={selectedMasterFilter}
              setSelectedMasterFilter={setSelectedMasterFilter}
              contractsCount={contracts.length}
            />
          </div>
        </CustomerSummaryHeader>
      )}

      {/* Tab Content 1: KUNN List */}
      {foundCustomer && mainTab === 'kunn' && (
        <KunnTable
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
            loading={portfolio.scheduleLoading}
            error={portfolio.scheduleError}
            selectedContract={selectedContract}
            schedules={schedules}
            openPaymentModal={paymentModalProps.open}
            onQuickSettleAll={paymentModalProps.quickSettleAllDue}
            onOpenEarlySettlement={earlySettlementProps.open}
          />
        </Suspense>
      )}

      {/* Drawer / Modal Form for KUNN */}
      {showForm && foundCustomer && mainTab === 'kunn' && (
        <Suspense fallback={<ComponentFallback />}>
          <KunnForm
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
            limit={{
              formLimitStatus: activeGroupForForm,
              kunnIssues: masterHdtdInfo?.issues || [],
              formGrantedLimit: matchedHdtdAmount,
              totalExistingKunnBalance: totalExistingKunnBal,
              availableBeforeThisKunn: availBeforeThisKunn,
              remainingHmtdLimit: remainingHmtd,
            }}
            amount={{
              formLoanAmount,
              setFormLoanAmount,
              formMonthlyPrincipal,
              setFormMonthlyPrincipal,
              suggestedMonthlyPrincipal,
            }}
            rate={{
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
              postPrefRate,
              normalRate,
              surchargeVal,
              currentActiveRateDisplay,
              rateConditionSurcharge,
              setRateConditionSurcharge,
              rateFloor,
              setRateFloor,
              rateHistory,
              setRateHistory,
            }}
            adjustment={{
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
            }}
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

      {/* Early Settlement Modal */}
      {earlySettlementProps.isOpen && selectedContract && (
        <Suspense fallback={<ComponentFallback />}>
          <EarlySettlementModal
            isOpen={earlySettlementProps.isOpen}
            selectedContract={selectedContract}
            settlementDate={earlySettlementProps.settlementDate}
            setSettlementDate={earlySettlementProps.setSettlementDate}
            penaltyRateStr={earlySettlementProps.penaltyRateStr}
            setPenaltyRateStr={earlySettlementProps.setPenaltyRateStr}
            quote={earlySettlementProps.quote}
            isSubmitting={earlySettlementProps.isSubmitting}
            onClose={earlySettlementProps.close}
            onConfirm={earlySettlementProps.executeSettlement}
          />
        </Suspense>
      )}
    </div>
  );
};
