import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UI } from '../../lib/uiClasses';
import {
  fetchContractsByCustomerAPI, saveContractAPI, deleteContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI,
  deleteRepaymentSchedulesByContractAPI
} from '../../lib/api';
import { fmtDate, fmtMoney, getContractRateHistory, getMasterHdtdNumber, parseMoneyDecimalInput, todayIso } from '../../lib/utils';
import {
  addMonthsToDate, parseKunnTenorMonths,
  generateSchedule,
  getAutoDebtGroupInfo, recalculateSchedules, computeOutstandingBalance,
  isBulletPrincipal, redateSchedules
} from '../../lib/loanMath';
import {
  getEffectiveActiveRate,
  buildRateFields,
} from '../../lib/rateResolution';
import { getEffectiveLtv } from '../../lib/collateralMath';
import { checkKunnAgainstContract, nextKunnNumber, resolveMasterHdtdNumber, isKunnSettled, isKunnOfClosedHdtd } from '../../lib/creditContract';
import { useWork } from '../../context/WorkContext';
import { checkCollateralCapacity, computeLimitGroups, findLimitGroupFor } from '../../lib/creditLimit';
import {
  graceMonthOptions,
  getLoanProductRule,
} from '../../lib/loanProductRules';
import type { LoanContract, CreditContract, RateAdjustmentHistoryItem } from '../../types';
import { Search, Receipt, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { CustomerSearchBar } from '../portfolio/CustomerSearchBar';
import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';
import { MasterHdtdFilterTabs, type MasterHdtdGroup } from '../portfolio/MasterHdtdFilterTabs';
import { KunnTable } from '../portfolio/KunnTable';
import { PaymentModal } from '../portfolio/PaymentModal';
import { KunnForm } from '../portfolio/KunnForm';
import { ScheduleTab } from '../portfolio/ScheduleTab';
import { usePaymentModal } from '../../hooks/usePaymentModal';
import { useCustomerPortfolio } from '../../hooks/useCustomerPortfolio';
import {
  blankFormFields, buildKunnPayload, contractToFormFields,
  intToInput, nextKunnNumberFor, rateToInput, type KunnFormFields,
} from '../../lib/kunnForm';

export const LoanPortfolioView: React.FC = () => {

  const { selectedCustomerId, setSelectedCustomerId, disburseRequest, clearDisburseRequest } = useWork();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const portfolio = useCustomerPortfolio({
    selectedCustomerId,
    setSelectedCustomerId,
    onNotify: showNotify,
    onCustomerChanged: () => {
      setSelectedMasterFilter('ALL');
      setShowForm(false);
      setMainTab('kunn');
    },
    onContractOpened: (c) => {
      setShowForm(true);
      populateForm(c);
    },
    onContractClosed: () => setShowForm(false),
  });

  const {
    searchCif, setSearchCif, searchName, setSearchName, searchContract, setSearchContract,
    isSearching, allCustomers, dropdownQuery, setDropdownQuery, showDropdown, setShowDropdown,
    foundCustomer, creditContracts, contracts, setContracts, collaterals,
    selectedContract, setSelectedContract, schedules, setSchedules,
    allSchedulesMap, setAllSchedulesMap,
    pickCustomer: handlePickCustomer, search: handleSearch, selectContract: handleSelectContract,
  } = portfolio;


  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [showForm, setShowForm] = useState(false);

  const [rateHistory, setRateHistory] = useState<RateAdjustmentHistoryItem[]>([]);
  const [newAdjDate, setNewAdjDate] = useState('');
  const [newAdjBaseRate, setNewAdjBaseRate] = useState('');
  const [newAdjMargin, setNewAdjMargin] = useState('');
  const [newAdjPenalty, setNewAdjPenalty] = useState('');
  const [newAdjReason, setNewAdjReason] = useState('');

  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('ALL');

  const [form, setForm] = useState<Partial<LoanContract>>({});
  const [formHdtdNumber, setFormHdtdNumber] = useState('');
  const [formKunnNumber, setFormKunnNumber] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formCreditLimitCode, setFormCreditLimitCode] = useState('');
  const [formCreditLimitAmount, setFormCreditLimitAmount] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState('');
  const [formCurrentBalance, setFormCurrentBalance] = useState('');

  const [interestRateMode, setInterestRateMode] = useState<'pref' | 'base'>('pref');
  const [ratePreferential, setRatePreferential] = useState('');
  const [ratePreferentialMonths, setRatePreferentialMonths] = useState('');
  const [rateBase, setRateBase] = useState('');
  const [rateMargin, setRateMargin] = useState('');
  const [rateConditionSurcharge, setRateConditionSurcharge] = useState('0');
  const [rateFloor, setRateFloor] = useState('');

  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);


  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSingleLoan = form.LoanMethod === 'Cho vay từng lần' || form.LoanMethod === 'Hạn mức tín dụng từng lần';
    if (isSingleLoan) {
      if (form.LoanTenorMonths) {
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
  }, [form.LoanMethod, form.LoanTenorMonths]);

  useEffect(() => {
    if (form.ContractStartDate && form.LoanTenorMonths) {
      const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
      if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
        setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
      }
    }
  }, [form.ContractStartDate, form.LoanTenorMonths]);

  useEffect(() => {
    if (form.DisbursementDate) {
      const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
      if (months > 0) {
        const calculatedKunnEnd = addMonthsToDate(form.DisbursementDate, months);
        if (calculatedKunnEnd && calculatedKunnEnd !== form.KunnDueDate) {
          setForm(prev => ({ ...prev, KunnDueDate: calculatedKunnEnd }));
        }
      }
    }
  }, [form.DisbursementDate, form.KunnTenor, form.LoanTenorMonths]);

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

  const creditLimitNum = parseMoneyDecimalInput(formCreditLimit);
  const kunnLoanAmountNum = parseMoneyDecimalInput(formLoanAmount);

  const effectiveFormHdtdNo = formHdtdNumber.trim() || (selectedContract ? resolveMasterHdtdNumber(selectedContract, creditContracts) : '');
  const dropdownFiltered = dropdownQuery.trim().length < 1
    ? allCustomers
    : allCustomers.filter(c =>
      c.FullName.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
      c.CifKh.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
      (c.NationalId || '').includes(dropdownQuery)
    );


  const applyFormFields = (fields: KunnFormFields) => {
    setFormHdtdNumber(fields.hdtdNumber);
    setFormKunnNumber(fields.kunnNumber);
    setForm(fields.contract);
    setFormCreditLimit(fields.creditLimit);
    setFormCreditLimitCode(fields.creditLimitCode);
    setFormCreditLimitAmount(fields.creditLimitAmount);
    setFormLoanAmount(fields.loanAmount);
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
  };

  const populateForm = (c: LoanContract) => {
    applyFormFields(contractToFormFields(c, creditContracts));
  };

  const handleNewContract = () => {
    if (creditContracts.length === 0) {
      showNotify('error', 'Khách hàng chưa có HĐTD. Tạo ở tab Hợp Đồng Tín Dụng trước.');
      return;
    }
    if (selectableCreditContracts.length === 0) {
      showNotify('error', 'Mọi HĐTD đã hết hiệu lực hoặc đã đóng.');
      return;
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
  };

  const handleSaveContract = async (e: React.FormEvent, forceInsert: boolean = false) => {
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

      const creditLimit = parseMoneyDecimalInput(formCreditLimit);
      const loanAmount = parseMoneyDecimalInput(formLoanAmount);

      const payload = buildKunnPayload({
        fields: {
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
          rateHistory,
          collateralIds: selectedCollateralIds,
        },
        customerId: targetCustomerId,
        contractNumber: effectiveContractNumber,
        prefPercent: prefVal,
        basePercent: baseVal,
        marginPercent: marginVal,
        activeRatePercent: currentActiveRateDisplay,
      });

      if (forceInsert || !selectedContract) {
        delete payload.Id;

        const targetHdtdNo = formHdtdNumber.trim() || (selectedContract ? getMasterHdtdNumber(selectedContract) : '');

        const targetStatus = findLimitGroupFor(
          computeLimitGroups(contracts, {
            getOutstanding: getEffectiveBalanceForContract,
            excludeContractId: (selectedContract && !forceInsert) ? selectedContract.Id : null,
            grantedOverride: creditLimit > 0 ? creditLimit : null,
            today: todayIso(),
            isClosed: kunnOfClosedHdtd,
          }),
          targetHdtdNo
        );
        const specificMasterLimit = targetStatus?.granted ?? creditLimit;

        if (loanAmount && specificMasterLimit > 0) {
          const remaining = targetStatus?.headroom ?? Math.max(0, specificMasterLimit);

          if (loanAmount > remaining) {
            showNotify('error',
              `Vượt hạn mức HĐTD ${targetHdtdNo}: còn ${remaining.toLocaleString('vi-VN')} VNĐ, đang nhập ${loanAmount.toLocaleString('vi-VN')} VNĐ.`
            );
            setLoading(false);
            return;
          }
        }
      }

      const savedContract = await saveContractAPI(payload);

      const existingScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
      const repayStartDate = savedContract.RepaymentStartDate || savedContract.DisbursementDate || savedContract.ContractStartDate;
      const periods = parseKunnTenorMonths(savedContract.KunnTenor) || savedContract.LoanTenorMonths || 12;
      const isBullet = isBulletPrincipal(savedContract);
      const rate = savedContract.InterestRate || savedContract.NormalRate || 0;
      const amt = savedContract.LoanAmount || savedContract.ContractAmount || 0;

      if (amt > 0 && rate > 0 && repayStartDate) {
        const history = getContractRateHistory(savedContract);

        if (existingScheds.length === 0 || existingScheds.length !== periods) {
          if (existingScheds.length > 0) {
            await deleteRepaymentSchedulesByContractAPI(savedContract.Id);
          }
          const generated = generateSchedule(
            savedContract.Id,
            amt,
            rate,
            repayStartDate,
            periods,
            isBullet,
            savedContract.DisbursementDate || savedContract.ContractStartDate || undefined,
            undefined,
            savedContract.PrincipalGracePeriodMonths || 0,
            0,
            1,
            'reduce_monthly',
            history,
            undefined,
            savedContract.KunnDueDate || savedContract.ContractEndDate || undefined
          );
          await bulkSaveRepaymentSchedulesAPI(generated);
          const newScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
          setSchedules(newScheds);
          setAllSchedulesMap(prev => ({ ...prev, [savedContract.Id]: newScheds }));
        } else {
          const updatedWithNewDates = redateSchedules(
            existingScheds,
            repayStartDate,
            savedContract.DisbursementDate || savedContract.ContractStartDate || undefined,
            savedContract.KunnDueDate || savedContract.ContractEndDate || undefined
          );

          const recalculated = recalculateSchedules(updatedWithNewDates, savedContract);
          await bulkSaveRepaymentSchedulesAPI(recalculated);

          const newScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
          setSchedules(newScheds);
          setAllSchedulesMap(prev => ({ ...prev, [savedContract.Id]: newScheds }));
        }
      }

      showNotify('success', (forceInsert || !selectedContract) ? 'Đã tạo KUNN và lập lịch thu nợ.' : 'Đã cập nhật KUNN.');

      if (targetCustomerId) {
        const refreshed = await fetchContractsByCustomerAPI(targetCustomerId);
        setContracts(refreshed);
        if (!forceInsert && selectedContract) {
          const updated = refreshed.find(c => c.Id === savedContract.Id);
          if (updated) {
            setSelectedContract(updated);
            populateForm(updated);
          }
        } else {
          setSelectedContract(null);
        }
      }
    } catch (err: any) {
      showNotify('error', `Không lưu được: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (e: React.MouseEvent, contractId: number, contractNumber: string) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA Hợp đồng Tín dụng / KUNN "${contractNumber}" không?\nHành động này không thể hoàn tác!`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteContractAPI(contractId);
      showNotify('success', `Đã xoá KUNN "${contractNumber}".`);
      if (selectedContract?.Id === contractId) {
        setSelectedContract(null);
        setShowForm(false);
      }
      if (foundCustomer) {
        const refreshed = await fetchContractsByCustomerAPI(foundCustomer.Id);
        setContracts(refreshed);
      }
    } catch (err: any) {
      showNotify('error', `Không xoá được: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const payment = usePaymentModal({
    selectedContract,
    schedules,
    onLoadingChange: setLoading,
    onNotify: (type, message) => showNotify(type, message),
    onSaved: ({ schedules: refreshed, balance, debtGroup }) => {
      if (!selectedContract) return;
      setSchedules(refreshed);
      setAllSchedulesMap(prev => ({ ...prev, [selectedContract.Id]: refreshed }));
      setContracts(prev => prev.map(con => con.Id === selectedContract.Id
        ? { ...con, CurrentBalance: balance, DebtGroup: debtGroup }
        : con));
      setSelectedContract(prev => prev ? { ...prev, CurrentBalance: balance, DebtGroup: debtGroup } : null);
      setFormCurrentBalance(balance.toLocaleString('vi-VN'));
    },
  });

  const selectedCollaterals = collaterals.filter(c => selectedCollateralIds.includes(c.Id));

  const maxAllowedLoanLtv = selectedCollaterals.reduce((sum, c) => {
    const val = c.AppraisedValue || c.Value || 0;
    const ltv = getEffectiveLtv(c);
    return sum + (val * ltv / 100);
  }, 0);

  const today = todayIso();

  const kunnSettled = useCallback((c: LoanContract) => isKunnSettled(c), []);

  const getEffectiveBalanceForContract = (c: LoanContract) =>
    computeOutstandingBalance(allSchedulesMap[c.Id], c);

  const kunnOfClosedHdtd = useCallback(
    (c: LoanContract) => isKunnOfClosedHdtd(c, creditContracts),
    [creditContracts]
  );

  const limitGroups = useMemo(
    () => computeLimitGroups(contracts, {
      getOutstanding: getEffectiveBalanceForContract,
      today: today,
      isClosed: kunnOfClosedHdtd,
    }),
    [contracts, allSchedulesMap, today, kunnOfClosedHdtd]
  );

  const masterNoOf = useCallback(
    (c: LoanContract) => resolveMasterHdtdNumber(c, creditContracts),
    [creditContracts]
  );

  const masterHdtdGroups = useMemo(() => {
    const map = new Map<string, MasterHdtdGroup>();

    for (const c of contracts) {
      const masterNo = masterNoOf(c);
      if (!map.has(masterNo)) {
        map.set(masterNo, {
          masterNo,
          contracts: [],
          masterContract: null,
          totalCreditLimit: 0,
          totalKunnDisbursed: 0,
          remainingLimit: 0,
        });
      }
      const group = map.get(masterNo)!;
      group.contracts.push(c);

      if (c.ContractAmount && c.ContractAmount > group.totalCreditLimit) {
        group.totalCreditLimit = c.ContractAmount;
        group.masterContract = c;
      }
    }

    for (const group of map.values()) {
      if (group.totalCreditLimit === 0 && group.contracts.length > 0) {
        group.totalCreditLimit = group.contracts[0].ContractAmount || group.contracts[0].LoanAmount || 0;
      }
      const status = findLimitGroupFor(limitGroups, group.masterNo);
      group.totalKunnDisbursed = status?.used ?? 0;
      group.remainingLimit = status?.available ?? Math.max(0, group.totalCreditLimit);
      if (status && status.granted > 0) group.totalCreditLimit = status.granted;
    }

    return Array.from(map.values());
  }, [contracts, limitGroups, masterNoOf]);

  const filteredContracts = useMemo(() => {
    if (selectedMasterFilter === 'ALL') return contracts;
    return contracts.filter(c => masterNoOf(c) === selectedMasterFilter);
  }, [contracts, selectedMasterFilter, masterNoOf]);

  const summaryFinancials = useMemo(() => {
    if (selectedMasterFilter === 'ALL') {
      const totalCredit = limitGroups.reduce((sum, g) => sum + g.granted, 0);
      const totalDisbursed = limitGroups.reduce((sum, g) => sum + g.outstanding, 0);
      const totalRemaining = limitGroups.reduce((sum, g) => sum + g.available, 0);
      return { totalCredit, totalDisbursed, totalRemaining };
    }
    const status = findLimitGroupFor(limitGroups, selectedMasterFilter);
    if (!status) return { totalCredit: 0, totalDisbursed: 0, totalRemaining: 0 };
    return {
      totalCredit: status.granted,
      totalDisbursed: status.outstanding,
      totalRemaining: status.available,
    };
  }, [limitGroups, selectedMasterFilter]);

  const formLimitStatus = useMemo(
    () => findLimitGroupFor(
      computeLimitGroups(contracts, {
        getOutstanding: getEffectiveBalanceForContract,
        excludeContractId: selectedContract?.Id ?? null,
        grantedOverride: creditLimitNum > 0 ? creditLimitNum : null,
        today: today,
        isClosed: kunnOfClosedHdtd,
      }),
      effectiveFormHdtdNo
    ),
    [contracts, allSchedulesMap, selectedContract, creditLimitNum, effectiveFormHdtdNo, today, kunnOfClosedHdtd]
  );

  const formGrantedLimit = formLimitStatus?.granted ?? creditLimitNum;
  const totalExistingKunnBalance = formLimitStatus?.used ?? 0;
  const availableBeforeThisKunn = formLimitStatus?.available ?? Math.max(0, creditLimitNum);
  const remainingHmtdLimit = Math.max(0, availableBeforeThisKunn - kunnLoanAmountNum);

  const graceOptions = useMemo(() => graceMonthOptions(form.LoanMethod), [form.LoanMethod]);

  const capacityWarnings = useMemo(
    () => checkCollateralCapacity(contracts, collaterals, getEffectiveBalanceForContract, today)
      .filter(w => w.exceeded || w.expiredAppraisals.length > 0),
    [contracts, collaterals, allSchedulesMap]
  );

  const applyCreditContractToForm = (cc: CreditContract, keepKunnNumber = false) => {
    setFormHdtdNumber(cc.HdtdNumber);
    if (!keepKunnNumber) {
      setFormKunnNumber(nextKunnNumber(cc.HdtdNumber, contracts.map(c => c.ContractNumber)));
    }
    setForm(f => ({
      ...f,
      CreditContractId: cc.Id,
      LoanMethod: cc.LoanMethod || f.LoanMethod,
      ContractStartDate: cc.ContractStartDate || '',
      ContractEndDate: cc.ContractEndDate || '',
      LoanTenorMonths: cc.LoanTenorMonths || f.LoanTenorMonths,
      LoanPurpose: cc.LoanPurpose || '',
      LoanPurposeType: cc.LoanPurposeType || '',
      PrincipalRepaymentMethod: keepKunnNumber
        ? f.PrincipalRepaymentMethod
        : getLoanProductRule(cc.LoanMethod).defaultPrincipalMethod,
    }));
    setFormCreditLimit(cc.ContractAmount ? cc.ContractAmount.toLocaleString('vi-VN') : '');
    setFormCreditLimitCode(cc.ApprovalCode || '');
    setFormCreditLimitAmount(cc.ApprovalAmount ? cc.ApprovalAmount.toLocaleString('vi-VN') : '');
    setRatePreferential(rateToInput(cc.PreferentialRate));
    setRatePreferentialMonths(intToInput(cc.PreferentialPeriodMonths));
    setRateBase(rateToInput(cc.BaseRate));
    setRateMargin(rateToInput(cc.MarginRate));
    setSelectedCollateralIds(
      (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
    );
  };

  const selectableCreditContracts = useMemo(() => {
    const currentId = selectedContract?.CreditContractId ?? null;
    return creditContracts.filter(cc => {
      if (cc.Id === currentId) return true;
      if (cc.IsClosed) return false;
      const end = (cc.ContractEndDate || '').trim();
      return !(end && end < today);
    });
  }, [creditContracts, selectedContract, today]);

  const formCreditContract = useMemo(() => {
    if (creditContracts.length === 0) return null;
    if (selectedContract?.CreditContractId) {
      return creditContracts.find(cc => cc.Id === selectedContract.CreditContractId) || null;
    }
    const no = effectiveFormHdtdNo.trim().toLowerCase();
    if (!no) return null;
    return creditContracts.find(cc => cc.HdtdNumber.trim().toLowerCase() === no) || null;
  }, [creditContracts, selectedContract, effectiveFormHdtdNo]);

  const kunnIssues = useMemo(
    () => checkKunnAgainstContract(
      { DisbursementDate: form.DisbursementDate, KunnDueDate: form.KunnDueDate, LoanAmount: kunnLoanAmountNum },
      formCreditContract
    ),
    [form.DisbursementDate, form.KunnDueDate, kunnLoanAmountNum, formCreditContract]
  );

  useEffect(() => {
    if (!disburseRequest || !foundCustomer) return;
    if (disburseRequest.customerId !== foundCustomer.Id) return;
    const cc = creditContracts.find(x => x.Id === disburseRequest.creditContractId);
    if (!cc) return;

    const kunnNo = nextKunnNumber(cc.HdtdNumber, contracts.map(c => c.ContractNumber));

    setSelectedContract(null);
    setSchedules([]);
    setFormHdtdNumber(cc.HdtdNumber);
    setFormKunnNumber(kunnNo);
    setForm({
      CustomerId: foundCustomer.Id,
      CreditContractId: cc.Id,
      ContractType: 0,
      ContractNumber: kunnNo,
      LoanMethod: cc.LoanMethod || 'Hạn mức tín dụng',
      DebtGroup: 1,
      ContractStartDate: cc.ContractStartDate || '',
      ContractEndDate: cc.ContractEndDate || '',
      LoanTenorMonths: cc.LoanTenorMonths || 12,
      LoanPurpose: cc.LoanPurpose || '',
      LoanPurposeType: cc.LoanPurposeType || '',
      PrincipalRepaymentMethod: getLoanProductRule(cc.LoanMethod).defaultPrincipalMethod,
      InterestRepaymentMethod: 'Trả hàng tháng theo dư nợ thực tế',
      PrincipalGracePeriodMonths: 0,
      InterestGracePeriodMonths: 0,
      IsSettled: false,
      IsRestructured: false,
    });
    setFormCreditLimit(cc.ContractAmount ? cc.ContractAmount.toLocaleString('vi-VN') : '');
    setFormCreditLimitCode(cc.ApprovalCode || '');
    setFormCreditLimitAmount(cc.ApprovalAmount ? cc.ApprovalAmount.toLocaleString('vi-VN') : '');
    setFormLoanAmount('');
    setFormCurrentBalance('');
    setRatePreferential(rateToInput(cc.PreferentialRate));
    setRatePreferentialMonths(intToInput(cc.PreferentialPeriodMonths));
    setRateBase(rateToInput(cc.BaseRate));
    setRateMargin(rateToInput(cc.MarginRate));
    setSelectedCollateralIds(
      (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
    );
    setMainTab('kunn');
    setShowForm(true);
    clearDisburseRequest();
  }, [disburseRequest, foundCustomer, creditContracts, contracts]);

  const scopedLimitGroups = useMemo(
    () => selectedMasterFilter === 'ALL'
      ? limitGroups
      : limitGroups.filter(g => findLimitGroupFor([g], selectedMasterFilter)),
    [limitGroups, selectedMasterFilter]
  );

  const expiredLimitNote = useMemo(() => {
    const expired = scopedLimitGroups.filter(g => g.expired && g.headroom > 0);
    if (expired.length === 0) return null;
    if (expired.length === 1) {
      return `HĐTD hết hiệu lực ${fmtDate(expired[0].endDate)}`;
    }
    return `${expired.length} HĐTD đã hết hiệu lực`;
  }, [scopedLimitGroups]);

  const canDisburse = scopedLimitGroups.length === 0
    || scopedLimitGroups.some(g => g.available > 0);

  const totalCreditLimit = summaryFinancials.totalCredit;
  const totalKunnAmount = summaryFinancials.totalDisbursed;
  const remainingCreditLimit = summaryFinancials.totalRemaining;

  const containerCardBg = UI.containerCardBg;

  const sectionBoxBg = UI.sectionBoxBg;

  const inputStyle = UI.inputStyle;

  const readonlyInputStyle = UI.readonlyInputStyle;

  const tableHeaderStyle = UI.tableHeaderStyle;

  const labelStyle = UI.labelStyle;

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-md border flex items-center space-x-3 text-sm font-medium ${notification.type === 'success'
          ? 'bg-pos-soft border-pos/30 text-pos'
          : 'bg-neg-soft border-neg/30 text-neg'
          }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <CustomerSearchBar
        inputStyle={inputStyle}
        labelStyle={labelStyle}
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
          portfolio.clearSearch();
          setShowForm(false);
        }}
        containerCardBg={containerCardBg}
      />

      {!foundCustomer && !isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-ink-faint space-y-3">
          <Search className="w-12 h-12 text-ink-muted" />
          <p className="text-sm">Chọn khách hàng để bắt đầu</p>
        </div>
      )}

      {foundCustomer && (
        <div className="space-y-4">

          <CustomerSummaryHeader
            foundCustomer={foundCustomer}
            collaterals={collaterals}
            containerCardBg={containerCardBg}
            selectedMasterFilter={selectedMasterFilter}
            totalCreditLimit={totalCreditLimit}
            totalKunnAmount={totalKunnAmount}
            remainingCreditLimit={remainingCreditLimit}
            expiredLimitNote={expiredLimitNote}
            canDisburse={canDisburse}
            handleNewContract={handleNewContract}
          />

          {capacityWarnings.length > 0 && (
            <div className="rounded-lg border border-warn/30 bg-warn-soft  p-4 space-y-2">
              <div className="flex items-center gap-2 text-warn font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cảnh báo kiểm soát tài sản bảo đảm</span>
              </div>
              {capacityWarnings.map(w => (
                <div key={w.collateralIds.join('-')} className="text-[11px] text-warn">
                  {w.expiredAppraisals.map(e => (
                    <div key={e.collateralId} className="text-neg font-semibold">
                      {e.assetCode}: {e.expiryDate ? `định giá hết hiệu lực ${fmtDate(e.expiryDate)}` : 'chưa có ngày định giá'}
                    </div>
                  ))}
                  {w.exceeded && (
                    <div>
                      <strong className="font-mono">{w.assetCodes.join(', ')}</strong>: bảo đảm {fmtMoney(w.capacity)}, nghĩa vụ {fmtMoney(w.granted)} — vượt{' '}
                      <strong className="text-neg">{fmtMoney(w.excessAmount)}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <MasterHdtdFilterTabs
            masterHdtdGroups={masterHdtdGroups}
            selectedMasterFilter={selectedMasterFilter}
            setSelectedMasterFilter={setSelectedMasterFilter}
            contractsCount={contracts.length}
          />

          <div className={`flex items-center space-x-1 border rounded-md p-1 w-fit ${containerCardBg}`}>
            {[
              { id: 'kunn' as const, label: 'Danh sách KUNN', icon: Receipt },
              { id: 'schedule' as const, label: 'Lịch Thu Nợ', icon: Calendar },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mainTab === id ? 'bg-accent text-accent-ink' : 'text-ink-faint hover:text-ink'
                  }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {mainTab === 'kunn' && (
            <div className="space-y-4">
              <KunnTable
                containerCardBg={containerCardBg}
                tableHeaderStyle={tableHeaderStyle}
                filteredContracts={filteredContracts}
                selectedContract={selectedContract}
                handleSelectContract={handleSelectContract}
                allSchedulesMap={allSchedulesMap}
                getAutoDebtGroupInfo={getAutoDebtGroupInfo}
                getMasterHdtdNumber={masterNoOf}
                isSettled={kunnSettled}
                getEffectiveBalanceForContract={getEffectiveBalanceForContract}
              />

              {showForm && (
                <KunnForm
                  containerCardBg={containerCardBg}
                  sectionBoxBg={sectionBoxBg}
                  inputStyle={inputStyle}
                  readonlyInputStyle={readonlyInputStyle}
                  labelStyle={labelStyle}
                  tableHeaderStyle={tableHeaderStyle}
                  selectedContract={selectedContract}
                  foundCustomer={foundCustomer}
                  setShowForm={setShowForm}
                  form={form}
                  setForm={setForm}
                  handleSaveContract={handleSaveContract}
                  handleDeleteContract={handleDeleteContract}
                  loading={loading}
                  creditContracts={creditContracts}
                  selectableCreditContracts={selectableCreditContracts}
                  applyCreditContractToForm={applyCreditContractToForm}
                  formCreditContract={formCreditContract}
                  formKunnNumber={formKunnNumber}
                  setFormKunnNumber={setFormKunnNumber}
                  formLimitStatus={formLimitStatus}
                  kunnIssues={kunnIssues}
                  formGrantedLimit={formGrantedLimit}
                  totalExistingKunnBalance={totalExistingKunnBalance}
                  availableBeforeThisKunn={availableBeforeThisKunn}
                  remainingHmtdLimit={remainingHmtdLimit}
                  formLoanAmount={formLoanAmount}
                  setFormLoanAmount={setFormLoanAmount}
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
                  graceOptions={graceOptions}
                  selectedCollaterals={selectedCollaterals}
                  maxAllowedLoanLtv={maxAllowedLoanLtv}
                />
              )}
            </div>
          )}

          {mainTab === 'schedule' && (
            <ScheduleTab
              contracts={contracts}
              selectedContract={selectedContract}
              handleSelectContract={handleSelectContract}
              schedules={schedules}
              openPaymentModal={payment.open}
            />
          )}
        </div>
      )}

      {payment.editingSchedule && selectedContract && (
        <PaymentModal
          editingSchedule={payment.editingSchedule}
          selectedContract={selectedContract}
          containerCardBg={containerCardBg}
          loading={loading}
          modalActualPaidPrincipalStr={payment.actualPaidPrincipalStr}
          setModalActualPaidPrincipalStr={payment.setActualPaidPrincipalStr}
          modalActualPaidInterestStr={payment.actualPaidInterestStr}
          setModalActualPaidInterestStr={payment.setActualPaidInterestStr}
          modalPrepaidPrincipalStr={payment.prepaidPrincipalStr}
          setModalPrepaidPrincipalStr={payment.setPrepaidPrincipalStr}
          modalOverdueDaysStr={payment.overdueDaysStr}
          setModalOverdueDaysStr={payment.setOverdueDaysStr}
          modalOverdueInterestStr={payment.overdueInterestStr}
          setModalOverdueInterestStr={payment.setOverdueInterestStr}
          modalPaymentDate={payment.paymentDate}
          setModalPaymentDate={payment.setPaymentDate}
          modalIsPaid={payment.isPaid}
          setModalIsPaid={payment.setIsPaid}
          onClose={payment.close}
          onSave={payment.save}
        />
      )}
    </div>
  );
};
