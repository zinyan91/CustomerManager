import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI, deleteContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI,
  fetchCollateralsByCustomerAPI, deleteRepaymentSchedulesByContractAPI
} from '../../lib/api';
import { formatMoneyInput, fmtDate, getContractRateHistory, getEffectiveActiveRate, getMasterHdtdNumber } from '../../lib/utils';
import {
  addMonthsToDate, parseKunnTenorMonths, parseDateParts,
  generateSchedule, calculateOverdueDaysFromDates,
  getAutoDebtGroupInfo, recalculateSchedules, computeOutstandingBalance
} from '../../lib/loanMath';
import { getEffectiveLtv } from '../../lib/collateralMath';
import { computeCreditLimit, checkCollateralCapacity } from '../../lib/creditLimit';
import type { LoanContract, Customer, RepaymentSchedule, Collateral, RateAdjustmentHistoryItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  Search, FileText, Receipt, Calendar, CheckCircle, AlertCircle,
  Plus, X, ShieldCheck, DollarSign, Building2, Save, Trash2
} from 'lucide-react';
import { DateInput } from '../DateInput';
import { CustomerSearchBar } from '../portfolio/CustomerSearchBar';
import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';
import { MasterHdtdFilterTabs } from '../portfolio/MasterHdtdFilterTabs';
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

const LOAN_PURPOSE_TYPES = ['Kinh doanh', 'Tiêu dùng', 'Sửa chữa nhà', 'Mua bất động sản', 'Khác'];

const fmtMoney = (v?: number | null) => v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' VNĐ' : '—';
const fmtRate = (v?: number | null) => v !== undefined && v !== null ? (v * 100).toFixed(2) + '%/năm' : '—';


