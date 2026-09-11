import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router';
import {
  saveContractAPI, deleteContractAPI,
  bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByContractAPI,
  deleteRepaymentSchedulesByIdsAPI, fetchRepaymentSchedulesAPI
} from '../lib/api';
import { parseMoneyInput, todayIso } from '../lib/utils';
import { scheduleRowsForContract, reconcileScheduleRows } from '../lib/scheduleSync';
import {
  addMonthsToDate, parseKunnTenorMonths,
  generateSchedule, recalculateSchedules, computeOutstandingBalance,
  isBulletPrincipal, redateSchedules, resolveMonthlyPrincipal,
  getAutoDebtGroupInfo, maturityDateOf, kunnPrincipal
} from '../lib/loanMath';
import {
  getEffectiveActiveRate,
  buildRateFields,
} from '../lib/rateResolution';
import { totalUsableCapacity } from '../lib/collateralMath';
import { useConfirm } from '../context/ConfirmContext';
import { checkKunnAgainstContract, resolveMasterHdtdNumber, isKunnSettled, isKunnOfClosedHdtd, hdtdEffectiveDatesOf, summarizeCreditContracts, totalsOfCreditContracts, computeRemainingTenorMonths } from '../lib/creditContract';
import { checkKunnTenor, getLoanProductRule } from '../lib/loanProductRules';
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
import { parseNumericId } from '../lib/customerRoutes';
import { checkCollateralCapacity, computeLimitGroups, findLimitGroupFor } from '../lib/creditLimit';
import type { LoanContract, CreditContract, RateAdjustmentHistoryItem } from '../types';
import { usePaymentModal } from './usePaymentModal';
import { useEarlySettlement } from './useEarlySettlement';
import { useCustomerPortfolio } from './useCustomerPortfolio';
import {
  blankFormFields, buildKunnPayload, checkLoanAmount, checkMonthlyPrincipal, contractToFormFields,
  nextKunnNumberFor, type KunnFormFields,
} from '../lib/kunnForm';
import type { MasterHdtdGroup } from '../components/portfolio/MasterHdtdFilterTabs';

