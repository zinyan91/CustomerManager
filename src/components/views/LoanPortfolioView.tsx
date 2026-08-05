import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI, deleteContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI,
  fetchCollateralsByCustomerAPI, deleteRepaymentSchedulesByContractAPI
} from '../../lib/api';
import { formatMoneyInput, fmtDate, getContractRateHistory, getEffectiveActiveRate, getMasterHdtdNumber, toIsoDate } from '../../lib/utils';
import {
  addMonthsToDate, parseKunnTenorMonths, parseDateParts,
  generateSchedule, calculateOverdueDaysFromDates,
  getAutoDebtGroupInfo, recalculateSchedules, computeOutstandingBalance,
  isBulletPrincipal, getDaysBetween, paidPrincipalOf } from '../../lib/loanMath';
import {
  buildContractRateTimeline, splitPeriodByRate, formatSegmentsLabel,
  type RateSegment,
} from '../../lib/rateResolution';
import { getEffectiveLtv } from '../../lib/collateralMath';
import { checkKunnAgainstContract, nextKunnNumber, resolveMasterHdtdNumber, isKunnSettled } from '../../lib/creditContract';
import { fetchCreditContractsByCustomerAPI } from '../../lib/api';
import { useWork } from '../../context/WorkContext';
import { checkCollateralCapacity, computeLimitGroups, findLimitGroupFor } from '../../lib/creditLimit';
import {
  graceMonthOptions,
} from '../../lib/loanProductRules';
import type { LoanContract, CreditContract, Customer, RepaymentSchedule, Collateral, RateAdjustmentHistoryItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  Search, FileText, Receipt, Calendar, CheckCircle, AlertCircle,
  Plus, X, ShieldCheck, DollarSign, Building2, Save, Trash2, AlertTriangle
} from 'lucide-react';
import { DateInput } from '../DateInput';
import { CustomerSearchBar } from '../portfolio/CustomerSearchBar';
import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';
import { MasterHdtdFilterTabs, type MasterHdtdGroup } from '../portfolio/MasterHdtdFilterTabs';
import { KunnTable } from '../portfolio/KunnTable';
import { DebtSummaryCard } from '../portfolio/DebtSummaryCard';

const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm'
];

const PRINCIPAL_REPAY_OPTIONS = [
  'Gốc trả cuối kỳ',
  'Trả đều hàng tháng',
  'Trả đều hàng quý (3 tháng)',
  'Trả gốc tăng dần',
  'Thanh toán dư nợ tối thiểu hàng tháng',
  'Theo thỏa thuận trong KUNN'
];

const INTEREST_REPAY_OPTIONS = [
  'Trả hàng tháng theo dư nợ thực tế',
  'Trả hàng tháng theo dư nợ giảm dần',
  'Trả hàng tháng theo dư nợ ban đầu',
  'Trả cuối kỳ',
  'Tính theo sao kê hàng tháng'
];