export const LoanPortfolioView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Search state
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContract, setSearchContract] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Dropdown quick-pick: all customers
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Result state
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);

  // Main UI Tab & Form visibility
  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [showForm, setShowForm] = useState(false);

  // Rate adjustment history state (Lãi suất thả nổi nhiều lần)
  const [rateHistory, setRateHistory] = useState<RateAdjustmentHistoryItem[]>([]);
  const [newAdjDate, setNewAdjDate] = useState('');
  const [newAdjBaseRate, setNewAdjBaseRate] = useState('');
  const [newAdjMargin, setNewAdjMargin] = useState('');
  const [newAdjPenalty, setNewAdjPenalty] = useState('');
  const [newAdjReason, setNewAdjReason] = useState('');

  // Master HĐTD Filter state ('ALL' or specific master contract number)
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('ALL');

  // Repayment Schedules map for all contracts (contractId -> RepaymentSchedule[])
  const [allSchedulesMap, setAllSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});

  // Tự động phân loại nhóm nợ (1-5) theo chuẩn NHNN dựa trên số ngày quá hạn lịch thu nợ

  // Trích xuất Số HĐTD Gốc chuẩn từ LoanContract
  // Tự động nhảy số KUNN (/GNN-01, /GNN-02...) khi gõ hoặc chọn Số HĐTD Gốc
  const handleHdtdNumberChange = (val: string) => {
    setFormHdtdNumber(val);
    const trimmed = val.trim();
    if (trimmed) {
      const existingCount = contracts.filter(c => getMasterHdtdNumber(c).toLowerCase() === trimmed.toLowerCase()).length;
      const nextIndex = (existingCount + 1).toString().padStart(2, '0');
      setFormKunnNumber(`${trimmed}/GNN-${nextIndex}`);
    } else {
      setFormKunnNumber('');
    }
  };

  // Form state (HĐTD + KUNN + Lãi suất + Phương thức trả nợ)
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

  // Selected Collateral IDs for current contract
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);

  // Schedule payment edit modal state
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

  // Load all customers for dropdown on mount & sort A-Z
  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setAllCustomers(list);
    }).catch(() => {});
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

  // Auto-calculate End Dates when Effective Date / Disbursement Date / Tenor changes
  useEffect(() => {
    if (form.ContractStartDate && form.LoanTenorMonths) {
      const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
      if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
        setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
      }
    }
  }, [form.ContractStartDate, form.LoanTenorMonths]);

  // Auto-calculate KUNN Due Date REACTIVELY whenever DisbursementDate or KunnTenor changes
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

  // Tính xem HĐTD/KUNN hiện tại đã hết thời gian ưu đãi chưa
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

  // Lãi suất áp dụng thực tế (kèm phạt vi phạm điều kiện)
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

  // Sum of existing KUNNs belonging ONLY to the current HĐTD (excluding selectedContract if editing)
  const effectiveFormHdtdNo = formHdtdNumber.trim() || (selectedContract ? getMasterHdtdNumber(selectedContract) : '');
  const totalExistingKunnBalance = contracts
    .filter(c => {
      if (selectedContract && c.Id === selectedContract.Id) return false;
      if (!effectiveFormHdtdNo) return false;
      return getMasterHdtdNumber(c).toLowerCase() === effectiveFormHdtdNo.toLowerCase();
    })
    .reduce((acc, c) => acc + (c.LoanAmount || c.CurrentBalance || 0), 0);

  // Remaining HMTD Credit Limit for this specific HĐTD = Credit Limit of this HĐTD - (Existing KUNNs of this HĐTD + Current KUNN)
  const remainingHmtdLimit = Math.max(0, creditLimitNum - totalExistingKunnBalance - kunnLoanAmountNum);

  // Filtered dropdown list for quick pick (Loads ALL customers without 30-item limit)
  const dropdownFiltered = dropdownQuery.trim().length < 1
    ? allCustomers
    : allCustomers.filter(c =>
        c.FullName.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
        c.CifKh.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
        (c.NationalId || '').includes(dropdownQuery)
      );

  const loadAllSchedulesForContracts = async (cons: LoanContract[]) => {
    const map: Record<number, RepaymentSchedule[]> = {};
    await Promise.all(cons.map(async (c) => {
      try {
        const schs = await fetchRepaymentSchedulesAPI(c.Id);
        map[c.Id] = schs;
      } catch {}
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

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCif.trim() && !searchName.trim() && !searchContract.trim()) {
      showNotify('error', 'Nhập ít nhất 1 thông tin để tìm kiếm!');
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
      showNotify('error', `Lỗi tìm kiếm: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // ─── LOAN METHOD SELECTION & REPAYMENT DEFAULTS ────────────────────────────
  const handleLoanMethodChange = (method: string) => {
    let pRepay = form.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ';
    let iRepay = form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế';

    if (method === 'Hạn mức tín dụng') {
      pRepay = 'Gốc trả cuối kỳ';
      iRepay = 'Trả hàng tháng theo dư nợ thực tế';
    } else if (method === 'Cho vay từng lần' || method === 'Hạn mức tín dụng từng lần') {
      pRepay = 'Trả đều hàng tháng';
      iRepay = 'Trả hàng tháng theo dư nợ thực tế';
    } else if (method === 'Cầm cố sổ tiết kiệm') {
      pRepay = 'Gốc trả cuối kỳ';
      iRepay = 'Trả cuối kỳ';
    } else if (method === 'Hạn mức thẻ tín dụng') {
      pRepay = 'Thanh toán dư nợ tối thiểu hàng tháng';
      iRepay = 'Tính theo sao kê hàng tháng';
    }

    setForm(prev => ({
      ...prev,
      LoanMethod: method,
      PrincipalRepaymentMethod: pRepay,
      InterestRepaymentMethod: iRepay,
    }));
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
    setFormHdtdNumber(getMasterHdtdNumber(c));
    setFormKunnNumber(c.ContractNumber || '');

    setForm({
      Id: c.Id,
      CustomerId: c.CustomerId,
      ContractNumber: c.ContractNumber,
      HdtdDueDate: (c.HdtdDueDate && /^\d{4}-\d{2}-\d{2}$/.test(c.HdtdDueDate)) ? c.HdtdDueDate : null,
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

    setRatePreferential(c.PreferentialRate ? Number((c.PreferentialRate * 100).toFixed(4)).toString() : '');
    setRatePreferentialMonths(c.PreferentialPeriodMonths ? c.PreferentialPeriodMonths.toString() : '');
    setRateBase(c.BaseRate ? Number((c.BaseRate * 100).toFixed(4)).toString() : '');
    setRateMargin(c.MarginRate ? Number((c.MarginRate * 100).toFixed(4)).toString() : '');

    // Migration 06 đã đưa PenaltySurcharge từ Note về cột riêng
    if (c.PenaltySurcharge != null && c.PenaltySurcharge > 0) {
      setRateConditionSurcharge(c.PenaltySurcharge.toString());
    } else {
      setRateConditionSurcharge('0');
    }

    const history = getContractRateHistory(c);
    setRateHistory(history);

    // Migration 06 đã đưa CollateralIds từ Note về cột riêng (39 hợp đồng)
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
    setSelectedContract(null);
    setSchedules([]);
    const defaultMethod = LOAN_METHODS[0];

    // Lấy HĐTD được lọc hiện tại hoặc HĐTD hạn mức mặc định
    let masterHdtd = selectedMasterFilter !== 'ALL' ? selectedMasterFilter : '';
    let master = contracts.find(c => getMasterHdtdNumber(c) === masterHdtd);
    
    if (!masterHdtd) {
      master = contracts.find(c => c.LoanMethod === 'Hạn mức tín dụng') || (contracts.length > 0 ? contracts[0] : undefined);
      if (master) masterHdtd = getMasterHdtdNumber(master);
    }

    let suggestedKunnNumber = '';
    if (masterHdtd) {
      const existingKunnCount = contracts.filter(c => getMasterHdtdNumber(c).toLowerCase() === masterHdtd.toLowerCase()).length;
      const nextKunnIndex = (existingKunnCount + 1).toString().padStart(2, '0');
      suggestedKunnNumber = `${masterHdtd}/GNN-${nextKunnIndex}`;
    } else {
      suggestedKunnNumber = 'HĐTD-01/GNN-01';
    }

    setFormHdtdNumber(masterHdtd);
    setFormKunnNumber(suggestedKunnNumber);

    setForm({
      CustomerId: foundCustomer?.Id,
      ContractType: master ? master.ContractType : 0,
      LoanMethod: master ? master.LoanMethod : defaultMethod,
      DebtGroup: master ? master.DebtGroup : 1,
      ContractNumber: suggestedKunnNumber,
      HdtdDueDate: null,
      ContractStartDate: master ? master.ContractStartDate : '',
      ContractEndDate: master ? master.ContractEndDate : '',
      LoanTenorMonths: master ? master.LoanTenorMonths : 12,
      PrincipalRepaymentMethod: master ? master.PrincipalRepaymentMethod : 'Gốc trả cuối kỳ',
      InterestRepaymentMethod: master ? master.InterestRepaymentMethod : 'Trả hàng tháng theo dư nợ thực tế',
      PrincipalGracePeriodMonths: 0,
      InterestGracePeriodMonths: 0,
      LoanPurposeType: master ? master.LoanPurposeType : '',
      LoanPurpose: master ? master.LoanPurpose : '',
      IsSettled: false,
      IsRestructured: false
    });

    if (master && master.LoanMethod === 'Hạn mức tín dụng') {
      setFormCreditLimit(master.ContractAmount ? master.ContractAmount.toLocaleString('vi-VN') : '');
    } else {
      setFormCreditLimit('');
    }

    // Kế thừa mã HMTD từ hợp đồng gốc — KUNN mới thuộc cùng hạn mức đã duyệt
    setFormCreditLimitCode(master?.CreditLimitCode || '');
    setFormCreditLimitAmount(master?.CreditLimitAmount ? master.CreditLimitAmount.toLocaleString('vi-VN') : '');

    setFormLoanAmount('');
    setFormCurrentBalance('');
    setRatePreferential(master?.PreferentialRate ? (master.PreferentialRate * 100).toString() : '');
    setRatePreferentialMonths(master?.PreferentialPeriodMonths ? master.PreferentialPeriodMonths.toString() : '');
    setRateBase(master?.BaseRate ? (master.BaseRate * 100).toString() : '');
    setRateMargin(master?.MarginRate ? (master.MarginRate * 100).toString() : '');
    setSelectedCollateralIds(master?.CollateralId ? [master.CollateralId] : []);
    setShowForm(true);
  };

  const handleSaveContract = async (e: React.FormEvent, forceInsert: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const targetCustomerId = foundCustomer?.Id || form.CustomerId;
      if (!targetCustomerId) {
        showNotify('error', 'Vui lòng chọn hoặc tìm kiếm Khách hàng vay trước!');
        setLoading(false);
        return;
      }

      // REQUEST 5: Bắt lỗi nếu không chọn TSBĐ liên kết
      if (selectedCollateralIds.length === 0) {
        showNotify('error', '⚠️ BẮT BUỘC CHỌN TẢI SẢN BẢO ĐẢM! Vui lòng chọn ít nhất 01 Tài sản bảo đảm liên kết với HĐTD/KUNN này!');
        setLoading(false);
        return;
      }

      const hdtd = formHdtdNumber.trim();
      let kunn = formKunnNumber.trim();

      // Nếu không nhập số KUNN, tự động sinh số KUNN = hdtd/GNN-01, /GNN-02...
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

      // REQUEST 2: Helper cleanDate làm sạch ngày tháng (chuyển "" thành null để tránh lỗi Postgres syntax)
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

        // Mã HMTD dùng chung: các HĐTD cùng mã chỉ tính hạn mức MỘT lần
        CreditLimitCode: formCreditLimitCode.trim() || null,
        CreditLimitAmount: formCreditLimitCode.trim()
          ? (parseFloat(formCreditLimitAmount.replace(/\./g, '').replace(',', '.')) || null)
          : null,

        PreferentialRate: prefDec,
        PreferentialPeriodMonths: parseInt(ratePreferentialMonths) || undefined,
        BaseRate: baseDec,
        MarginRate: marginDec,
        PostPreferentialRate: postPrefDec,
        NormalRate: normalDec,
        InterestRate: activeInterestRate,

        CollateralId: selectedCollateralIds.length > 0 ? selectedCollateralIds[0] : null,
      };

      // Force insert (create new KUNN) or when no contract selected
      if (forceInsert || !selectedContract) {
        delete payload.Id;

        // ─── RÀNG BUỘC: Kiểm tra dư nợ KUNN không vượt quá Hạn mức tín dụng của HĐTD này ───
        const targetHdtdNo = formHdtdNumber.trim() || (selectedContract ? getMasterHdtdNumber(selectedContract) : '');
        const targetGroup = masterHdtdGroups.find(g => g.masterNo.toLowerCase() === targetHdtdNo.toLowerCase());
        const specificMasterLimit = creditLimit > 0 ? creditLimit : (targetGroup?.totalCreditLimit || 0);

        if (form.LoanMethod === 'Hạn mức tín dụng' && loanAmount && specificMasterLimit > 0) {
          const existingKunnTotal = contracts
            .filter(c => {
              if (selectedContract && c.Id === selectedContract.Id && !forceInsert) return false;
              return targetHdtdNo ? getMasterHdtdNumber(c).toLowerCase() === targetHdtdNo.toLowerCase() : false;
            })
            .reduce((sum, c) => sum + (c.LoanAmount || 0), 0);
          const newTotal = existingKunnTotal + loanAmount;
          const remaining = Math.max(0, specificMasterLimit - existingKunnTotal);

          if (newTotal > specificMasterLimit) {
            showNotify('error',
              `❌ VƯỢT HẠN MỨC HĐTD (${targetHdtdNo || 'này'})! Hạn mức HĐTD này: ${specificMasterLimit.toLocaleString('vi-VN')} VNĐ | ` +
              `KUNN hiện hữu của HĐTD này: ${existingKunnTotal.toLocaleString('vi-VN')} VNĐ | ` +
              `HMTD còn lại: ${remaining.toLocaleString('vi-VN')} VNĐ | ` +
              `Số tiền KUNN đang nhập: ${loanAmount.toLocaleString('vi-VN')} VNĐ — ` +
              `Không thể tạo KUNN mới vì vượt hạn mức HĐTD này!`
            );
            setLoading(false);
            return;
          }
        }
      }

      const savedContract = await saveContractAPI(payload);

      // Tự động khởi tạo hoặc cập nhật lại lịch thu nợ theo ngày bắt đầu trả nợ mới / thời hạn mới
      const existingScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
      const repayStartDate = savedContract.RepaymentStartDate || savedContract.DisbursementDate || savedContract.ContractStartDate;
      const periods = parseKunnTenorMonths(savedContract.KunnTenor) || savedContract.LoanTenorMonths || 12;
      const isBullet = (savedContract.PrincipalRepaymentMethod ?? 'Gốc trả cuối kỳ') === 'Gốc trả cuối kỳ' || savedContract.LoanMethod === 'Hạn mức tín dụng';
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
            history
          );
          await bulkSaveRepaymentSchedulesAPI(generated);
          const newScheds = await fetchRepaymentSchedulesAPI(savedContract.Id);
          setSchedules(newScheds);
          setAllSchedulesMap(prev => ({ ...prev, [savedContract.Id]: newScheds }));
        } else {
          // Cập nhật lại ngày đến hạn (DueDate) cho từng kỳ theo Ngày bắt đầu trả nợ mới
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

      showNotify('success', (forceInsert || !selectedContract) ? 'Đã TẠO MỚI thành công Giấy nhận nợ (KUNN) & tự động lập Lịch thu nợ!' : 'Đã CẬP NHẬT thông tin KUNN/HĐTD!');

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
          // Reset selection so user can immediately create next KUNN without overwriting
          setSelectedContract(null);
        }
      }
    } catch (err: any) {
      showNotify('error', `Lỗi lưu HĐTD: ${err.message}`);
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
      showNotify('success', `Đã xóa Hợp đồng Tín dụng / KUNN "${contractNumber}" thành công!`);
      if (selectedContract?.Id === contractId) {
        setSelectedContract(null);
        setShowForm(false);
      }
      if (foundCustomer) {
        const refreshed = await fetchContractsByCustomerAPI(foundCustomer.Id);
        setContracts(refreshed);
      }
    } catch (err: any) {
      showNotify('error', `Lỗi xóa HĐTD: ${err.message}`);
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
      TotalAmount: (modalIsPaid ? actualPaidP : editingSchedule.PrincipalAmount) + (modalIsPaid ? actualPaidI : editingSchedule.InterestAmount) + overdueInterest,
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

      const totalPaidP = refreshed.filter(x => x.IsPaid).reduce((sum, x) => sum + (x.ActualPaidPrincipal || x.PrincipalAmount || 0), 0);
      const origLoan = selectedContract.LoanAmount || selectedContract.ContractAmount || 0;
      const newBal = Math.max(0, origLoan - totalPaidP);

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
      showNotify('error', `Lỗi lưu thông tin kỳ trả nợ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get effective LTV percentage for a collateral item (default 70% if unassigned)

  // Compute total Appraised Collateral Value & Max Allowed Loan based on LTV
  const selectedCollaterals = collaterals.filter(c => selectedCollateralIds.includes(c.Id));
  const totalAppraisedValue = selectedCollaterals.reduce((sum, c) => sum + (c.AppraisedValue || c.Value || 0), 0);

  const maxAllowedLoanLtv = selectedCollaterals.reduce((sum, c) => {
    const val = c.AppraisedValue || c.Value || 0;
    const ltv = getEffectiveLtv(c);
    return sum + (val * ltv / 100);
  }, 0);

  const formCurrentBalNum = parseFloat(formCurrentBalance.replace(/\./g, '').replace(',', '.')) || 0;
  const formLoanAmountNum = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || 0;
  const currentFormCreditLimitNum = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;

  // LTV khoản vay được tính dựa trên Dư nợ thực tế hiện hữu (hoặc Số tiền nhận nợ KUNN giải ngân thực tế), giảm dần khi gốc giảm
  const effectiveLtvLoanAmount = (formCurrentBalNum > 0)
    ? formCurrentBalNum
    : (formLoanAmountNum > 0 ? formLoanAmountNum : currentFormCreditLimitNum);

  const isLtvExceeded = selectedCollateralIds.length > 0 && maxAllowedLoanLtv > 0 && effectiveLtvLoanAmount > maxAllowedLoanLtv;

  // Gom nhóm danh sách KUNN theo HĐTD Gốc & tính toán Tổng mức cấp chính xác
  const masterHdtdGroups = useMemo(() => {
    const map = new Map<string, {
      masterNo: string;
      contracts: LoanContract[];
      masterContract: LoanContract | null;
      totalCreditLimit: number;
      totalKunnDisbursed: number;
      remainingLimit: number;
    }>();

    for (const c of contracts) {
      const masterNo = getMasterHdtdNumber(c);
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
      group.totalKunnDisbursed += (c.LoanAmount || 0);
    }

    for (const group of map.values()) {
      if (group.totalCreditLimit === 0 && group.contracts.length > 0) {
        group.totalCreditLimit = group.contracts[0].ContractAmount || group.contracts[0].LoanAmount || 0;
      }
      group.remainingLimit = Math.max(0, group.totalCreditLimit - group.totalKunnDisbursed);
    }

    return Array.from(map.values());
  }, [contracts]);

  const getEffectiveBalanceForContract = (c: LoanContract) =>
    computeOutstandingBalance(allSchedulesMap[c.Id], c);

  // Lọc danh sách KUNN theo bộ lọc Master HĐTD được chọn
  const filteredContracts = useMemo(() => {
    if (selectedMasterFilter === 'ALL') return contracts;
    return contracts.filter(c => getMasterHdtdNumber(c) === selectedMasterFilter);
  }, [contracts, selectedMasterFilter]);

  // Thống kê Tài chính theo Bộ lọc HĐTD (Tự động trừ đi số tiền gốc đã thanh toán)
  const summaryFinancials = useMemo(() => {
    if (selectedMasterFilter === 'ALL') {
      // Các HĐTD dùng chung một mã HMTD chỉ được tính MỘT lần (TH2).
      // Trước đây cộng mức cấp của từng nhóm HĐTD nên bị cộng đôi.
      const totalCredit = computeCreditLimit(contracts).total;
      const totalDisbursed = contracts.reduce((sum, c) => sum + getEffectiveBalanceForContract(c), 0);
      const totalRemaining = Math.max(0, totalCredit - totalDisbursed);
      return { totalCredit, totalDisbursed, totalRemaining };
    } else {
      const group = masterHdtdGroups.find(g => g.masterNo === selectedMasterFilter);
      if (!group) return { totalCredit: 0, totalDisbursed: 0, totalRemaining: 0 };
      const totalDisbursed = group.contracts.reduce((sum, c) => sum + getEffectiveBalanceForContract(c), 0);
      return {
        totalCredit: group.totalCreditLimit,
        totalDisbursed,
        totalRemaining: Math.max(0, group.totalCreditLimit - totalDisbursed)
      };
    }
  }, [contracts, masterHdtdGroups, selectedMasterFilter, allSchedulesMap]);

  // Chốt kiểm soát: tổng mức cấp của các HĐTD cùng thế chấp một tài sản
  // không được vượt hạn mức tối đa theo LTV của tài sản đó.
  const capacityWarnings = useMemo(
    () => checkCollateralCapacity(contracts, collaterals).filter(w => w.exceeded),
    [contracts, collaterals]
  );

  const totalCreditLimit = summaryFinancials.totalCredit;
  const totalKunnAmount = summaryFinancials.totalDisbursed;
  const remainingCreditLimit = summaryFinancials.totalRemaining;

  // Dynamic Theme Classes
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
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── SEARCH BOX ── */}
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

      {/* ── NO RESULT YET ── */}
      {!foundCustomer && !isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="text-sm">Nhập thông tin hoặc Chọn nhanh Khách hàng từ danh sách để bắt đầu</p>
        </div>
      )}

      {/* ── RESULTS & MAIN DASHBOARD ── */}
      {foundCustomer && (
        <div className="space-y-4">
          {/* Customer Header summary card */}
          <CustomerSummaryHeader
            foundCustomer={foundCustomer}
            collaterals={collaterals}
            isLight={isLight}
            containerCardBg={containerCardBg}
            selectedMasterFilter={selectedMasterFilter}
            totalCreditLimit={totalCreditLimit}
            totalKunnAmount={totalKunnAmount}
            remainingCreditLimit={remainingCreditLimit}
            handleNewContract={handleNewContract}
          />

          {/* ── CẢNH BÁO: TỔNG MỨC CẤP VƯỢT KHẢ NĂNG BẢO ĐẢM CỦA TSĐB ── */}
          {capacityWarnings.length > 0 && (
            <div className="rounded-2xl border border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cảnh báo: Tổng mức cấp vượt khả năng bảo đảm</span>
              </div>
              {capacityWarnings.map(w => (
                <div key={w.collateralIds.join('-')} className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  {w.collateralIds.length > 1 ? `${w.collateralIds.length} TSĐB` : 'TSĐB'}{' '}
                  <strong className="font-mono">{w.assetCodes.join(', ')}</strong> —
                  tổng hạn mức tối đa theo LTV <strong>{fmtMoney(w.capacity)}</strong>,
                  nhưng tổng mức cấp của {w.contractNumbers.length} hợp đồng đang là{' '}
                  <strong>{fmtMoney(w.granted)}</strong>, vượt{' '}
                  <strong className="text-rose-600 dark:text-rose-400">{fmtMoney(w.excessAmount)}</strong>.
                  <div className="opacity-70 mt-0.5">
                    Hợp đồng liên quan: {w.contractNumbers.join(' · ')}
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-amber-700/80 dark:text-amber-400/70 pt-1 border-t border-amber-400/30">
                Kiểm tra lại mức cấp trên từng hợp đồng. Nếu các hợp đồng dùng chung một hạn mức được duyệt,
                hãy khai cùng một Mã HMTD để hệ thống chỉ tính một lần.
              </div>
            </div>
          )}

          {/* ── BỘ LỌC QUẢN LÝ THEO TỪNG GÓI HĐTD CỦA KHÁCH HÀNG ── */}
          <MasterHdtdFilterTabs
            isLight={isLight}
            masterHdtdGroups={masterHdtdGroups}
            selectedMasterFilter={selectedMasterFilter}
            setSelectedMasterFilter={setSelectedMasterFilter}
            contractsCount={contracts.length}
          />

          {/* Sub-tabs Navigation */}
          <div className={`flex items-center space-x-1 border rounded-xl p-1 w-fit ${containerCardBg}`}>
            {[
              { id: 'kunn' as const, label: 'Danh sách KUNN & HĐTD', icon: Receipt },
              { id: 'schedule' as const, label: 'Lịch Thu Nợ', icon: Calendar },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mainTab === id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB 1: KUNN & HĐTD MANAGEMENT ── */}
          {mainTab === 'kunn' && (
            <div className="space-y-4">
              {/* KUNN Table */}
              <KunnTable
                isLight={isLight}
                containerCardBg={containerCardBg}
                tableHeaderStyle={tableHeaderStyle}
                filteredContracts={filteredContracts}
                selectedContract={selectedContract}
                handleSelectContract={handleSelectContract}
                allSchedulesMap={allSchedulesMap}
                getAutoDebtGroupInfo={getAutoDebtGroupInfo}
                getMasterHdtdNumber={getMasterHdtdNumber}
                getEffectiveBalanceForContract={getEffectiveBalanceForContract}
              />

              {/* ── HĐTD DETAIL & FORM EDIT / CREATE ── */}
              {showForm && (
                <div className={`${containerCardBg} rounded-2xl p-5 space-y-5 border shadow-xl`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <h3 className="font-bold flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-sky-500" />
                      <span>{selectedContract ? `THÔNG TIN HỢP ĐỒNG TÍN DỤNG: ${selectedContract.ContractNumber}` : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}</span>
                    </h3>
                    <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveContract} className="space-y-6">
                    {/* SECTION 1: THÔNG TIN CHUNG HỢP ĐỒNG TÍN DỤNG (HĐTD) */}
                    <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
                      <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>THÔNG TIN CHUNG HỢP ĐỒNG TÍN DỤNG (HĐTD)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Tên Khách hàng vay</label>
                          <input type="text" readOnly
                            value={foundCustomer ? foundCustomer.FullName : ''}
                            className={`w-full rounded-xl p-2.5 text-xs ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Mã CIF KH</label>
                          <input type="text" readOnly
                            value={foundCustomer ? foundCustomer.CifKh : ''}
                            className={`w-full rounded-xl p-2.5 text-xs font-mono text-sky-600 dark:text-sky-400 ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Số HĐTD Gốc</label>
                          <input type="text"
                            value={formHdtdNumber}
                            onChange={e => handleHdtdNumberChange(e.target.value)}
                            placeholder="2002/HDTD/9634078..."
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Số KUNN (GNN)</label>
                          <input type="text"
                            value={formKunnNumber}
                            onChange={e => setFormKunnNumber(e.target.value)}
                            placeholder="2002/HDTD/9634078/GNN-01..."
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="md:col-span-4">
                          <label className={`block mb-1 ${labelStyle}`}>Phương thức vay *</label>
                          <select required value={form.LoanMethod || LOAN_METHODS[0]}
                            onChange={e => handleLoanMethodChange(e.target.value)}
                            className={`w-full rounded-xl p-2.5 text-xs font-bold ${inputStyle}`}>
                            {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Chuyển Mục đích vay & Mô tả chi tiết lên thông tin chung */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Mục đích vay vốn</label>
                          <select value={form.LoanPurposeType || ''}
                            onChange={e => setForm(f => ({ ...f, LoanPurposeType: e.target.value }))}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`}>
                            <option value="">-- Chọn mục đích --</option>
                            {LOAN_PURPOSE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Mô tả chi tiết mục đích vay</label>
                          <input type="text" value={form.LoanPurpose || ''}
                            onChange={e => setForm(f => ({ ...f, LoanPurpose: e.target.value }))}
                            placeholder="Bổ sung vốn kinh doanh, mua sắm máy móc..."
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                        </div>
                      </div>

                      {/* Tổng mức cấp HĐTD (Chỉ lưu chứ không khoá hẳn) */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Tổng mức cấp (HĐTD) *</label>
                          <input type="text" value={formCreditLimit}
                            onChange={e => setFormCreditLimit(formatMoneyInput(e.target.value))}
                            placeholder="1.000.000.000"
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>
                            Mã HMTD dùng chung
                            <span className="ml-1 normal-case font-normal text-slate-400">(nếu nhiều HĐTD chung một hạn mức)</span>
                          </label>
                          <input type="text" value={formCreditLimitCode}
                            onChange={e => setFormCreditLimitCode(e.target.value)}
                            placeholder="Số phê duyệt cấp tín dụng"
                            title="Các HĐTD khai cùng mã này sẽ dùng chung một hạn mức, chỉ tính MỘT lần vào tổng mức cấp. Bỏ trống nếu hợp đồng có hạn mức riêng."
                            className={`w-full rounded-xl p-2.5 text-xs font-mono ${inputStyle}`} />
                        </div>
                        {formCreditLimitCode.trim() !== '' && (
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Hạn mức được duyệt</label>
                            <input type="text" value={formCreditLimitAmount}
                              onChange={e => setFormCreditLimitAmount(formatMoneyInput(e.target.value))}
                              placeholder="1.460.000.000"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 ${inputStyle}`} />
                          </div>
                        )}
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Ngày HĐ có hiệu lực</label>
                          <DateInput value={form.ContractStartDate || ''}
                            onChange={val => setForm(f => ({ ...f, ContractStartDate: val }))}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Thời hạn vay (HĐTD)</label>
                          {form.LoanMethod === 'Hạn mức tín dụng' ? (
                            <div className="flex items-center space-x-1.5">
                              {[12, 24].map(m => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setForm(f => ({ ...f, LoanTenorMonths: m }))}
                                  className={`flex-1 p-2.5 text-xs rounded-xl font-bold border transition-colors ${
                                    form.LoanTenorMonths === m
                                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                                      : isLight ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                                  }`}
                                >
                                  {m} tháng
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input type="number" min={1} value={form.LoanTenorMonths || ''}
                              onChange={e => setForm(f => ({ ...f, LoanTenorMonths: parseInt(e.target.value) || undefined }))}
                              placeholder="12, 120, 240..."
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                          )}
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>
                            <span>Ngày kết thúc HĐ (tự động)</span>
                          </label>
                          <DateInput readOnly value={form.ContractEndDate || ''}
                            className={`w-full rounded-xl p-2.5 text-xs font-mono border ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={labelStyle}>Phân loại Nhóm nợ</label>
                            {(() => {
                              const schs = selectedContract ? (allSchedulesMap[selectedContract.Id] || schedules) : schedules;
                              const autoInfo = getAutoDebtGroupInfo(schs);
                              if (autoInfo.maxOverdueDays > 0) {
                                return (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    ⚡ Tự động: Nhóm {autoInfo.debtGroup} ({autoInfo.maxOverdueDays}d quá hạn)
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ Đúng hạn (Nhóm 1)
                                </span>
                              );
                            })()}
                          </div>
                          <select value={form.DebtGroup ?? 1}
                            onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                            className={`w-full rounded-xl p-2.5 text-xs font-bold ${inputStyle}`}>
                            {[1,2,3,4,5].map(g => (
                              <option key={g} value={g}>
                                Nhóm {g} ({g === 1 ? 'Nợ đủ tiêu chuẩn <10 ngày' : g === 2 ? 'Nợ cần chú ý 10-90 ngày' : g === 3 ? 'Nợ dưới tiêu chuẩn 91-180 ngày' : g === 4 ? 'Nợ nghi ngờ 181-360 ngày' : 'Nợ có khả năng mất vốn >360 ngày'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Banner Hạn mức HMTD còn lại */}
                      {form.LoanMethod === 'Hạn mức tín dụng' && (
                        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between text-xs font-semibold ${
                          isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/60 border-sky-500/30 text-sky-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-sky-500" />
                            <span>TÌNH TRẠNG HẠN MỨC TÍN DỤNG:</span>
                          </div>
                          <div className="flex items-center space-x-4 font-mono">
                            <span>Tổng mức cấp: <strong className="text-sky-600 dark:text-sky-400">{fmtMoney(creditLimitNum)}</strong></span>
                            <span>• Dư nợ KUNN đã có: <strong className="text-amber-600 dark:text-amber-400">{fmtMoney(totalExistingKunnBalance)}</strong></span>
                            <span>• Khả năng giải ngân còn lại: <strong className="text-emerald-600 dark:text-emerald-400">{fmtMoney(Math.max(0, creditLimitNum - totalExistingKunnBalance))}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: THÔNG TIN GIẤY NHẬN NỢ (KUNN) & GIẢI NGÂN LẦN NÀY */}
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
                          <label className={`block mb-1 ${labelStyle}`}>Dư nợ HMTD hiện hữu (Tổng KUNN đã có)</label>
                          <input type="text" readOnly value={fmtMoney(totalExistingKunnBalance)}
                            className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-amber-600 dark:text-amber-400 ${readonlyInputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Hạn mức HMTD còn lại (sau lần này)</label>
                          <input type="text" readOnly value={fmtMoney(remainingHmtdLimit)}
                            className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold ${
                              remainingHmtdLimit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-500'
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
                            <span>Ngày kết thúc KUNN (tự động)</span>
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

                    {/* SECTION 3: MỤC ĐÍCH VAY & MÔ TẢ (ĐÃ ĐƯỢC CHUYỂN LÊN KHỐI 1) */}

                    {/* SECTION 6: CHI TIẾT LÃI SUẤT (Chọn 1 trong 2 chế độ) */}
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
                            <input type="number" step="0.01" min={0} value={rateMargin}
                              onChange={e => setRateMargin(e.target.value)}
                              placeholder="3.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-300 ${inputStyle}`} />
                          </div>
                          <div className={`col-span-full space-y-2 p-3 rounded-xl border ${
                            isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/40 border-sky-900/60'
                          }`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={labelStyle}>Lãi suất sau ưu đãi chuẩn (LSƯĐ + Biên độ):</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{postPrefRate.toFixed(2)} %/năm</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-sky-200 dark:border-sky-900/50">
                              <span className="font-bold text-sky-700 dark:text-sky-300">👉 LÃI SUẤT ÁP DỤNG THỰC TẾ (KÈM PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                                {currentActiveRateDisplay.toFixed(2)} %/năm {isPromoExpired ? '(Hết hạn ưu đãi -> LS Sau ưu đãi + Phạt)' : '(Trong hạn ưu đãi -> LS Ưu đãi + Phạt)'}
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
                            <input type="number" step="0.01" min={0} value={rateMargin}
                              onChange={e => setRateMargin(e.target.value)}
                              placeholder="3.5"
                              className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-300 ${inputStyle}`} />
                          </div>
                          <div className={`col-span-full space-y-2 p-3 rounded-xl border ${
                            isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/40 border-sky-900/60'
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
                          <label className={`block mb-1 ${labelStyle}`}>Điều kiện phê duyệt (CASA / BCTC)</label>
                          <div className="text-xs p-2.5 rounded-xl border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-medium">
                            💡 Nếu KH không đạt chỉ tiêu CASA / BCTC, nhập <strong>+{rateConditionSurcharge || '0.5'}%</strong> để cộng thêm vào lãi suất áp dụng. Khi KH đạt lại điều kiện ở đợt soát xét tiếp theo, đổi về <strong>0%</strong> để khôi phục lãi suất chuẩn.
                          </div>
                        </div>
                      </div>

                      {/* ── BẢNG LỊCH SỬ ĐIỀU CHỈNH LÃI SUẤT (THẢ NỔI NHIỀU LẦN) ── */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sky-600 dark:text-sky-400 text-xs uppercase flex items-center space-x-1.5">
                            <span>📈 LỊCH SỬ ĐIỀU CHỈNH LÃI SUẤT (THẢ NỔI NHIỀU LẦN)</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {rateHistory.length} đợt điều chỉnh đã lưu
                          </span>
                        </div>

                        {/* Existing Adjustment Records Table */}
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

                        {/* Input box to add new rate adjustment */}
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
                              const m = parseFloat(newAdjMargin) || parseFloat(rateMargin) || 0;
                              const p = parseFloat(newAdjPenalty) || parseFloat(rateConditionSurcharge) || 0;
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

                    {/* SECTION 7: PHƯƠNG THỨC TRẢ NỢ & ÂN HẠN */}
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

                      {/* Tự động ẨN hoàn toàn ô Ân hạn đối với Phương thức Hạn mức tín dụng */}
                      {form.LoanMethod !== 'Hạn mức tín dụng' && (
                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <div>
                            <label className={`block mb-1 ${labelStyle}`}>Ân hạn gốc (tháng)</label>
                            <input type="number" min={0} value={form.PrincipalGracePeriodMonths ?? 0}
                              onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                              className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
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

                    {/* SECTION 8: BẢO ĐẢM TÀI SẢN (Clean & High Contrast in both Light/Dark mode) */}
                    <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span>TÀI SẢN BẢO ĐẢM LIÊN KẾT</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Tổng Định giá: {fmtMoney(totalAppraisedValue)}</span>
                      </div>

                      {collaterals.length === 0 ? (
                        <div className="text-slate-400 text-xs py-2 italic">
                          Khách hàng này chưa có tài sản bảo đảm nào trong hệ thống.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {collaterals.map(col => {
                            const isChecked = selectedCollateralIds.includes(col.Id);
                            const val = col.AppraisedValue || col.Value || 0;
                            const effectiveLtv = getEffectiveLtv(col);
                            const maxLoanCol = val * effectiveLtv / 100;

                            const itemStyle = isChecked
                              ? isLight
                                ? 'bg-sky-50 border-sky-400 text-slate-900 shadow-sm font-medium'
                                : 'bg-sky-950/60 border-sky-500 text-slate-100 font-medium'
                              : isLight
                                ? 'bg-white border-slate-300 text-slate-800 hover:border-sky-400'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700';

                            return (
                              <div key={col.Id} className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${itemStyle}`}>
                                <div className="flex items-start space-x-3 flex-1 min-w-[200px]">
                                  <input type="checkbox" checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) setSelectedCollateralIds(prev => [...prev, col.Id]);
                                      else setSelectedCollateralIds(prev => prev.filter(id => id !== col.Id));
                                    }}
                                    className="w-4 h-4 rounded text-sky-600 mt-0.5" />
                                  <div>
                                    <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                      {col.AssetType || 'TSBĐ'} — {col.Address || col.AssetCode}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                                      <span>Định giá: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{fmtMoney(val)}</strong></span>
                                      <span className="flex items-center space-x-1.5">
                                        <span>LTV cho phép:</span>
                                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                          {col.LtvPercent || 70}%
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-slate-400 block uppercase">Hạn mức vay tối đa</span>
                                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {fmtMoney(maxLoanCol)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* LTV Constraint Alert */}
                      {isLtvExceeded && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>
                            <strong>Cảnh báo LTV:</strong> Dư nợ khoản vay hiện tại ({fmtMoney(effectiveLtvLoanAmount)}) vượt quá mức bảo đảm tối đa cho phép của TSBĐ ({fmtMoney(maxAllowedLoanLtv)})!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Checkboxes: Status */}
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
                        <span>{loading ? 'Đang lưu...' : '+ LƯU THÀNH GNN / KUNN MỚI (THÊM LẦN RÚT VAY)'}</span>
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
                            <span>{loading ? 'Đang lưu...' : `CẬP NHẬT KUNN NÀY (#${selectedContract.ContractNumber})`}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteContract(e, selectedContract.Id, selectedContract.ContractNumber)}
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-rose-600/30 text-xs flex items-center justify-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>XÓA HĐTD NÀY</span>
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: SCHEDULE MANAGEMENT ── */}
          {mainTab === 'schedule' && (
            <div className="space-y-4">
              {/* Select contract */}
              <div className={`${containerCardBg} rounded-2xl p-4 border`}>
                <div className="font-bold mb-3 flex items-center space-x-2 text-xs">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <span>CHỌN HỢP ĐỒNG TÍN DỤNG ĐỂ XEM / TẠO LỊCH THU NỢ</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {contracts.map(c => (
                    <button key={c.Id} onClick={() => handleSelectContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        selectedContract?.Id === c.Id
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

              {/* Schedule table */}
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
                    // Helper to calculate penalty for a schedule item
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
                            <th className="p-3 text-right whitespace-nowrap">GỐC</th>
                            <th className="p-3 text-right whitespace-nowrap">LÃI THƯỜNG</th>
                            <th className="p-3 text-right whitespace-nowrap text-rose-500">LÃI PHẠT QUÁ HẠN (150%)</th>
                            <th className="p-3 text-right whitespace-nowrap">TỔNG NGHĨA VỤ TRẢ</th>
                            <th className="p-3 text-center whitespace-nowrap">TRẠNG THÁI</th>
                            <th className="p-3 whitespace-nowrap">NGÀY TT</th>
                            <th className="p-3 text-center whitespace-nowrap">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                          {!selectedContract ? (
                            <tr><td colSpan={11} className="text-center p-8 text-slate-400">Chọn một HĐTD để xem lịch thu nợ</td></tr>
                          ) : schedules.length === 0 ? (
                            <tr><td colSpan={11} className="text-center p-8 text-slate-400">
                              Chưa có lịch thu nợ. Nhấn "TẠO LỊCH THU NỢ TỰ ĐỘNG" để tính toán.
                            </td></tr>
                          ) : schedules.map(s => {
                            // Calculate default auto overdue days relative to today
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

                            const activeRateVal = getEffectiveActiveRate(selectedContract, s.DueDate);
                            const activeRatePercentStr = (activeRateVal * 100).toFixed(2) + '%/năm';

                            return (
                              <tr key={s.Id} className={`transition-colors ${
                                isPrepayRow
                                  ? 'bg-amber-500/10 dark:bg-amber-500/20 font-semibold border-l-4 border-amber-500'
                                  : s.IsPaid
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                                    : isOverdue
                                      ? 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold'
                                      : tableRowHover
                              }`}>
                                <td className="p-3 text-center font-bold font-mono">#{s.PeriodNumber}</td>
                                <td className="p-3 font-mono font-bold">{fmtDate(s.DueDate)}</td>
                                <td className="p-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20 rounded-lg">
                                  {activeRatePercentStr}
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
                                      +Trả trước: {s.PrepaidPrincipalAmount.toLocaleString('vi-VN')}
                                    </div>
                                  ) : null}
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
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1 border ${
                                      s.IsPaid
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

                {/* ── BẢNG THỐNG KÊ CHI TIẾT DƯ NỢ & LÃI PHẠT QUÁ HẠN ── */}
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

      {/* ── MODAL GHI NHẬN THANH TOÁN / TRẢ TRƯỚC HẠN & SỐ NGÀY QUÁ HẠN ── */}
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
              {/* Cột 1: Gốc, Lãi & Trả trước */}
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

              {/* Cột 2: Quá hạn & Ngày TT */}
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
