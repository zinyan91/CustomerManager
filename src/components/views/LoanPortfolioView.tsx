import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI, deleteContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI,
  fetchCollateralsByCustomerAPI, deleteRepaymentSchedulesByContractAPI
} from '../../lib/api';
import { fmtDate, fmtMoney, getContractRateHistory, getMasterHdtdNumber, parseMoneyDecimalInput, parseMoneyInput, stripLegacyNoteBlobs, toIsoDate, todayIso } from '../../lib/utils';
import {
  addMonthsToDate, parseKunnTenorMonths,
  generateSchedule, calculateOverdueDaysFromDates,
  getAutoDebtGroupInfo, recalculateSchedules, computeOutstandingBalance,
  isBulletPrincipal, getDaysBetween, redateSchedules
} from '../../lib/loanMath';
import {
  buildContractRateTimeline, splitPeriodByRate, getEffectiveActiveRate, resolveRateModeOf,
  type RateSegment,
} from '../../lib/rateResolution';
import { getEffectiveLtv } from '../../lib/collateralMath';
import { checkKunnAgainstContract, nextKunnNumber, resolveMasterHdtdNumber, isKunnSettled, isKunnOfClosedHdtd } from '../../lib/creditContract';
import { fetchCreditContractsByCustomerAPI } from '../../lib/api';
import { useWork } from '../../context/WorkContext';
import { checkCollateralCapacity, computeLimitGroups, findLimitGroupFor } from '../../lib/creditLimit';
import {
  graceMonthOptions,
  getLoanProductRule,
} from '../../lib/loanProductRules';
import type { LoanContract, CreditContract, Customer, RepaymentSchedule, Collateral, RateAdjustmentHistoryItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Search, Receipt, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { CustomerSearchBar } from '../portfolio/CustomerSearchBar';
import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';
import { MasterHdtdFilterTabs, type MasterHdtdGroup } from '../portfolio/MasterHdtdFilterTabs';
import { KunnTable } from '../portfolio/KunnTable';
import { PaymentModal } from '../portfolio/PaymentModal';
import { KunnForm } from '../portfolio/KunnForm';
import { ScheduleTab } from '../portfolio/ScheduleTab';

const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm'
];

function rateToInput(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return Number((v * 100).toFixed(4)).toString();
}

function intToInput(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return String(v);
}