export function useLoanPortfolioController() {
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDisburse = searchParams.get('disburse');
  const disburseCreditContractId = parseNumericId(rawDisburse);
  const { kunnId: kunnIdParam } = useParams<{ kunnId: string }>();
  const deepKunnId = parseNumericId(kunnIdParam);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [daApDeepKunnFor, setDaApDeepKunnFor] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('ALL');
  const [showSettledKunn, setShowSettledKunn] = useState(true);

  const [form, setForm] = useState<Partial<LoanContract>>({});
  const [formHdtdNumber, setFormHdtdNumber] = useState('');
  const [formKunnNumber, setFormKunnNumber] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formCreditLimitCode, setFormCreditLimitCode] = useState('');
  const [formCreditLimitAmount, setFormCreditLimitAmount] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState('');
  const [formMonthlyPrincipal, setFormMonthlyPrincipal] = useState('');
  const [formCurrentBalance, setFormCurrentBalance] = useState('');

  const [interestRateMode, setInterestRateMode] = useState<'pref' | 'base'>('pref');
  const [ratePreferential, setRatePreferential] = useState('');
  const [ratePreferentialMonths, setRatePreferentialMonths] = useState('');
  const [rateBase, setRateBase] = useState('');
  const [rateMargin, setRateMargin] = useState('');
  const [rateConditionSurcharge, setRateConditionSurcharge] = useState('0');
  const [rateFloor, setRateFloor] = useState('');
  const [rateHistory, setRateHistory] = useState<RateAdjustmentHistoryItem[]>([]);

  const [newAdjDate, setNewAdjDate] = useState('');
  const [newAdjBaseRate, setNewAdjBaseRate] = useState('');
  const [newAdjMargin, setNewAdjMargin] = useState('');
  const [newAdjPenalty, setNewAdjPenalty] = useState('');
  const [newAdjReason, setNewAdjReason] = useState('');

  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);

  const applyFormFields = useCallback((fields: KunnFormFields) => {
    setFormHdtdNumber(fields.hdtdNumber);
    setFormKunnNumber(fields.kunnNumber);
    setForm(fields.contract);
    setFormCreditLimit(fields.creditLimit);
    setFormCreditLimitCode(fields.creditLimitCode);
    setFormCreditLimitAmount(fields.creditLimitAmount);
    setFormLoanAmount(fields.loanAmount);
    setFormMonthlyPrincipal(fields.monthlyPrincipal);
    setFormCurrentBalance(fields.currentBalance);
    setRatePreferential(fields.ratePreferential);
    setRatePreferentialMonths(fields.ratePreferentialMonths);
    setRateBase(fields.rateBase);
    setRateMargin(fields.rateMargin);
    setRateFloor(fields.rateFloor);
    setInterestRateMode(fields.rateMode);
    setRateConditionSurcharge(fields.conditionSurcharge);
    setRateHistory(fields.rateHistory);
    setSelectedCollateralIds(fields.collateralIds);
  }, []);

  const populateForm = useCallback((c: LoanContract, ccs: CreditContract[] = []) => {
    applyFormFields(contractToFormFields(c, ccs));
  }, [applyFormFields]);

  const portfolio = useCustomerPortfolio({
    selectedCustomerId,
    setSelectedCustomerId,
    onNotify: showNotify,
    onCustomerChanged: () => {
      setSelectedMasterFilter('ALL');
      setShowSettledKunn(true);
      setShowForm(false);
      setMainTab('kunn');
    },
    onContractOpened: (c) => {
      setShowForm(true);
      populateForm(c, portfolio.creditContracts);
    },
    onContractClosed: () => setShowForm(false),
  });

  const {
    searchCif, setSearchCif, searchName, setSearchName, searchContract, setSearchContract,
    isSearching, allCustomers, dropdownQuery, setDropdownQuery, showDropdown, setShowDropdown,
    foundCustomer, creditContracts, contracts, setContracts, collaterals, cards,
    selectedContract, setSelectedContract, schedules, setSchedules,
    allSchedulesMap, setAllSchedulesMap,
    pickCustomer: handlePickCustomer, search: handleSearch, selectContract: handleSelectContract,
  } = portfolio;

  useEffect(() => {
    if (deepKunnId === null) {
      if (daApDeepKunnFor !== null) setDaApDeepKunnFor(null);
      return;
    }
    if (daApDeepKunnFor === deepKunnId) return;
    const k = portfolio.contracts.find(c => c.Id === deepKunnId);
    if (!k) return;
    setDaApDeepKunnFor(deepKunnId);
    portfolio.openContract(k);
    setMainTab('schedule');
  }, [deepKunnId, daApDeepKunnFor, portfolio.contracts, portfolio.openContract]);

  const paymentModalProps = usePaymentModal({
    selectedContract,
    schedules,
    onSaved: ({ schedules: newSchedules, balance, debtGroup }) => {
      setSchedules(newSchedules);
      if (selectedContract) {
        setAllSchedulesMap(prev => ({ ...prev, [selectedContract.Id]: newSchedules }));
        const updated = { ...selectedContract, CurrentBalance: balance, DebtGroup: debtGroup };
        setSelectedContract(updated);
        setContracts(prev => prev.map(c => c.Id === updated.Id ? updated : c));
      }
    },
    onNotify: showNotify,
    onLoadingChange: setLoading,
  });

  const earlySettlementProps = useEarlySettlement({
    selectedContract,
    schedules,
    onSettled: ({ contract: updatedContract, schedules: newSchedules }) => {
      setSchedules(newSchedules);
      if (selectedContract) {
        setAllSchedulesMap(prev => ({ ...prev, [updatedContract.Id]: newSchedules }));
        setSelectedContract(updatedContract);
        setContracts(prev => prev.map(c => c.Id === updatedContract.Id ? updatedContract : c));
      }
    },
    onNotify: showNotify,
    onLoadingChange: setLoading,
  });

  useEffect(() => {
    const isSingleLoan = form.LoanMethod === 'Cho vay từng lần' || form.LoanMethod === 'Hạn mức tín dụng từng lần';
    if (isSingleLoan) {
      if (form.LoanTenorMonths && !form.ContractEndDate) {
        const kunnTenorStr = `${form.LoanTenorMonths} tháng`;
        setForm(prev => {
          if (prev.KunnTenor !== kunnTenorStr) {
            return { ...prev, KunnTenor: kunnTenorStr };
          }
          return prev;
        });
      }
    } else if (form.LoanMethod === 'Hạn mức tín dụng' || form.LoanMethod?.includes('Hạn mức')) {
      setForm(prev => ({
        ...prev,
        LoanPurposeType: 'Kinh doanh',
        LoanPurpose: prev.LoanPurpose || 'Cho vay Phục vụ Hoạt động Kinh doanh'
      }));
    }
  }, [form.LoanMethod, form.LoanTenorMonths, form.ContractEndDate]);

  useEffect(() => {
    if (form.ContractStartDate && form.LoanTenorMonths && !form.ContractEndDate) {
      const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
      if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
        setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
      }
    }
  }, [form.ContractStartDate, form.LoanTenorMonths, form.ContractEndDate]);

  useEffect(() => {
    if (form.DisbursementDate) {
      if (form.ContractEndDate && form.LoanMethod !== 'Hạn mức tín dụng') {
        const remaining = computeRemainingTenorMonths(form.DisbursementDate, form.ContractEndDate);
        if (remaining > 0) {
          const kunnTenorStr = `${remaining} tháng`;
          setForm(prev => {
            if (prev.KunnTenor !== kunnTenorStr || prev.KunnDueDate !== prev.ContractEndDate || prev.LoanTenorMonths !== remaining) {
              return {
                ...prev,
                KunnTenor: kunnTenorStr,
                LoanTenorMonths: remaining,
                KunnDueDate: prev.ContractEndDate || prev.KunnDueDate,
              };
            }
            return prev;
          });
          return;
        }
      }
      const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
      if (months > 0) {
        const calculatedKunnEnd = addMonthsToDate(form.DisbursementDate, months);
        if (calculatedKunnEnd && calculatedKunnEnd !== form.KunnDueDate) {
          setForm(prev => ({ ...prev, KunnDueDate: calculatedKunnEnd }));
        }
      }
    }
  }, [form.DisbursementDate, form.ContractEndDate, form.LoanMethod, form.KunnTenor, form.LoanTenorMonths]);

  const prefVal = parseFloat(ratePreferential) || 0;
  const baseVal = parseFloat(rateBase) || 0;
  const marginVal = parseFloat(rateMargin) || 0;
  const surchargeVal = parseFloat(rateConditionSurcharge) || 0;

  const postPrefRate = prefVal + marginVal;
  const normalRate = baseVal + marginVal;
  const prefMonths = parseInt(ratePreferentialMonths, 10) || 0;

  const draftRateContract = useMemo(() => ({
    DisbursementDate: form.DisbursementDate || form.ContractStartDate || null,
    PenaltySurcharge: surchargeVal,
    RateHistory: rateHistory.length > 0 ? rateHistory : null,
    ...buildRateFields(interestRateMode, {
      prefPercent: prefVal,
      prefMonths,
      basePercent: baseVal,
      marginPercent: marginVal,
      floorPercent: rateFloor.trim() === '' ? null : parseFloat(rateFloor) || 0,
    }),
  }) as LoanContract, [
    form.DisbursementDate, form.ContractStartDate, interestRateMode,
    prefVal, prefMonths, baseVal, marginVal, surchargeVal, rateFloor, rateHistory,
  ]);

  const currentActiveRateDisplay = (prefVal > 0 || baseVal > 0)
    ? getEffectiveActiveRate(draftRateContract) * 100
    : 0;

  const creditLimitNum = parseMoneyInput(formCreditLimit);
  const kunnLoanAmountNum = parseMoneyInput(formLoanAmount);

  const formTotalPeriods = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
  const suggestedMonthlyPrincipal = isBulletPrincipal(form)
    ? 0
    : resolveMonthlyPrincipal(
        {
          MonthlyPrincipalAmount: null,
          LoanAmount: kunnLoanAmountNum,
          CurrentBalance: undefined,
          PrincipalGracePeriodMonths: form.PrincipalGracePeriodMonths ?? 0,
        },
        formTotalPeriods
      );

  const effectiveFormHdtdNo = (formHdtdNumber ? formHdtdNumber.trim() : (selectedContract ? String(resolveMasterHdtdNumber(selectedContract, creditContracts) || '') : '')) || '';
  const dropdownFiltered = useMemo(() => dropdownQuery.trim().length < 1
    ? allCustomers
    : allCustomers.filter(c =>
      c.FullName.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
      c.CifKh.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
      (c.NationalId || '').includes(dropdownQuery)
    ), [allCustomers, dropdownQuery]);

  const masterHdtdInfo = useMemo(() => {
    const rawNo = (formHdtdNumber || '').trim();
    if (!rawNo) return null;

    const matchedCc = creditContracts.find(
      cc => cc.HdtdNumber && cc.HdtdNumber.trim().toLowerCase() === rawNo.toLowerCase()
    );

    const dates = hdtdEffectiveDatesOf({ CreditContractId: matchedCc?.Id ?? null }, creditContracts);
    const existingKunns = contracts.filter(
      k => (resolveMasterHdtdNumber(k, creditContracts) || '').toLowerCase() === rawNo.toLowerCase()
    );

    const issues = checkKunnAgainstContract(
      {
        DisbursementDate: form.DisbursementDate || null,
        KunnDueDate: form.KunnDueDate || null,
        LoanAmount: kunnLoanAmountNum,
      },
      matchedCc || { HdtdNumber: rawNo, ContractStartDate: dates?.startDate || null, ContractEndDate: dates?.endDate || null, IsClosed: false }
    );

    const tenorCheck = checkKunnTenor(form.LoanMethod, parseKunnTenorMonths(form.KunnTenor));
    if (!tenorCheck.ok && tenorCheck.message) {
      issues.push({ level: 'warn', field: 'KunnTenor', message: tenorCheck.message });
    }

    return { matchedCc, dates, existingKunnCount: existingKunns.length, issues };
  }, [formHdtdNumber, creditContracts, contracts, form.DisbursementDate, form.KunnDueDate, form.LoanMethod, form.KunnTenor, kunnLoanAmountNum]);

  const isFormMasterHdtdClosed = !!masterHdtdInfo?.matchedCc?.IsClosed;

  const selectableCreditContracts = useMemo(
    () => creditContracts.filter(cc => !cc.IsClosed),
    [creditContracts]
  );

  const masterHdtdGroups = useMemo<MasterHdtdGroup[]>(() => {
    const map = new Map<string, LoanContract[]>();
    contracts.forEach(c => {
      const masterNo = resolveMasterHdtdNumber(c, creditContracts) || 'KHÔNG_HĐTD';
      const list = map.get(masterNo) || [];
      list.push(c);
      map.set(masterNo, list);
    });

    creditContracts.forEach(cc => {
      if (cc.HdtdNumber && !map.has(cc.HdtdNumber)) {
        map.set(cc.HdtdNumber, []);
      }
    });

    return Array.from(map.entries()).map(([masterNo, groupContracts]) => {
      const cc = creditContracts.find(x => x.HdtdNumber === masterNo);
      const totalCreditLimit = cc?.ContractAmount || 0;
      const totalKunnDisbursed = groupContracts.reduce((sum, k) => sum + kunnPrincipal(k), 0);
      const remainingLimit = totalCreditLimit > 0 ? Math.max(0, totalCreditLimit - totalKunnDisbursed) : 0;
      return {
        masterNo,
        contracts: groupContracts,
        masterContract: null,
        totalCreditLimit,
        totalKunnDisbursed,
        remainingLimit,
      };
    });
  }, [contracts, creditContracts]);

  const contractsInHdtdScope = useMemo(() => {
    if (selectedMasterFilter === 'ALL') return contracts;
    if (selectedMasterFilter === 'KHONG_HDTD') {
      return contracts.filter(k => !resolveMasterHdtdNumber(k, creditContracts));
    }
    return contracts.filter(
      k => (resolveMasterHdtdNumber(k, creditContracts) || '').toLowerCase() === selectedMasterFilter.toLowerCase()
    );
  }, [contracts, selectedMasterFilter, creditContracts]);

  const settledInScopeCount = useMemo(
    () => contractsInHdtdScope.filter(isKunnSettled).length,
    [contractsInHdtdScope]
  );

  const visibleContracts = useMemo(
    () => showSettledKunn ? contractsInHdtdScope : contractsInHdtdScope.filter(k => !isKunnSettled(k)),
    [contractsInHdtdScope, showSettledKunn]
  );

  const hiddenSettledCount = contractsInHdtdScope.length - visibleContracts.length;

  const unsettledCount = useMemo(() => contracts.filter(k => !isKunnSettled(k)).length, [contracts]);
  const closedHdtdCount = useMemo(
    () => contracts.filter(k => isKunnOfClosedHdtd(k, creditContracts) && !isKunnSettled(k)).length,
    [contracts, creditContracts]
  );

  const limitGroups = useMemo(() => computeLimitGroups(contracts, {
    getOutstanding: (k) => computeOutstandingBalance(allSchedulesMap[k.Id], k),
    today: todayIso(),
    isClosed: (k) => isKunnOfClosedHdtd(k, creditContracts),
  }), [contracts, creditContracts, allSchedulesMap]);

  const activeGroupForForm = useMemo(
    () => findLimitGroupFor(limitGroups, String(effectiveFormHdtdNo || '')),
    [effectiveFormHdtdNo, limitGroups]
  );

  const customerLimitTotals = useMemo(() => totalsOfCreditContracts(
    summarizeCreditContracts(creditContracts, contracts, {
      getOutstanding: (k) => computeOutstandingBalance(allSchedulesMap[k.Id], k),
      today: todayIso(),
    }),
    selectedMasterFilter === 'ALL' ? null : selectedMasterFilter
  ), [creditContracts, contracts, allSchedulesMap, selectedMasterFilter]);

  const matchedHdtdAmount = activeGroupForForm?.granted || creditLimitNum || 0;
  const maxAllowedLoanLtv = totalUsableCapacity(collaterals.filter(c => selectedCollateralIds.includes(c.Id)), todayIso());
  const currentMaxAllowedLoan = Math.min(
    matchedHdtdAmount > 0 ? matchedHdtdAmount : Infinity,
    maxAllowedLoanLtv
  );

  const isFormLoanAmountExceeded = kunnLoanAmountNum > 0 && matchedHdtdAmount > 0 && kunnLoanAmountNum > matchedHdtdAmount;
  const isFormCapacityExceeded = kunnLoanAmountNum > 0 && currentMaxAllowedLoan > 0 && kunnLoanAmountNum > currentMaxAllowedLoan;

  const capacityIssues = useMemo(() => checkCollateralCapacity(
    contracts,
    collaterals,
    (k) => computeOutstandingBalance(allSchedulesMap[k.Id], k),
    todayIso(),
    cards
  ), [contracts, collaterals, allSchedulesMap, cards]);

  const applyCreditContractToForm = useCallback((cc: CreditContract) => {
    setFormHdtdNumber(cc.HdtdNumber);
    setFormCreditLimit(cc.ContractAmount ? cc.ContractAmount.toLocaleString('vi-VN') : '');
    setFormCreditLimitCode(cc.ApprovalCode || '');
    setFormCreditLimitAmount(cc.ApprovalAmount ? cc.ApprovalAmount.toLocaleString('vi-VN') : '');

    const cIds = (cc.CollateralIds || '')
      .split(',')
      .map(x => parseInt(x.trim(), 10))
      .filter(n => !isNaN(n));
    setSelectedCollateralIds(cIds);

    const generatedKunnNo = nextKunnNumberFor(cc.HdtdNumber, contracts);

    setFormKunnNumber(generatedKunnNo);

    const isRevolving = cc.LoanMethod === 'Hạn mức tín dụng';
    const rule = getLoanProductRule(cc.LoanMethod);
    const disbDate = todayIso();
    let calculatedTenorMonths = cc.LoanTenorMonths || 12;
    let kunnDueDate = cc.ContractEndDate || '';

    if (cc.ContractEndDate && !isRevolving) {
      const remainingMonths = computeRemainingTenorMonths(disbDate, cc.ContractEndDate);
      if (remainingMonths > 0) {
        calculatedTenorMonths = remainingMonths;
        kunnDueDate = cc.ContractEndDate;
      }
    }

    setForm(prev => ({
      ...prev,
      CreditContractId: cc.Id,
      LoanMethod: cc.LoanMethod || 'Cho vay từng lần',
      LoanPurpose: cc.LoanPurpose || prev.LoanPurpose,
      ContractStartDate: cc.ContractStartDate || prev.ContractStartDate,
      ContractEndDate: cc.ContractEndDate || prev.ContractEndDate,
      LoanTenorMonths: calculatedTenorMonths,
      KunnTenor: `${calculatedTenorMonths} tháng`,
      KunnDueDate: kunnDueDate || prev.KunnDueDate,
      DisbursementDate: disbDate,
      PenaltySurcharge: 0,
      PrincipalGracePeriodMonths: isRevolving ? 0 : prev.PrincipalGracePeriodMonths,
      PrincipalRepaymentMethod: isRevolving ? 'Gốc trả cuối kỳ' : (rule.defaultPrincipalMethod || 'Trả đều hàng tháng'),
      InterestRepaymentMethod: 'Trả hàng tháng theo dư nợ thực tế',
    }));
  }, [contracts]);

  const handleNewContract = useCallback((): boolean => {
    if (creditContracts.length === 0) {
      showNotify('error', 'Khách hàng chưa có HĐTD. Tạo ở tab Hợp Đồng Tín Dụng trước.');
      return false;
    }
    if (selectableCreditContracts.length === 0) {
      showNotify('error', 'Mọi HĐTD đã hết hiệu lực hoặc đã đóng.');
      return false;
    }

    setSelectedContract(null);
    setSchedules([]);
    const blank = blankFormFields(foundCustomer?.Id);
    setFormLoanAmount(blank.loanAmount);
    setFormCurrentBalance(blank.currentBalance);
    setForm(blank.contract);

    const preferred = selectedMasterFilter !== 'ALL'
      ? selectableCreditContracts.find(cc => cc.HdtdNumber === selectedMasterFilter)
      : undefined;
    applyCreditContractToForm(preferred || selectableCreditContracts[0]);

    setMainTab('kunn');
    setShowForm(true);
    return true;
  }, [creditContracts, selectableCreditContracts, setSelectedContract, setSchedules, foundCustomer, selectedMasterFilter, applyCreditContractToForm, showNotify]);

  const handleSaveContract = useCallback(async (e: React.FormEvent, forceInsert: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const targetCustomerId = foundCustomer?.Id || form.CustomerId;
      if (!targetCustomerId) {
        showNotify('error', 'Chọn khách hàng trước.');
        setLoading(false);
        return;
      }

      if (selectedCollateralIds.length === 0) {
        showNotify('error', 'HĐTD chưa gán TSBĐ. Gán ở tab Hợp Đồng Tín Dụng.');
        setLoading(false);
        return;
      }

      const effectiveContractNumber = formKunnNumber.trim()
        || nextKunnNumberFor(formHdtdNumber, contracts);

      const loanAmount = parseMoneyInput(formLoanAmount);

      const amountCheck = checkLoanAmount(loanAmount);
      if (!amountCheck.ok) {
        showNotify('error', amountCheck.message || 'Số tiền vay không hợp lệ.');
        setLoading(false);
        return;
      }

      const principalCheck = checkMonthlyPrincipal({
        declared: parseMoneyInput(formMonthlyPrincipal) || null,
        loanAmount,
        totalPeriods: formTotalPeriods,
        graceMonths: form.PrincipalGracePeriodMonths ?? 0,
        isBullet: isBulletPrincipal(form),
      });

      if (!principalCheck.ok) {
        showNotify('error', principalCheck.message || 'Mức trả gốc không hợp lệ.');
        setLoading(false);
        return;
      }

      const fields: KunnFormFields = {
        hdtdNumber: formHdtdNumber,
        kunnNumber: effectiveContractNumber,
        contract: form,
        creditLimit: formCreditLimit,
        creditLimitCode: formCreditLimitCode,
        creditLimitAmount: formCreditLimitAmount,
        loanAmount: formLoanAmount,
        currentBalance: formCurrentBalance,
        ratePreferential,
        ratePreferentialMonths,
        rateBase,
        rateMargin,
        rateFloor,
        rateMode: interestRateMode,
        conditionSurcharge: rateConditionSurcharge,
        monthlyPrincipal: formMonthlyPrincipal,
        rateHistory,
        collateralIds: selectedCollateralIds,
      };

      const payload = buildKunnPayload({
        fields,
        customerId: targetCustomerId,
        contractNumber: effectiveContractNumber,
        prefPercent: prefVal,
        basePercent: baseVal,
        marginPercent: marginVal,
        activeRatePercent: currentActiveRateDisplay,
        creditContracts,
      });

      const matchedCc = creditContracts.find(
        cc => cc.HdtdNumber && cc.HdtdNumber.trim().toLowerCase() === (formHdtdNumber.trim()).toLowerCase()
      );
      if (matchedCc) {
        payload.CreditContractId = matchedCc.Id;
      }

      if (selectedContract && !forceInsert) {
        payload.Id = selectedContract.Id;
      }

      const savedContract = await saveContractAPI(payload);

      const periods = parseKunnTenorMonths(savedContract.KunnTenor) || savedContract.LoanTenorMonths || 12;
      const rawGen = generateSchedule(
        savedContract.Id,
        savedContract.LoanAmount || 0,
        savedContract.InterestRate || 0,
        savedContract.RepaymentStartDate || savedContract.DisbursementDate || todayIso(),
        periods,
        isBulletPrincipal(savedContract),
        savedContract.DisbursementDate || undefined,
        savedContract.MonthlyPrincipalAmount || undefined,
        savedContract.PrincipalGracePeriodMonths || 0,
        0, 0, 'reduce_monthly', undefined, undefined,
        maturityDateOf(savedContract)
      );

      const rowsMoi = scheduleRowsForContract(rawGen, savedContract.Id);
      const lichHienCo = await fetchRepaymentSchedulesAPI(savedContract.Id);
      const doiChieu = reconcileScheduleRows(lichHienCo, rowsMoi);

      if (doiChieu.ambiguousPeriods.length > 0) {
        throw new Error(
          `Lịch trả nợ đang có kỳ trùng nhau (kỳ ${doiChieu.ambiguousPeriods.join(', ')}). `
          + 'Dọn các kỳ trùng trước khi lưu, hệ thống không tự chọn bản nào là đúng.'
        );
      }
      if (doiChieu.blockedPaidPeriods.length > 0) {
        throw new Error(
          `Rút ngắn kỳ hạn sẽ bỏ kỳ ${doiChieu.blockedPaidPeriods.join(', ')} vốn đã ghi nhận thu tiền. `
          + 'Xử lý các kỳ đó trước, hệ thống không tự xoá lịch sử thu.'
        );
      }

      await bulkSaveRepaymentSchedulesAPI(doiChieu.toUpsert);
      await deleteRepaymentSchedulesByIdsAPI(doiChieu.toDeleteIds);
      const genSchedules = await fetchRepaymentSchedulesAPI(savedContract.Id);

      const autoDebt = getAutoDebtGroupInfo(genSchedules, todayIso());
      if (savedContract.DebtGroup !== autoDebt.debtGroup) {
        savedContract.DebtGroup = autoDebt.debtGroup;
        await saveContractAPI(savedContract);
      }

      setSchedules(genSchedules);
      setAllSchedulesMap(prev => ({ ...prev, [savedContract.Id]: genSchedules }));

      setContracts(prev => {
        const idx = prev.findIndex(c => c.Id === savedContract.Id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = savedContract;
          return next;
        }
        return [savedContract, ...prev];
      });

      setSelectedContract(savedContract);
      populateForm(savedContract, creditContracts);
      showNotify('success', selectedContract && !forceInsert
        ? `Đã cập nhật KUNN ${savedContract.ContractNumber}`
        : `Đã giải ngân KUNN mới ${savedContract.ContractNumber}`
      );
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể lưu khế ước.');
    } finally {
      setLoading(false);
    }
  }, [foundCustomer, form, selectedCollateralIds, formKunnNumber, formHdtdNumber, contracts, formCreditLimit, formLoanAmount, formMonthlyPrincipal, formTotalPeriods, formCurrentBalance, interestRateMode, prefVal, prefMonths, baseVal, marginVal, surchargeVal, rateFloor, rateHistory, selectedContract, creditContracts, setSchedules, setAllSchedulesMap, setContracts, setSelectedContract, populateForm, showNotify, currentActiveRateDisplay, formCreditLimitAmount, formCreditLimitCode, ratePreferential, ratePreferentialMonths, rateBase, rateMargin, rateConditionSurcharge]);

  const confirm = useConfirm();

  const handleDeleteContract = useCallback(async (c: LoanContract) => {
    const ok = await confirm({
      title: 'Xoá Khế ước nhận nợ',
      message: `Bạn có chắc muốn xóa KUNN "${c.ContractNumber}"?`,
      confirmText: 'Xoá KUNN',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    try {
      await deleteRepaymentSchedulesByContractAPI(c.Id);
      await deleteContractAPI(c.Id);
      setContracts(prev => prev.filter(x => x.Id !== c.Id));
      if (selectedContract?.Id === c.Id) {
        setSelectedContract(null);
        setSchedules([]);
        setShowForm(false);
      }
      showNotify('success', `Đã xóa KUNN ${c.ContractNumber}`);
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể xóa khế ước.');
    } finally {
      setLoading(false);
    }
  }, [confirm, selectedContract, setSelectedContract, setSchedules, setContracts, showNotify]);

  const handleAutoGenerateSchedule = useCallback(async () => {
    if (!selectedContract) return;
    setLoading(true);
    try {
      const periods = parseKunnTenorMonths(selectedContract.KunnTenor) || selectedContract.LoanTenorMonths || 12;
      const rawGen = generateSchedule(
        selectedContract.Id,
        selectedContract.LoanAmount || 0,
        selectedContract.InterestRate || 0,
        selectedContract.RepaymentStartDate || selectedContract.DisbursementDate || todayIso(),
        periods,
        isBulletPrincipal(selectedContract),
        selectedContract.DisbursementDate || undefined,
        selectedContract.MonthlyPrincipalAmount || undefined,
        selectedContract.PrincipalGracePeriodMonths || 0,
        0, 0, 'reduce_monthly', undefined, undefined,
        maturityDateOf(selectedContract)
      );

      const rowsMoi = scheduleRowsForContract(rawGen, selectedContract.Id);

      await deleteRepaymentSchedulesByContractAPI(selectedContract.Id);
      await bulkSaveRepaymentSchedulesAPI(rowsMoi);
      const freshSchedules = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      setSchedules(freshSchedules);
      setAllSchedulesMap(prev => ({ ...prev, [selectedContract.Id]: freshSchedules }));

      const autoDebt = getAutoDebtGroupInfo(freshSchedules, todayIso());
      if (selectedContract.DebtGroup !== autoDebt.debtGroup) {
        const updated = { ...selectedContract, DebtGroup: autoDebt.debtGroup };
        await saveContractAPI(updated);
        setSelectedContract(updated);
      }
      showNotify('success', 'Đã tính lại toàn bộ Lịch Trả Nợ từ đầu.');
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể lập lại lịch.');
    } finally {
      setLoading(false);
    }
  }, [selectedContract, setSchedules, setAllSchedulesMap, setSelectedContract, showNotify]);

  const handleRecalculateSchedule = useCallback(async () => {
    if (!selectedContract || schedules.length === 0) return;
    setLoading(true);
    try {
      const redated = redateSchedules(
        schedules, selectedContract.RepaymentStartDate, selectedContract.DisbursementDate,
        maturityDateOf(selectedContract)
      );
      const recalculated = recalculateSchedules(redated, selectedContract);
      await bulkSaveRepaymentSchedulesAPI(recalculated);
      setSchedules(recalculated);
      setAllSchedulesMap(prev => ({ ...prev, [selectedContract.Id]: recalculated }));

      const autoDebt = getAutoDebtGroupInfo(recalculated, todayIso());
      if (selectedContract.DebtGroup !== autoDebt.debtGroup) {
        const updated = { ...selectedContract, DebtGroup: autoDebt.debtGroup };
        await saveContractAPI(updated);
        setSelectedContract(updated);
      }
      showNotify('success', 'Đã cập nhật tính toán lại Lịch Trả Nợ.');
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể tính lại lịch.');
    } finally {
      setLoading(false);
    }
  }, [selectedContract, schedules, setSchedules, setAllSchedulesMap, setSelectedContract, showNotify]);

  const handleRateAdjSave = useCallback(async () => {
    if (!selectedContract) return;
    const base = parseFloat(newAdjBaseRate);
    const margin = parseFloat(newAdjMargin);
    if (isNaN(base) || isNaN(margin)) {
      showNotify('error', 'Lãi suất cơ sở và Biên độ không hợp lệ.');
      return;
    }
    const penalty = parseFloat(newAdjPenalty) || 0;
    const effectiveDate = newAdjDate || todayIso();

    const newItem: RateAdjustmentHistoryItem = {
      id: `adj-${Date.now()}`,
      effectiveDate,
      ratePercent: base + margin,
      baseRatePercent: base,
      marginPercent: margin,
      penaltyPercent: penalty,
      reason: newAdjReason.trim() || 'Điều chỉnh định kỳ',
    };

    const currentHistory = Array.isArray(selectedContract.RateHistory)
      ? selectedContract.RateHistory
      : [];
    const nextHistory = [...currentHistory, newItem];
    setRateHistory(nextHistory);

    setNewAdjDate('');
    setNewAdjBaseRate('');
    setNewAdjMargin('');
    setNewAdjPenalty('');
    setNewAdjReason('');

    try {
      setLoading(true);
      const updatedContract: LoanContract = {
        ...selectedContract,
        RateHistory: nextHistory,
        BaseRate: base / 100,
        MarginRate: margin / 100,
        PenaltySurcharge: penalty,
      };

      const saved = await saveContractAPI(updatedContract);
      setSelectedContract(saved);

      setContracts(prev => prev.map(c => c.Id === saved.Id ? saved : c));

      if (schedules.length > 0) {
        const recalculated = recalculateSchedules(schedules, saved);
        await bulkSaveRepaymentSchedulesAPI(recalculated);
        setSchedules(recalculated);
        setAllSchedulesMap(prev => ({ ...prev, [saved.Id]: recalculated }));
      }

      showNotify('success', `Đã áp dụng quyết định điều chỉnh lãi suất từ ngày ${effectiveDate}`);
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể lưu quyết định điều chỉnh lãi suất.');
    } finally {
      setLoading(false);
    }
  }, [selectedContract, newAdjBaseRate, newAdjMargin, newAdjPenalty, newAdjDate, newAdjReason, rateHistory, setContracts, schedules, setSchedules, setAllSchedulesMap, setSelectedContract, showNotify]);

  useEffect(() => {
    if (disburseCreditContractId === null) return;
    if (allCustomers.length === 0) return;
    const cc = creditContracts.find(x => x.Id === disburseCreditContractId);
    if (!cc) return;
    if (!handleNewContract()) return;
    applyCreditContractToForm(cc);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('disburse');
      return next;
    }, { replace: true });
  }, [disburseCreditContractId, allCustomers, creditContracts, handleNewContract, applyCreditContractToForm, setSearchParams]);

  useEffect(() => {
    if (rawDisburse === null) return;
    if (disburseCreditContractId !== null) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('disburse');
      return next;
    }, { replace: true });
  }, [rawDisburse, disburseCreditContractId, setSearchParams]);


  return {
    selectedCustomerId,
    setSelectedCustomerId,
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
    formHdtdNumber,
    setFormHdtdNumber,
    formKunnNumber,
    setFormKunnNumber,
    formCreditLimit,
    setFormCreditLimit,
    formCreditLimitCode,
    setFormCreditLimitCode,
    formCreditLimitAmount,
    setFormCreditLimitAmount,
    formLoanAmount,
    setFormLoanAmount,
    formMonthlyPrincipal,
    setFormMonthlyPrincipal,
    formCurrentBalance,
    setFormCurrentBalance,
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
    setSelectedCollateralIds,
    portfolio,
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
    setContracts,
    collaterals,
    cards,
    selectedContract,
    setSelectedContract,
    schedules,
    setSchedules,
    allSchedulesMap,
    setAllSchedulesMap,
    handlePickCustomer,
    handleSearch,
    handleSelectContract,
    paymentModalProps,
    earlySettlementProps,
    prefVal,
    baseVal,
    marginVal,
    surchargeVal,
    postPrefRate,
    normalRate,
    prefMonths,
    draftRateContract,
    currentActiveRateDisplay,
    creditLimitNum,
    customerLimitTotals,
    kunnLoanAmountNum,
    formTotalPeriods,
    suggestedMonthlyPrincipal,
    effectiveFormHdtdNo,
    dropdownFiltered,
    masterHdtdInfo,
    isFormMasterHdtdClosed,
    selectableCreditContracts,
    masterHdtdGroups,
    visibleContracts,
    settledInScopeCount,
    hiddenSettledCount,
    showSettledKunn,
    setShowSettledKunn,
    unsettledCount,
    closedHdtdCount,
    limitGroups,
    activeGroupForForm,
    matchedHdtdAmount,
    maxAllowedLoanLtv,
    currentMaxAllowedLoan,
    isFormLoanAmountExceeded,
    isFormCapacityExceeded,
    capacityIssues,
    populateForm,
    applyCreditContractToForm,
    handleNewContract,
    handleSaveContract,
    handleDeleteContract,
    handleAutoGenerateSchedule,
    handleRecalculateSchedule,
    handleRateAdjSave,
    showNotify,
  };
}