const fmtMoney = (v?: number | null) => v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' VNĐ' : '—';
const fmtRate = (v?: number | null) => v !== undefined && v !== null ? (v * 100).toFixed(2) + '%/năm' : '—';

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
  const [modalPaymentDate, setModalPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
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

  const creditLimitNum = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
  const kunnLoanAmountNum = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || 0;

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

      const creditLimit = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
      const loanAmount = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || 0;
      const currentBalInput = parseFloat(formCurrentBalance.replace(/\./g, '').replace(',', '.')) || 0;

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
      noteText = noteText.replace(/\[COLLATERAL_IDS:[^\]]*\]/g, '').replace(/\[PENALTY_SURCHARGE:[^\]]*\]/g, '').replace(/\[RATE_HISTORY:[^\]]*\]/g, '').replace(/\[RATE_HISTORY:[\s\S]*?\]\]/g, '').trim();
      if (hdtd && hdtd !== effectiveContractNumber && !noteText.includes(`HĐTD: ${hdtd}`)) {
        noteText = `HĐTD: ${hdtd}\n${noteText}`.trim();
      }

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
          ? (parseFloat(formCreditLimitAmount.replace(/\./g, '').replace(',', '.')) || null)
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

        // Cùng nguồn tính với khối "Tình trạng hạn mức" trên form: dư nợ với HMTD
        // tuần hoàn, tổng đã nhận nợ với vay từng lần, luôn loại KUNN đã tất toán.
        const targetStatus = findLimitGroupFor(
          computeLimitGroups(contracts, {
            getOutstanding: getEffectiveBalanceForContract,
            excludeContractId: (selectedContract && !forceInsert) ? selectedContract.Id : null,
            grantedOverride: creditLimit > 0 ? creditLimit : null,
            today: new Date().toISOString().split('T')[0],
          }),
          targetHdtdNo
        );
        const specificMasterLimit = targetStatus?.granted ?? creditLimit;

        if (loanAmount && specificMasterLimit > 0) {
          // Chặn theo hạn mức trống, KHÔNG theo available — HĐTD hết hiệu lực vẫn
          // phải nhập được KUNN lịch sử; việc hết hiệu lực chỉ cảnh báo trên form.
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
            // GNN: kỳ trả nợ cuối cùng rơi vào ngày đáo hạn của khoản vay.
            savedContract.KunnDueDate || savedContract.ContractEndDate || undefined
          );
          await bulkSaveRepaymentSchedulesAPI(generated);
          const newScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
          setSchedules(newScheds);
          setAllSchedulesMap(prev => ({ ...prev, [savedContract.Id]: newScheds }));
        } else {

          const startParts = parseDateParts(repayStartDate);
          const startYear = startParts ? startParts.y : new Date().getFullYear();
          const startMonth = startParts ? startParts.m : new Date().getMonth();
          const startDay = startParts ? startParts.d : new Date().getDate();

          const updatedWithNewDates: RepaymentSchedule[] = existingScheds.map((s, idx) => {
            const i = idx + 1;
            let dueTotalMonths = startMonth + (i - 1);
            let dueYear = startYear + Math.floor(dueTotalMonths / 12);
            let dueMonthIdx = dueTotalMonths % 12;
            const daysInDueMonth = new Date(dueYear, dueMonthIdx + 1, 0).getDate();
            const dueDay = Math.min(startDay, daysInDueMonth);
            const newDueDateStr = `${dueYear}-${String(dueMonthIdx + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

            return {
              ...s,
              DueDate: newDueDateStr
            };
          });

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
    const payDate = s.PaymentDate || new Date().toISOString().split('T')[0];
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
    const overdueInterest = parseFloat(modalOverdueInterestStr.replace(/\D/g, '')) || 0;
    const prepaidPrincipal = parseFloat(modalPrepaidPrincipalStr.replace(/\D/g, '')) || 0;
    const actualPaidP = parseFloat(modalActualPaidPrincipalStr.replace(/\D/g, '')) || 0;
    const actualPaidI = parseFloat(modalActualPaidInterestStr.replace(/\D/g, '')) || 0;

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




  const todayIso = new Date().toISOString().split('T')[0];

  const kunnSettled = useCallback(
    (c: LoanContract) => isKunnSettled(
      c,
      c.CreditContractId ? creditContracts.find(cc => cc.Id === c.CreditContractId) : null
    ),
    [creditContracts]
  );

  /* Đóng HĐTD cũng là hết nợ, không chỉ riêng cờ tất toán trên từng KUNN. */
  const getEffectiveBalanceForContract = (c: LoanContract) =>
    kunnSettled(c) ? 0 : computeOutstandingBalance(allSchedulesMap[c.Id], c);

  const limitGroups = useMemo(
    () => computeLimitGroups(contracts, {
      getOutstanding: getEffectiveBalanceForContract,
      today: todayIso,
    }),
    [contracts, allSchedulesMap, todayIso]
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
        today: todayIso,
      }),
      effectiveFormHdtdNo
    ),
    [contracts, allSchedulesMap, selectedContract, creditLimitNum, effectiveFormHdtdNo, todayIso]
  );

  const formGrantedLimit = formLimitStatus?.granted ?? creditLimitNum;
  const totalExistingKunnBalance = formLimitStatus?.used ?? 0;
  const availableBeforeThisKunn = formLimitStatus?.available ?? Math.max(0, creditLimitNum);
  const remainingHmtdLimit = Math.max(0, availableBeforeThisKunn - kunnLoanAmountNum);

  const graceOptions = useMemo(() => graceMonthOptions(form.LoanMethod), [form.LoanMethod]);

  const capacityWarnings = useMemo(
    () => checkCollateralCapacity(contracts, collaterals, getEffectiveBalanceForContract, todayIso)
      .filter(w => w.exceeded || w.expiredAppraisals.length > 0),
    [contracts, collaterals, allSchedulesMap]
  );

  const periodRateSegments = useMemo(() => {
    const map: Record<number, RateSegment[]> = {};
    if (!selectedContract || schedules.length === 0) return map;

    const timeline = buildContractRateTimeline(selectedContract, { today: todayIso });
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
  }, [selectedContract, schedules, todayIso]);

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

  /**
   * HĐTD được chọn để giải ngân: bỏ hợp đồng đã đóng hoặc hết hiệu lực, vì hết
   * hiệu lực là không giải ngân được nữa. HĐTD của KUNN đang sửa vẫn giữ lại
   * để mở được hồ sơ cũ.
   */
  const selectableCreditContracts = useMemo(() => {
    const currentId = selectedContract?.CreditContractId ?? null;
    return creditContracts.filter(cc => {
      if (cc.Id === currentId) return true;
      if (cc.IsClosed) return false;
      const end = (cc.ContractEndDate || '').trim();
      return !(end && end < todayIso);
    });
  }, [creditContracts, selectedContract, todayIso]);

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
      PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
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

  const expiredLimitNote = useMemo(() => {
    const scope = selectedMasterFilter === 'ALL'
      ? limitGroups
      : limitGroups.filter(g => findLimitGroupFor([g], selectedMasterFilter));
    const expired = scope.filter(g => g.expired && g.headroom > 0);
    if (expired.length === 0) return null;
    if (expired.length === 1) {
      return `HĐTD hết hiệu lực ${fmtDate(expired[0].endDate)}`;
    }
    return `${expired.length} HĐTD đã hết hiệu lực`;
  }, [limitGroups, selectedMasterFilter]);

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
                <div className={`${containerCardBg} rounded-2xl p-5 space-y-5 border shadow-xl`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <h3 className="font-bold flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-sky-500" />
                      <span>{selectedContract ? `THÔNG TIN GIẤY NHẬN NỢ: ${selectedContract.ContractNumber}` : 'GIẢI NGÂN KUNN MỚI'}</span>
                    </h3>
                    <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveContract} className="space-y-6">
                    <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
                      <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>HỢP ĐỒNG TÍN DỤNG CHA & PHÂN LOẠI NỢ</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Hợp đồng tín dụng (HĐTD) *</label>
                          <select
                            value={form.CreditContractId ?? ''}
                            onChange={e => {
                              const id = parseInt(e.target.value, 10);
                              const cc = creditContracts.find(x => x.Id === id);
                              if (cc) applyCreditContractToForm(cc, !!selectedContract);
                            }}
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 ${inputStyle}`}>
                            <option value="">— Chọn HĐTD —</option>
                            {selectableCreditContracts.map(cc => (
                              <option key={cc.Id} value={cc.Id}>{cc.HdtdNumber}</option>
                            ))}
                          </select>
                          {creditContracts.length === 0 && (
                            <div className="mt-1 text-[10px] font-semibold text-rose-500">
                              Khách hàng chưa có HĐTD. Tạo ở tab Hợp Đồng Tín Dụng trước.
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Số KUNN (GNN) *</label>
                          <input type="text" value={formKunnNumber}
                            onChange={e => setFormKunnNumber(e.target.value)}
                            placeholder="2002/HDTD/9634078/GNN-01"
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Phân loại Nhóm nợ</label>
                          <select value={form.DebtGroup ?? 1}
                            onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                            className={`w-full rounded-xl p-2.5 text-xs font-bold ${inputStyle}`}>
                            {[1, 2, 3, 4, 5].map(g => (
                              <option key={g} value={g}>
                                Nhóm {g} ({g === 1 ? 'Nợ đủ tiêu chuẩn <10 ngày' : g === 2 ? 'Nợ cần chú ý 10-90 ngày' : g === 3 ? 'Nợ dưới tiêu chuẩn 91-180 ngày' : g === 4 ? 'Nợ nghi ngờ 181-360 ngày' : 'Nợ có khả năng mất vốn >360 ngày'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {formCreditContract && (
                        <div className={`rounded-xl p-3 border text-[11px] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                          }`}>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono">
                            <span className="text-slate-500">{foundCustomer?.FullName} · CIF {foundCustomer?.CifKh}</span>
                            <span>Phương thức: <strong>{formCreditContract.LoanMethod || '—'}</strong></span>
                            <span>Mức cấp: <strong className="text-sky-600 dark:text-sky-400">{fmtMoney(formCreditContract.ContractAmount)}</strong></span>
                            <span>Hiệu lực đến: <strong className={formLimitStatus?.expired ? 'text-rose-600 dark:text-rose-400' : ''}>
                              {fmtDate(formCreditContract.ContractEndDate)}
                            </strong></span>
                            {formCreditContract.LoanPurposeType && (
                              <span className="text-slate-500">Mục đích: {formCreditContract.LoanPurposeType}</span>
                            )}
                          </div>
                        </div>
                      )}


                      {kunnIssues.length > 0 && (
                        <div className={`p-3 rounded-xl border text-[11px] font-semibold space-y-1 ${isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                          }`}>
                          <div className="flex items-center space-x-1.5 uppercase tracking-wide">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Đối chiếu với HĐTD {formCreditContract?.HdtdNumber}</span>
                          </div>
                          {kunnIssues.map((x, i) => <div key={i}>• {x.message}</div>)}
                        </div>
                      )}

                      {form.LoanMethod === 'Hạn mức tín dụng' && (
                        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between text-xs font-semibold ${isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/60 border-sky-500/30 text-sky-200'
                          }`}>
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-sky-500" />
                            <span>TÌNH TRẠNG HẠN MỨC TÍN DỤNG:</span>
                          </div>
                          <div className="flex items-center space-x-4 font-mono">
                            <span>Tổng mức cấp: <strong className="text-sky-600 dark:text-sky-400">{fmtMoney(formGrantedLimit)}</strong></span>
                            <span>• Dư nợ KUNN còn hiệu lực: <strong className="text-amber-600 dark:text-amber-400">{fmtMoney(totalExistingKunnBalance)}</strong></span>
                            <span>• Khả năng giải ngân còn lại: <strong className={
                              formLimitStatus?.expired
                                ? 'text-rose-600 dark:text-rose-400 line-through'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }>{fmtMoney(availableBeforeThisKunn)}</strong></span>
                            {(formLimitStatus?.settledKunnCount ?? 0) > 0 && (
                              <span className="text-[10px] font-sans font-normal text-slate-500">
                                (đã loại {formLimitStatus!.settledKunnCount} KUNN đã tất toán)
                              </span>
                            )}
                          </div>
                          {formLimitStatus?.expired && (
                            <div className="w-full mt-2 pt-2 border-t border-rose-300 dark:border-rose-500/40 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              ⚠️ HĐTD hết hiệu lực ngày {fmtDate(formLimitStatus.endDate)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>THÔNG TIN GIẤY NHẬN NỢ (KUNN) & GIẢI NGÂN LẦN NÀY</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>
                            {form.LoanMethod === 'Hạn mức tín dụng' ? 'Số tiền nhận nợ lần này (KUNN) *' : 'Số tiền giải ngân thực tế (KUNN) *'}
                          </label>
                          <input type="text" value={formLoanAmount}
                            onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
                            placeholder="650.000.000"
                            className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>
                            {formLimitStatus?.revolving === false
                              ? 'Đã nhận nợ trên HĐTD này'
                              : 'Dư nợ HMTD hiện hữu (KUNN còn hiệu lực)'}
                          </label>
                          <input type="text" readOnly value={fmtMoney(totalExistingKunnBalance)}
                            className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-amber-600 dark:text-amber-400 ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Hạn mức HMTD còn lại</label>
                          <input type="text" readOnly value={fmtMoney(remainingHmtdLimit)}
                            className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold ${remainingHmtdLimit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-500'
                              } ${readonlyInputStyle}`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Ngày giải ngân (bắt đầu KUNN)</label>
                          <DateInput value={form.DisbursementDate || ''}
                            onChange={disDate => {
                              const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
                              const kunnEnd = disDate && months > 0 ? addMonthsToDate(disDate, months) : form.KunnDueDate;
                              setForm(f => ({ ...f, DisbursementDate: disDate, KunnDueDate: kunnEnd || f.KunnDueDate }));
                            }}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Thời hạn KUNN</label>
                          {form.LoanMethod === 'Hạn mức tín dụng' ? (
                            <select
                              value={form.KunnTenor || '6 tháng'}
                              onChange={e => {
                                const val = e.target.value;
                                const months = parseKunnTenorMonths(val);
                                const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
                                setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
                              }}
                              className={`w-full rounded-xl p-2.5 text-xs font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                            >
                              {['0 tháng', '3 tháng', '5 tháng', '6 tháng', '9 tháng', '12 tháng'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" value={form.KunnTenor || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const months = parseKunnTenorMonths(val);
                                const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
                                setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
                              }}
                              placeholder="5T / 12 tháng..."
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                          )}
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>
                            <span>Ngày kết thúc KUNN</span>
                          </label>
                          <DateInput readOnly value={form.KunnDueDate || ''}
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 border ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Ngày bắt đầu trả nợ</label>
                          <DateInput value={form.RepaymentStartDate || ''}
                            onChange={val => setForm(f => ({ ...f, RepaymentStartDate: val }))}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          CẤU TRÚC LÃI SUẤT
                        </div>
                        <div className="flex items-center space-x-4 text-xs font-semibold">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="rateMode"
                              checked={interestRateMode === 'pref'}
                              onChange={() => setInterestRateMode('pref')}
                              className="w-3.5 h-3.5 text-rose-600 focus:ring-rose-500"
                            />
                            <span>1. LS Ưu đãi & Sau ưu đãi</span>
                          </label>
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="rateMode"
                              checked={interestRateMode === 'base'}
                              onChange={() => setInterestRateMode('base')}
                              className="w-3.5 h-3.5 text-rose-600 focus:ring-rose-500"
                            />
                            <span>2. LS Thông thường (LSCS + Biên độ)</span>
                          </label>
                        </div>
                      </div>

                      {interestRateMode === 'pref' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Lãi suất ưu đãi (LSUD) %/năm</label>
                            <input type="number" step="0.01" min={0} value={ratePreferential}
                              onChange={e => setRatePreferential(e.target.value)}
                              placeholder="7.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 ${inputStyle}`} />
                          </div>
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Thời gian ưu đãi (tháng)</label>
                            <input type="number" min={0} value={ratePreferentialMonths}
                              onChange={e => setRatePreferentialMonths(e.target.value)}
                              placeholder="6, 12..."
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                          </div>
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Biên độ cộng thêm %/năm</label>
                            <input type="number" step="0.01" value={rateMargin}
                              onChange={e => setRateMargin(e.target.value)}
                              placeholder="3.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-300 ${inputStyle}`} />
                          </div>
                          <div className={`col-span-full space-y-2 p-3 rounded-xl border ${isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/40 border-sky-900/60'
                            }`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={labelStyle}>Lãi suất sau ưu đãi:</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{postPrefRate.toFixed(2)} %/năm</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-sky-200 dark:border-sky-900/50">
                              <span className="font-bold text-sky-700 dark:text-sky-300">👉 LÃI SUẤT ÁP DỤNG (KÈM PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                                {currentActiveRateDisplay.toFixed(2)} %/năm
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Lãi suất cơ sở (LSCS) %/năm</label>
                            <input type="number" step="0.01" min={0} value={rateBase}
                              onChange={e => setRateBase(e.target.value)}
                              placeholder="8.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-rose-500 dark:text-rose-300 ${inputStyle}`} />
                          </div>
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Biên độ cộng thêm %/năm</label>
                            <input type="number" step="0.01" value={rateMargin}
                              onChange={e => setRateMargin(e.target.value)}
                              placeholder="3.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-300 ${inputStyle}`} />
                          </div>
                          <div className={`col-span-full space-y-2 p-3 rounded-xl border ${isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/40 border-sky-900/60'
                            }`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={labelStyle}>Lãi suất thông thường chuẩn (LSCS + Biên độ):</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{normalRate.toFixed(2)} %/năm</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-sky-200 dark:border-sky-900/50">
                              <span className="font-bold text-sky-700 dark:text-sky-300">👉 LÃI SUẤT ÁP DỤNG THỰC TẾ (LSCS + BIÊN ĐỘ + PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                                {currentActiveRateDisplay.toFixed(2)} %/năm
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Phạt cộng thêm do vi phạm điều kiện (+%/năm)</label>
                          <input type="number" step="0.1" min={0} value={rateConditionSurcharge}
                            onChange={e => setRateConditionSurcharge(e.target.value)}
                            placeholder="0.5 (%/năm)..."
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Sàn lãi suất theo hợp đồng (%/năm)</label>
                          <input type="number" step="0.01" min={0} value={rateFloor}
                            onChange={e => setRateFloor(e.target.value)}
                            placeholder="Bỏ trống nếu hợp đồng không quy định"
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold ${inputStyle}`} />
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Chặn lãi thả nổi không tụt dưới mức này khi biên độ âm
                          </div>
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Điều kiện phê duyệt (CASA / BCTC)</label>
                          <div className="text-xs p-2.5 rounded-xl border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-medium">
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sky-600 dark:text-sky-400 text-xs uppercase flex items-center space-x-1.5">
                            <span>📈 LỊCH SỬ ĐIỀU CHỈNH LÃI SUẤT</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {rateHistory.length} đợt điều chỉnh đã lưu
                          </span>
                        </div>

                        {rateHistory.length > 0 && (
                          <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className={tableHeaderStyle}>
                                <tr>
                                  <th className="p-2.5">STT</th>
                                  <th className="p-2.5">NGÀY HẠN HIỆU LỰC</th>
                                  <th className="p-2.5 text-right">LSCS (%)</th>
                                  <th className="p-2.5 text-right">BIÊN ĐỘ (%)</th>
                                  <th className="p-2.5 text-right">PHẠT (%)</th>
                                  <th className="p-2.5 text-right">LÃI SUẤT ÁP DỤNG (%/NĂM)</th>
                                  <th className="p-2.5">NỘI DUNG / LÝ DO ĐIỀU CHỈNH</th>
                                  <th className="p-2.5 text-center">XÓA</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                                {rateHistory.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="p-2.5 font-bold text-center">{idx + 1}</td>
                                    <td className="p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400">{fmtDate(item.effectiveDate)}</td>
                                    <td className="p-2.5 text-right font-mono">{item.baseRatePercent ? `${item.baseRatePercent}%` : '—'}</td>
                                    <td className="p-2.5 text-right font-mono">{item.marginPercent ? `+${item.marginPercent}%` : '—'}</td>
                                    <td className="p-2.5 text-right font-mono text-rose-500 font-bold">{item.penaltyPercent ? `+${item.penaltyPercent}%` : '0%'}</td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                                      {item.ratePercent.toFixed(2)} %/năm
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">{item.reason || 'Điều chỉnh LSCS'}</td>
                                    <td className="p-2.5 text-center">
                                      <button type="button" onClick={() => setRateHistory(rateHistory.filter(h => h.id !== item.id))}
                                        className="text-rose-500 hover:text-rose-700">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
                          <div className="font-bold text-sky-700 dark:text-sky-300 text-xs">
                            + THÊM ĐỢT ĐIỀU CHỈNH LÃI SUẤT MỚI (KHI NGÂN HÀNG THAY ĐỔI LSCS / THẢ NỔI):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                            <div>
                              <label className={`block mb-1 ${labelStyle}`}>Ngày hiệu lực *</label>
                              <DateInput value={newAdjDate} onChange={setNewAdjDate} className={`w-full rounded-xl p-2 ${inputStyle}`} />
                            </div>
                            <div>
                              <label className={`block mb-1 ${labelStyle}`}>LSCS (%)</label>
                              <input type="number" step="0.01" value={newAdjBaseRate} onChange={e => setNewAdjBaseRate(e.target.value)} placeholder="9.2" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                            </div>
                            <div>
                              <label className={`block mb-1 ${labelStyle}`}>Biên độ (%)</label>
                              <input type="number" step="0.01" value={newAdjMargin} onChange={e => setNewAdjMargin(e.target.value)} placeholder="1.35" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                            </div>
                            <div>
                              <label className={`block mb-1 ${labelStyle}`}>Phạt vi phạm (%)</label>
                              <input type="number" step="0.1" value={newAdjPenalty} onChange={e => setNewAdjPenalty(e.target.value)} placeholder="0.5" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                            </div>
                            <div>
                              <label className={`block mb-1 ${labelStyle}`}>Lý do / Nội dung</label>
                              <input type="text" value={newAdjReason} onChange={e => setNewAdjReason(e.target.value)} placeholder="Tăng LSCS T1/2027..." className={`w-full rounded-xl p-2 ${inputStyle}`} />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => {
                              if (!newAdjDate) {
                                showNotify('error', 'Vui lòng chọn Ngày áp dụng hiệu lực!');
                                return;
                              }
                              const b = parseFloat(newAdjBaseRate) || 0;
                              const numOr = (a: string, b: string) => {
                                const x = parseFloat(a);
                                if (!Number.isNaN(x)) return x;
                                const y = parseFloat(b);
                                return Number.isNaN(y) ? 0 : y;
                              };
                              const m = numOr(newAdjMargin, rateMargin);
                              const p = numOr(newAdjPenalty, rateConditionSurcharge);
                              const totalRate = b > 0 ? (b + m + p) : (parseFloat(newAdjBaseRate) || currentActiveRateDisplay);
                              if (totalRate <= 0) {
                                showNotify('error', 'Vui lòng nhập Lãi suất cơ sở hoặc Lãi suất áp dụng!');
                                return;
                              }
                              const newRecord: RateAdjustmentHistoryItem = {
                                id: Date.now().toString(),
                                effectiveDate: newAdjDate,
                                baseRatePercent: b > 0 ? b : undefined,
                                marginPercent: m > 0 ? m : undefined,
                                penaltyPercent: p > 0 ? p : undefined,
                                ratePercent: totalRate,
                                reason: newAdjReason.trim() || 'Điều chỉnh lãi suất kỳ hạn'
                              };
                              const next = [...rateHistory, newRecord].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
                              setRateHistory(next);
                              setNewAdjDate('');
                              setNewAdjBaseRate('');
                              setNewAdjMargin('');
                              setNewAdjPenalty('');
                              setNewAdjReason('');
                              showNotify('success', `Đã thêm đợt điều chỉnh LS ${totalRate.toFixed(2)}%/năm từ ngày ${fmtDate(newAdjDate)}`);
                            }} className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm">
                              <span>+ Thêm đợt điều chỉnh LS này</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        PHƯƠNG THỨC TRẢ NỢ {form.LoanMethod === 'Hạn mức tín dụng' ? '' : '& ÂN HẠN'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Cách thức trả gốc</label>
                          <select value={form.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}
                            disabled={form.LoanMethod === 'Hạn mức tín dụng'}
                            onChange={e => setForm(f => ({ ...f, PrincipalRepaymentMethod: e.target.value }))}
                            className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-950 font-bold text-sky-600 dark:text-sky-400' : ''}`}>
                            {PRINCIPAL_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Cách thức trả lãi</label>
                          <select value={form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế'}
                            disabled={form.LoanMethod === 'Hạn mức tín dụng'}
                            onChange={e => setForm(f => ({ ...f, InterestRepaymentMethod: e.target.value }))}
                            className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-950 font-bold text-sky-600 dark:text-sky-400' : ''}`}>
                            {INTEREST_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      {graceOptions.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Ân hạn gốc (tháng)</label>
                            <select value={form.PrincipalGracePeriodMonths ?? 0}
                              onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`}>
                              <option value={0}>Không ân hạn</option>
                              {graceOptions.map(g => (
                                <option key={g} value={g}>{g} tháng</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Ân hạn lãi (tháng)</label>
                            <input type="number" min={0} value={form.InterestGracePeriodMonths ?? 0}
                              onChange={e => setForm(f => ({ ...f, InterestGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-xl p-3 border text-[11px] ${sectionBoxBg}`}>
                      <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>TÀI SẢN BẢO ĐẢM</span>
                      </div>
                      {selectedCollaterals.length === 0 ? (
                        <div className="text-slate-400 italic">
                          HĐTD chưa gán TSBĐ. Gán ở tab Hợp Đồng Tín Dụng.
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                          {selectedCollaterals.map(col => (
                            <span key={col.Id}>
                              {col.AssetCode || `TS-${col.Id}`}
                              <span className="text-slate-500"> · {fmtMoney(col.AppraisedValue || col.Value || 0)}</span>
                            </span>
                          ))}
                          <span className="text-slate-500">
                            Khả năng bảo đảm tối đa: <strong className="text-emerald-600 dark:text-emerald-400">{fmtMoney(maxAllowedLoanLtv)}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={form.IsSettled ?? false}
                          onChange={e => setForm(f => ({ ...f, IsSettled: e.target.checked }))}
                          className="w-4 h-4 rounded text-sky-600" />
                        <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Hợp đồng đã tất toán</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={form.IsRestructured ?? false}
                          onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
                          className="w-4 h-4 rounded text-sky-600" />
                        <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Hợp đồng đã tái cơ cấu nợ</span>
                      </label>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={(e) => handleSaveContract(e, true)}
                        disabled={loading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-600/30 text-xs flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{loading ? 'Đang lưu...' : 'THÊM MỚI'}</span>
                      </button>

                      {selectedContract && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleSaveContract(e, false)}
                            disabled={loading}
                            className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/30 text-xs flex items-center justify-center space-x-2"
                          >
                            <Save className="w-4 h-4" />
                            <span>{loading ? 'Đang lưu...' : 'CẬP NHẬT KUNN NÀY'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteContract(e, selectedContract.Id, selectedContract.ContractNumber)}
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-rose-600/30 text-xs flex items-center justify-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>XOÁ KUNN</span>
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {mainTab === 'schedule' && (
            <div className="space-y-4">
              <div className={`${containerCardBg} rounded-2xl p-4 border`}>
                <div className="font-bold mb-3 flex items-center space-x-2 text-xs">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <span>CHỌN HỢP ĐỒNG TÍN DỤNG ĐỂ XEM / TẠO LỊCH THU NỢ</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {contracts.map(c => (
                    <button key={c.Id} onClick={() => handleSelectContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${selectedContract?.Id === c.Id
                        ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                        : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-sky-700'
                        }`}>
                      {c.ContractNumber} ({fmtMoney(c.LoanAmount || c.ContractAmount)})
                    </button>
                  ))}
                </div>

                {selectedContract && (
                  <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                      <span>Số tiền KUNN: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount)}</strong></span>
                      <span>Lãi suất hiện hành: <strong className="text-rose-600 dark:text-rose-400 font-mono">{fmtRate(getEffectiveActiveRate(selectedContract))}</strong></span>
                      <span>Thời hạn KUNN: <strong className="text-sky-600 dark:text-sky-400">{selectedContract.KunnTenor || `${selectedContract.LoanTenorMonths || 12} tháng`}</strong></span>
                      <span>Phương thức gốc: <strong className="text-purple-600 dark:text-purple-400">{selectedContract.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}</strong></span>
                      <span>Ngày giải ngân: <strong className="text-amber-600 dark:text-amber-400 font-mono">{fmtDate(selectedContract.DisbursementDate || selectedContract.ContractStartDate)}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
                <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                  <span className="font-bold text-xs">
                    LỊCH THU NỢ {selectedContract ? `— ${selectedContract.ContractNumber}` : ''} ({schedules.length} kỳ)
                  </span>
                  {schedules.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Đã TT: {schedules.filter(s => s.IsPaid).length} kỳ</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Chờ TT: {schedules.filter(s => !s.IsPaid).length} kỳ</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  {(() => {
                    const getPenaltyForSchedule = (s: RepaymentSchedule) => {
                      if (s.IsPaid) return s.OverdueInterestAmount || 0;
                      let autoDays = 0;
                      if (s.DueDate) {
                        const parts = s.DueDate.split('-');
                        if (parts.length === 3) {
                          const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          due.setHours(0, 0, 0, 0);
                          const diff = today.getTime() - due.getTime();
                          if (diff > 0) autoDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        }
                      }
                      const effDays = (s.OverdueDays && s.OverdueDays > 0) ? s.OverdueDays : autoDays;
                      if (effDays <= 0) return 0;
                      const annualRate = getEffectiveActiveRate(selectedContract, s.DueDate);
                      return Math.round((s.PrincipalAmount || 0) * (annualRate * 1.5) * (effDays / 365));
                    };

                    const totalPenaltySum = schedules.reduce((a, s) => a + getPenaltyForSchedule(s), 0);

                    return (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className={`sticky top-0 ${tableHeaderStyle}`}>
                          <tr>
                            <th className="p-3 text-center whitespace-nowrap">KỲ</th>
                            <th className="p-3 whitespace-nowrap">NGÀY ĐẾN HẠN</th>
                            <th className="p-3 text-center whitespace-nowrap text-purple-600 dark:text-purple-400">LÃI SUẤT ÁP DỤNG</th>
                            <th className="p-3 text-center whitespace-nowrap text-rose-500">SỐ NGÀY QUÁ HẠN</th>
                            <th className="p-3 text-right whitespace-nowrap">GỐC PHẢI TRẢ</th>
                            <th className="p-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">GỐC ĐÃ TRẢ</th>
                            <th className="p-3 text-right whitespace-nowrap">LÃI THƯỜNG</th>
                            <th className="p-3 text-right whitespace-nowrap text-rose-500">LÃI PHẠT QUÁ HẠN</th>
                            <th className="p-3 text-right whitespace-nowrap">TỔNG NGHĨA VỤ TRẢ</th>
                            <th className="p-3 text-center whitespace-nowrap">TRẠNG THÁI</th>
                            <th className="p-3 whitespace-nowrap">NGÀY TT</th>
                            <th className="p-3 text-center whitespace-nowrap">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                          {!selectedContract ? (
                            <tr><td colSpan={12} className="text-center p-8 text-slate-400">Chọn một HĐTD để xem lịch thu nợ</td></tr>
                          ) : schedules.length === 0 ? (
                            <tr><td colSpan={12} className="text-center p-8 text-slate-400">
                              Chưa có lịch thu nợ. Nhấn "TẠO LỊCH THU NỢ TỰ ĐỘNG" để tính toán.
                            </td></tr>
                          ) : schedules.map(s => {
                            let autoOverdue = 0;
                            if (!s.IsPaid && s.DueDate) {
                              const parts = s.DueDate.split('-');
                              if (parts.length === 3) {
                                const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                due.setHours(0, 0, 0, 0);
                                const diff = today.getTime() - due.getTime();
                                if (diff > 0) autoOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
                              }
                            }

                            const effectiveOverdueDays = s.IsPaid
                              ? (s.OverdueDays || 0)
                              : ((s.OverdueDays && s.OverdueDays > 0) ? s.OverdueDays : autoOverdue);
                            const penaltyAmount = s.OverdueInterestAmount ?? getPenaltyForSchedule(s);
                            const isOverdue = effectiveOverdueDays > 0;
                            const rowTotalAmount = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penaltyAmount;
                            const isPrepayRow = (s.PrepaidPrincipalAmount && s.PrepaidPrincipalAmount > 0) || s.Note?.includes('TRẢ TRƯỚC HẠN');

                            const rateSegs = periodRateSegments[s.Id] || [];
                            const activeRatePercentStr = rateSegs.length > 0
                              ? formatSegmentsLabel(rateSegs) + '/năm'
                              : (getEffectiveActiveRate(selectedContract, s.DueDate) * 100).toFixed(2) + '%/năm';
                            const isForecastRate = rateSegs.some(x => x.forecast);
                            const rateBreakdown = rateSegs.length > 1
                              ? rateSegs.map(x => `${x.days} ngày @ ${x.ratePercent.toFixed(2).replace('.', ',')}% (${x.label})`).join('  +  ')
                              : (rateSegs[0]?.label || '');

                            return (
                              <tr key={s.Id} className={`transition-colors ${isPrepayRow
                                ? 'bg-amber-500/10 dark:bg-amber-500/20 font-semibold border-l-4 border-amber-500'
                                : s.IsPaid
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                                  : isOverdue
                                    ? 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold'
                                    : tableRowHover
                                }`}>
                                <td className="p-3 text-center font-bold font-mono">#{s.PeriodNumber}</td>
                                <td className="p-3 font-mono font-bold">{fmtDate(s.DueDate)}</td>
                                <td className="p-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20 rounded-lg"
                                  title={rateBreakdown || undefined}>
                                  <div className={rateSegs.length > 1 ? 'whitespace-nowrap' : ''}>
                                    {activeRatePercentStr}
                                  </div>
                                  {isForecastRate && (
                                    <div className="text-[9px] font-sans font-normal text-slate-400 uppercase tracking-wide">dự phóng</div>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono font-bold">
                                  {effectiveOverdueDays > 0 ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold shadow-sm">
                                      {effectiveOverdueDays} ngày
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono font-bold">
                                  {(s.PrincipalAmount || 0).toLocaleString('vi-VN')}
                                  {s.PrepaidPrincipalAmount ? (
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                      gồm trả trước hạn {s.PrepaidPrincipalAmount.toLocaleString('vi-VN')}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                  {(() => {
                                    const phaiTra = s.PrincipalAmount || 0;
                                    const daTra = paidPrincipalOf(s);
                                    if (daTra === 0) {
                                      return <span className="text-slate-400 font-normal">—</span>;
                                    }
                                    const thieu = phaiTra - daTra;
                                    return (
                                      <>
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          {daTra.toLocaleString('vi-VN')}
                                        </span>
                                        {thieu > 0 && (
                                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                                            còn thiếu {thieu.toLocaleString('vi-VN')}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </td>
                                <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono font-bold">{(s.InterestAmount || 0).toLocaleString('vi-VN')}</td>
                                <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono font-bold">
                                  {penaltyAmount > 0 ? penaltyAmount.toLocaleString('vi-VN') : '—'}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{rowTotalAmount.toLocaleString('vi-VN')}</td>
                                <td className="p-3 text-center">
                                  {s.IsPaid ? (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      ✓ Đã TT {effectiveOverdueDays > 0 ? `(Trễ ${effectiveOverdueDays}d)` : ''}
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white border border-rose-500 animate-pulse">
                                      🔴 Quá {effectiveOverdueDays}d
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      🟡 Chờ TT
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">{s.IsPaid ? fmtDate(s.PaymentDate) : '—'}</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openPaymentModal(s);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1 border ${s.IsPaid
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                      : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-sky-600/20'
                                      }`}>
                                    <span>⚙️ Ghi nhận TT / Sửa</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {schedules.length > 0 && (
                          <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                            <tr>
                              <td className="p-3 text-center" colSpan={4}>TỔNG CỘNG LỊCH THU NỢ</td>
                              <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">
                                {schedules.reduce((a, s) => a + (s.PrincipalAmount || 0), 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                                {schedules.reduce((a, s) => a + paidPrincipalOf(s), 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono">
                                {schedules.reduce((a, s) => a + (s.InterestAmount || 0), 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                                {totalPenaltySum.toLocaleString('vi-VN')}
                              </td>
                              <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                {(schedules.reduce((a, s) => a + (s.PrincipalAmount || 0) + (s.InterestAmount || 0), 0) + totalPenaltySum).toLocaleString('vi-VN')}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    );
                  })()}
                </div>

                {selectedContract && (
                  <DebtSummaryCard
                    selectedContract={selectedContract}
                    schedules={schedules}
                    allSchedulesMap={allSchedulesMap}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {editingSchedule && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className={`${containerCardBg} w-full max-w-xl rounded-2xl border shadow-2xl p-5 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  GHI NHẬN THANH TOÁN & QUÁ HẠN — KỲ #{editingSchedule.PeriodNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 grid grid-cols-2 gap-3 text-xs">
              <div>Ngày đến hạn kỳ: <strong className="font-mono text-slate-900 dark:text-slate-100">{fmtDate(editingSchedule.DueDate)}</strong></div>
              <div>Gốc quy định: <strong className="font-mono text-sky-600 dark:text-sky-400">{editingSchedule.PrincipalAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
              <div>Lãi quy định: <strong className="font-mono text-amber-600 dark:text-amber-400">{editingSchedule.InterestAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
              <div>Tổng nghĩa vụ chuẩn: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{(editingSchedule.PrincipalAmount + editingSchedule.InterestAmount).toLocaleString('vi-VN')} VNĐ</strong></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-sky-600 dark:text-sky-400 mb-1">
                    Gốc đã đóng kỳ này (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={modalActualPaidPrincipalStr}
                    onChange={e => setModalActualPaidPrincipalStr(formatMoneyInput(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    Lãi đã đóng kỳ này (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={modalActualPaidInterestStr}
                    onChange={e => setModalActualPaidInterestStr(formatMoneyInput(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                    Trả nợ gốc trước hạn kỳ này (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={modalPrepaidPrincipalStr}
                    onChange={e => setModalPrepaidPrincipalStr(formatMoneyInput(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                    Số ngày quá hạn (ngày)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalOverdueDaysStr}
                    onChange={e => {
                      const days = parseInt(e.target.value, 10) || 0;
                      setModalOverdueDaysStr(e.target.value);
                      if (days > 0 && selectedContract) {
                        const rate = getEffectiveActiveRate(selectedContract, editingSchedule.DueDate);
                        const calcPen = Math.round((editingSchedule.PrincipalAmount || 0) * (rate * 1.5) * (days / 365));
                        setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                      } else {
                        setModalOverdueInterestStr('0');
                      }
                    }}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                    Lãi phạt quá hạn 150% (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={modalOverdueInterestStr}
                    onChange={e => setModalOverdueInterestStr(formatMoneyInput(e.target.value))}
                    className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Ngày thanh toán thực tế
                  </label>
                  <DateInput
                    value={modalPaymentDate}
                    onChange={(newDate) => {
                      setModalPaymentDate(newDate);
                      if (editingSchedule && newDate) {
                        const calcDays = calculateOverdueDaysFromDates(newDate, editingSchedule.DueDate);
                        setModalOverdueDaysStr(calcDays.toString());
                        if (calcDays > 0 && selectedContract) {
                          const rate = getEffectiveActiveRate(selectedContract, editingSchedule.DueDate);
                          const calcPen = Math.round((editingSchedule.PrincipalAmount || 0) * (rate * 1.5) * (calcDays / 365));
                          setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                        } else {
                          setModalOverdueInterestStr('0');
                        }
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border text-xs bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalIsPaid}
                  onChange={e => setModalIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Xác nhận Kỳ #{editingSchedule.PeriodNumber} đã thanh toán
                </span>
              </label>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePaymentModal}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Đang lưu...' : 'LƯU CẬP NHẬT KỲ THU NỢ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