export const LoanPortfolioView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContract, setSearchContract] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { selectedCustomerId, setSelectedCustomerId, disburseRequest, clearDisburseRequest } = useWork();
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);

  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [showForm, setShowForm] = useState(false);

  const [rateHistory, setRateHistory] = useState<RateAdjustmentHistoryItem[]>([]);
  const [newAdjDate, setNewAdjDate] = useState('');
  const [newAdjBaseRate, setNewAdjBaseRate] = useState('');
  const [newAdjMargin, setNewAdjMargin] = useState('');
  const [newAdjPenalty, setNewAdjPenalty] = useState('');
  const [newAdjReason, setNewAdjReason] = useState('');

  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('ALL');

  const [allSchedulesMap, setAllSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});

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

  const [editingSchedule, setEditingSchedule] = useState<RepaymentSchedule | null>(null);
  const [modalOverdueDaysStr, setModalOverdueDaysStr] = useState('0');
  const [modalOverdueInterestStr, setModalOverdueInterestStr] = useState('0');
  const [modalPrepaidPrincipalStr, setModalPrepaidPrincipalStr] = useState('0');
  const [modalActualPaidPrincipalStr, setModalActualPaidPrincipalStr] = useState('0');
  const [modalActualPaidInterestStr, setModalActualPaidInterestStr] = useState('0');
  const [modalIsPaid, setModalIsPaid] = useState(false);
  const [modalPaymentDate, setModalPaymentDate] = useState(() => todayIso());
  const [modalNote, setModalNote] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setAllCustomers(list);
    }).catch(() => { });
  }, []);

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

  let isPromoExpired = false;
  const prefMonths = parseInt(ratePreferentialMonths, 10) || 0;
  const startStr = form.DisbursementDate || form.ContractStartDate;
  if (startStr && prefMonths > 0) {
    const parts = startStr.split('-');
    if (parts.length === 3) {
      const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const now = new Date();
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (diffMonths >= prefMonths) {
        isPromoExpired = true;
      }
    }
  }

  let currentActiveRateDisplay = 0;
  if (interestRateMode === 'pref' && prefVal > 0) {
    currentActiveRateDisplay = isPromoExpired ? (postPrefRate + surchargeVal) : (prefVal + surchargeVal);
  } else if (baseVal > 0) {
    currentActiveRateDisplay = normalRate + surchargeVal;
  } else if (prefVal > 0) {
    currentActiveRateDisplay = prefVal + surchargeVal;
  }

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

  useEffect(() => {
    setSchedules([]);
    setAllSchedulesMap({});
    setSelectedContract(null);
    setSelectedMasterFilter('ALL');
    setShowForm(false);
    setMainTab('kunn');

    const id = foundCustomer?.Id;
    if (!id) {
      setCreditContracts([]);
      return;
    }
    if (selectedCustomerId !== id) setSelectedCustomerId(id);
    fetchCreditContractsByCustomerAPI(id).then(setCreditContracts);
  }, [foundCustomer?.Id]);

  const loadAllSchedulesForContracts = async (cons: LoanContract[]) => {
    const map: Record<number, RepaymentSchedule[]> = {};
    await Promise.all(cons.map(async (c) => {
      try {
        const schs = await fetchRepaymentSchedulesAPI(c.Id);
        map[c.Id] = schs;
      } catch { }
    }));
    setAllSchedulesMap(map);
  };

  const handlePickCustomer = async (c: Customer) => {
    setShowDropdown(false);
    setDropdownQuery(c.FullName);
    setSearchCif(c.CifKh);
    setSearchName('');
    setSearchContract('');
    setFoundCustomer(c);
    setContracts([]);
    setSelectedContract(null);
    setShowForm(false);
    setMainTab('kunn');
    const [cons, cols] = await Promise.all([
      fetchContractsByCustomerAPI(c.Id),
      fetchCollateralsByCustomerAPI(c.Id)
    ]);
    setContracts(cons);
    setCollaterals(cols);
    loadAllSchedulesForContracts(cons);
  };

  useEffect(() => {
    if (allCustomers.length === 0 || !selectedCustomerId) return;
    if (foundCustomer?.Id === selectedCustomerId) return;
    const c = allCustomers.find(x => x.Id === selectedCustomerId);
    if (c) handlePickCustomer(c);
  }, [selectedCustomerId, allCustomers]);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCif.trim() && !searchName.trim() && !searchContract.trim()) {
      showNotify('error', 'Nhập ít nhất một thông tin để tìm kiếm.');
      return;
    }
    setIsSearching(true);
    setFoundCustomer(null);
    setContracts([]);
    setCollaterals([]);
    setSelectedContract(null);
    setShowForm(false);

    try {
      let customers: Customer[] = [];
      if (searchCif.trim()) {
        customers = await fetchCustomersAPI({ cif: searchCif.trim() });
      } else if (searchName.trim()) {
        customers = await fetchCustomersAPI({ name: searchName.trim() });
      } else {
        customers = await fetchCustomersAPI({});
      }

      let matchedCustomer: Customer | null = null;
      if (customers.length > 0) {
        matchedCustomer = customers[0];
      }

      if (!matchedCustomer && searchContract.trim()) {
        const allCust = await fetchCustomersAPI({});
        for (const c of allCust) {
          const cons = await fetchContractsByCustomerAPI(c.Id);
          const found = cons.find(con => con.ContractNumber?.toLowerCase().includes(searchContract.toLowerCase()));
          if (found) { matchedCustomer = c; setContracts(cons); break; }
        }
      }

      if (!matchedCustomer) {
        showNotify('error', 'Không tìm thấy khách hàng phù hợp.');
      } else {
        setFoundCustomer(matchedCustomer);
        setDropdownQuery(matchedCustomer.FullName);
        setSearchCif(matchedCustomer.CifKh);
        setSearchName('');
        const [cons, cols] = await Promise.all([
          fetchContractsByCustomerAPI(matchedCustomer.Id),
          fetchCollateralsByCustomerAPI(matchedCustomer.Id),
        ]);
        setContracts(cons);
        setCollaterals(cols);
        loadAllSchedulesForContracts(cons);
      }
    } catch (err: any) {
      showNotify('error', `Không tìm được: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectContract = async (c: LoanContract) => {
    if (selectedContract?.Id === c.Id) {
      setSelectedContract(null);
      setSchedules([]);
      setShowForm(false);
      return;
    }
    setSelectedContract(c);
    setShowForm(true);
    populateForm(c);
    const s = await fetchRepaymentSchedulesAPI(c.Id);
    if (s.length > 0) {
      const recalculated = recalculateSchedules(s, c);
      setSchedules(recalculated);
      setAllSchedulesMap(prev => ({ ...prev, [c.Id]: recalculated }));
    } else {
      setSchedules(s);
      setAllSchedulesMap(prev => ({ ...prev, [c.Id]: s }));
    }
  };

  const populateForm = (c: LoanContract) => {
    setFormHdtdNumber(resolveMasterHdtdNumber(c, creditContracts));
    setFormKunnNumber(c.ContractNumber || '');

    setForm({
      Id: c.Id,
      CustomerId: c.CustomerId,
      CreditContractId: c.CreditContractId
        ?? creditContracts.find(cc => cc.HdtdNumber === getMasterHdtdNumber(c))?.Id
        ?? null,
      ContractNumber: c.ContractNumber,
      HdtdDueDate: toIsoDate(c.HdtdDueDate),
      ContractType: c.ContractType,
      LoanMethod: c.LoanMethod || LOAN_METHODS[0],
      DebtGroup: c.DebtGroup ?? 1,
      ContractStartDate: c.ContractStartDate ?? '',
      ContractEndDate: c.ContractEndDate ?? '',
      LoanTenorMonths: c.LoanTenorMonths ?? undefined,
      DisbursementDate: c.DisbursementDate ?? '',
      KunnDueDate: c.KunnDueDate ?? '',
      KunnTenor: c.KunnTenor ?? '',
      RepaymentStartDate: c.RepaymentStartDate ?? '',
      LoanPurposeType: c.LoanPurposeType ?? '',
      LoanPurpose: c.LoanPurpose ?? '',
      PrincipalRepaymentMethod: c.PrincipalRepaymentMethod || 'Trả đều hàng tháng',
      InterestRepaymentMethod: c.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ giảm dần',
      PrincipalGracePeriodMonths: c.PrincipalGracePeriodMonths ?? 0,
      InterestGracePeriodMonths: c.InterestGracePeriodMonths ?? 0,
      IsSettled: c.IsSettled ?? false,
      IsRestructured: c.IsRestructured ?? false,
    });

    setFormCreditLimit(c.ContractAmount ? c.ContractAmount.toLocaleString('vi-VN') : '');
    setFormCreditLimitCode(c.CreditLimitCode || '');
    setFormCreditLimitAmount(c.CreditLimitAmount ? c.CreditLimitAmount.toLocaleString('vi-VN') : '');
    setFormLoanAmount(c.LoanAmount ? c.LoanAmount.toLocaleString('vi-VN') : '');
    setFormCurrentBalance(c.CurrentBalance ? c.CurrentBalance.toLocaleString('vi-VN') : '');

    setRatePreferential(rateToInput(c.PreferentialRate));
    setRatePreferentialMonths(intToInput(c.PreferentialPeriodMonths));
    setRateBase(rateToInput(c.BaseRate));
    setRateMargin(rateToInput(c.MarginRate));
    setRateFloor(rateToInput(c.RateFloorAnnual));

    setInterestRateMode(resolveRateModeOf(c));

    if (c.PenaltySurcharge != null && c.PenaltySurcharge > 0) {
      setRateConditionSurcharge(c.PenaltySurcharge.toString());
    } else {
      setRateConditionSurcharge('0');
    }

    const history = getContractRateHistory(c);
    setRateHistory(history);

    if (c.CollateralIds) {
      const ids = c.CollateralIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      setSelectedCollateralIds(ids);
    } else if (c.CollateralId) {
      setSelectedCollateralIds([c.CollateralId]);
    } else {
      setSelectedCollateralIds([]);
    }
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
    setFormLoanAmount('');
    setFormCurrentBalance('');
    setForm({
      CustomerId: foundCustomer?.Id,
      ContractType: 0,
      DebtGroup: 1,
      PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
      InterestRepaymentMethod: 'Trả hàng tháng theo dư nợ thực tế',
      PrincipalGracePeriodMonths: 0,
      InterestGracePeriodMonths: 0,
      IsSettled: false,
      IsRestructured: false,
    });

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

      const hdtd = formHdtdNumber.trim();
      let kunn = formKunnNumber.trim();

      if (!kunn) {
        if (hdtd) {
          const existingCount = contracts.filter(c => getMasterHdtdNumber(c).toLowerCase() === hdtd.toLowerCase()).length;
          const nextIndex = (existingCount + 1).toString().padStart(2, '0');
          kunn = `${hdtd}/GNN-${nextIndex}`;
        } else {
          kunn = 'HĐTD-01/GNN-01';
        }
      }

      const effectiveContractNumber = kunn;

      const creditLimit = parseMoneyDecimalInput(formCreditLimit);
      const loanAmount = parseMoneyDecimalInput(formLoanAmount);
      const currentBalInput = parseMoneyDecimalInput(formCurrentBalance);

      const currentBal = currentBalInput || loanAmount;

      const prefDec = prefVal ? prefVal / 100 : undefined;
      const baseDec = baseVal ? baseVal / 100 : undefined;
      const marginDec = marginVal ? marginVal / 100 : undefined;
      const postPrefDec = postPrefRate ? postPrefRate / 100 : undefined;
      const normalDec = normalRate ? normalRate / 100 : undefined;

      const activeInterestRate = currentActiveRateDisplay > 0
        ? currentActiveRateDisplay / 100
        : ((interestRateMode === 'pref' ? prefDec : normalDec) || prefDec || normalDec || baseDec || undefined);

      let noteText = form.Note || '';
      noteText = stripLegacyNoteBlobs(noteText);

      const cleanDate = (d?: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) ? d.trim() : null;

      const payload: Partial<LoanContract> = {
        ...form,
        CustomerId: targetCustomerId,
        ContractNumber: effectiveContractNumber,

        ContractStartDate: cleanDate(form.ContractStartDate),
        ContractEndDate: cleanDate(form.ContractEndDate),
        DisbursementDate: cleanDate(form.DisbursementDate),
        KunnDueDate: cleanDate(form.KunnDueDate),
        RepaymentStartDate: cleanDate(form.RepaymentStartDate),
        HdtdDueDate: cleanDate(form.HdtdDueDate),

        Note: noteText || null,
        RateHistory: rateHistory.length > 0 ? (rateHistory as any) : null,
        CollateralIds: selectedCollateralIds.length > 0 ? selectedCollateralIds.join(',') : null,
        PenaltySurcharge: parseFloat(rateConditionSurcharge) || 0,

        ContractAmount: creditLimit,
        LoanAmount: loanAmount,
        CurrentBalance: currentBal,

        CreditLimitCode: formCreditLimitCode.trim() || null,
        CreditLimitAmount: formCreditLimitCode.trim()
          ? (parseMoneyDecimalInput(formCreditLimitAmount) || null)
          : null,

        PreferentialRate: prefDec,
        PreferentialPeriodMonths: ratePreferentialMonths.trim() === ''
          ? undefined
          : (parseInt(ratePreferentialMonths, 10) || 0),
        BaseRate: baseDec,
        MarginRate: marginDec,
        PostPreferentialRate: postPrefDec,
        NormalRate: normalDec,
        RateFloorAnnual: rateFloor.trim() === '' ? null : (parseFloat(rateFloor) || 0) / 100,
        InterestRate: activeInterestRate,

        CollateralId: selectedCollateralIds.length > 0 ? selectedCollateralIds[0] : null,
      };

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

  const openPaymentModal = (s: RepaymentSchedule) => {
    setEditingSchedule(s);
    const payDate = s.PaymentDate || todayIso();
    setModalPaymentDate(payDate);

    let overdue = s.OverdueDays;
    if (overdue === undefined || overdue === null || overdue === 0) {
      overdue = calculateOverdueDaysFromDates(payDate, s.DueDate);
    }
    setModalOverdueDaysStr(overdue.toString());

    let initialPenalty = s.OverdueInterestAmount ?? 0;
    if (!initialPenalty && overdue > 0 && selectedContract) {
      const rate = getEffectiveActiveRate(selectedContract, s.DueDate);
      initialPenalty = Math.round((s.PrincipalAmount || 0) * (rate * 1.5) * (overdue / 365));
    }
    setModalOverdueInterestStr(initialPenalty ? initialPenalty.toLocaleString('vi-VN') : '0');

    const prepay = s.PrepaidPrincipalAmount ?? 0;
    setModalPrepaidPrincipalStr(prepay ? prepay.toLocaleString('vi-VN') : '0');

    const actP = s.ActualPaidPrincipal ?? ((s.PrincipalAmount || 0) + prepay);
    setModalActualPaidPrincipalStr(actP ? actP.toLocaleString('vi-VN') : '0');

    const actI = s.ActualPaidInterest ?? ((s.InterestAmount || 0) + initialPenalty);
    setModalActualPaidInterestStr(actI ? actI.toLocaleString('vi-VN') : '0');

    setModalIsPaid(s.IsPaid);
    setModalNote(s.Note || '');
  };

  const handleSavePaymentModal = async () => {
    if (!editingSchedule || !selectedContract) return;

    const overdueDays = parseInt(modalOverdueDaysStr, 10) || 0;
    const overdueInterest = parseMoneyInput(modalOverdueInterestStr);
    const prepaidPrincipal = parseMoneyInput(modalPrepaidPrincipalStr);
    const actualPaidP = parseMoneyInput(modalActualPaidPrincipalStr);
    const actualPaidI = parseMoneyInput(modalActualPaidInterestStr);

    const updated: RepaymentSchedule = {
      ...editingSchedule,
      TotalAmount: (editingSchedule.PrincipalAmount || 0) + (editingSchedule.InterestAmount || 0) + overdueInterest,
      IsPaid: modalIsPaid,
      PaymentDate: modalIsPaid ? modalPaymentDate : null,
      OverdueDays: overdueDays,
      OverdueInterestAmount: overdueInterest,
      ActualPaidPrincipal: actualPaidP,
      ActualPaidInterest: actualPaidI,
      PrepaidPrincipalAmount: prepaidPrincipal,
      Note: modalNote || null
    };

    try {
      setLoading(true);

      const draftList = schedules.map(s => s.Id === updated.Id ? updated : s);
      const recalculated = recalculateSchedules(draftList, selectedContract);

      await bulkSaveRepaymentSchedulesAPI(recalculated);

      const refreshed = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      setSchedules(refreshed);
      setAllSchedulesMap(prev => ({ ...prev, [selectedContract.Id]: refreshed }));

      const autoInfo = getAutoDebtGroupInfo(refreshed);

      const newBal = computeOutstandingBalance(refreshed, selectedContract);

      await saveContractAPI({
        Id: selectedContract.Id,
        CustomerId: selectedContract.CustomerId,
        ContractNumber: selectedContract.ContractNumber,
        CurrentBalance: newBal,
        DebtGroup: autoInfo.debtGroup
      });

      setContracts(prev => prev.map(con => con.Id === selectedContract.Id ? {
        ...con,
        CurrentBalance: newBal,
        DebtGroup: autoInfo.debtGroup
      } : con));

      setSelectedContract(prev => prev ? {
        ...prev,
        CurrentBalance: newBal,
        DebtGroup: autoInfo.debtGroup
      } : null);

      setFormCurrentBalance(newBal.toLocaleString('vi-VN'));
      setEditingSchedule(null);
      showNotify('success', `✓ Đã cập nhật Kỳ #${editingSchedule.PeriodNumber} & tự động phân bổ lại số tiền gốc cho các kỳ sau!`);
    } catch (err: any) {
      showNotify('error', `Không lưu được kỳ trả nợ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const periodRateSegments = useMemo(() => {
    const map: Record<number, RateSegment[]> = {};
    if (!selectedContract || schedules.length === 0) return map;

    const timeline = buildContractRateTimeline(selectedContract, { today: today });
    if (timeline.length === 0) return map;

    let prev = selectedContract.DisbursementDate
      || selectedContract.RepaymentStartDate
      || selectedContract.ContractStartDate
      || '';

    for (const s of [...schedules].sort((a, b) => a.PeriodNumber - b.PeriodNumber)) {
      if (!s.DueDate) continue;
      const from = prev || s.DueDate;
      map[s.Id] = splitPeriodByRate(timeline, from, s.DueDate, getDaysBetween(from, s.DueDate));
      prev = s.DueDate;
    }
    return map;
  }, [selectedContract, schedules, today]);

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

  const containerCardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl';

  const sectionBoxBg = isLight
    ? 'bg-slate-50/80 border-slate-200 text-slate-900'
    : 'bg-slate-950 border-slate-800 text-slate-100';

  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'
    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500';

  const readonlyInputStyle = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-800 font-bold cursor-default'
    : 'bg-slate-900 border-slate-800 text-slate-100 font-bold cursor-default';

  const tableHeaderStyle = isLight
    ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
    : 'bg-slate-950 text-slate-400 border-slate-800 font-bold';

  const tableRowHover = isLight ? 'hover:bg-sky-50/50' : 'hover:bg-slate-800/30';

  const labelStyle = isLight ? 'text-slate-700 font-medium' : 'text-slate-400 font-medium';

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${notification.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
          : 'bg-red-950/90 border-red-500/40 text-red-300'
          }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <CustomerSearchBar
        isLight={isLight}
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
          setFoundCustomer(null); setContracts([]); setCollaterals([]); setSelectedContract(null);
          setShowForm(false); setSearchCif(''); setSearchName('');
          setSearchContract(''); setDropdownQuery('');
        }}
        containerCardBg={containerCardBg}
      />

      {!foundCustomer && !isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="text-sm">Chọn khách hàng để bắt đầu</p>
        </div>
      )}

      {foundCustomer && (
        <div className="space-y-4">

          <CustomerSummaryHeader
            foundCustomer={foundCustomer}
            collaterals={collaterals}
            isLight={isLight}
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
            <div className="rounded-2xl border border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cảnh báo kiểm soát tài sản bảo đảm</span>
              </div>
              {capacityWarnings.map(w => (
                <div key={w.collateralIds.join('-')} className="text-[11px] text-amber-800 dark:text-amber-300">
                  {w.expiredAppraisals.map(e => (
                    <div key={e.collateralId} className="text-rose-600 dark:text-rose-400 font-semibold">
                      {e.assetCode}: {e.expiryDate ? `định giá hết hiệu lực ${fmtDate(e.expiryDate)}` : 'chưa có ngày định giá'}
                    </div>
                  ))}
                  {w.exceeded && (
                    <div>
                      <strong className="font-mono">{w.assetCodes.join(', ')}</strong>: bảo đảm {fmtMoney(w.capacity)}, nghĩa vụ {fmtMoney(w.granted)} — vượt{' '}
                      <strong className="text-rose-600 dark:text-rose-400">{fmtMoney(w.excessAmount)}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <MasterHdtdFilterTabs
            isLight={isLight}
            masterHdtdGroups={masterHdtdGroups}
            selectedMasterFilter={selectedMasterFilter}
            setSelectedMasterFilter={setSelectedMasterFilter}
            contractsCount={contracts.length}
          />

          <div className={`flex items-center space-x-1 border rounded-xl p-1 w-fit ${containerCardBg}`}>
            {[
              { id: 'kunn' as const, label: 'Danh sách KUNN', icon: Receipt },
              { id: 'schedule' as const, label: 'Lịch Thu Nợ', icon: Calendar },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mainTab === id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {mainTab === 'kunn' && (
            <div className="space-y-4">
              <KunnTable
                isLight={isLight}
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
                  isLight={isLight}
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
              isLight={isLight}
              containerCardBg={containerCardBg}
              tableHeaderStyle={tableHeaderStyle}
              tableRowHover={tableRowHover}
              contracts={contracts}
              selectedContract={selectedContract}
              handleSelectContract={handleSelectContract}
              schedules={schedules}
              allSchedulesMap={allSchedulesMap}
              periodRateSegments={periodRateSegments}
              openPaymentModal={openPaymentModal}
            />
          )}
        </div>
      )}

      {editingSchedule && selectedContract && (
        <PaymentModal
          editingSchedule={editingSchedule}
          selectedContract={selectedContract}
          containerCardBg={containerCardBg}
          loading={loading}
          modalActualPaidPrincipalStr={modalActualPaidPrincipalStr}
          setModalActualPaidPrincipalStr={setModalActualPaidPrincipalStr}
          modalActualPaidInterestStr={modalActualPaidInterestStr}
          setModalActualPaidInterestStr={setModalActualPaidInterestStr}
          modalPrepaidPrincipalStr={modalPrepaidPrincipalStr}
          setModalPrepaidPrincipalStr={setModalPrepaidPrincipalStr}
          modalOverdueDaysStr={modalOverdueDaysStr}
          setModalOverdueDaysStr={setModalOverdueDaysStr}
          modalOverdueInterestStr={modalOverdueInterestStr}
          setModalOverdueInterestStr={setModalOverdueInterestStr}
          modalPaymentDate={modalPaymentDate}
          setModalPaymentDate={setModalPaymentDate}
          modalIsPaid={modalIsPaid}
          setModalIsPaid={setModalIsPaid}
          onClose={() => setEditingSchedule(null)}
          onSave={handleSavePaymentModal}
        />
      )}
    </div>
  );
};
