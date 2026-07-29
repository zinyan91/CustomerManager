import React, { useState, useEffect } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI, deleteContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByContractAPI,
  fetchCollateralsByCustomerAPI
} from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { LoanContract, Customer, RepaymentSchedule, Collateral } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  Search, FileText, Receipt, Calendar, CheckCircle, AlertCircle,
  User, ChevronRight, Plus, RefreshCw, X, ChevronDown, ShieldCheck, DollarSign, Building2, Save, Trash2
} from 'lucide-react';

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
const DEBT_GROUP_LABELS: Record<number, string> = { 1: 'Nhóm 1', 2: 'Nhóm 2', 3: 'Nhóm 3', 4: 'Nhóm 4', 5: 'Nhóm 5' };
const DEBT_GROUP_COLORS: Record<number, string> = {
  2: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  3: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  4: 'bg-red-500/15 text-red-400 border border-red-500/30',
  5: 'bg-red-900/30 text-red-300 border border-red-700/40',
};

const fmtMoney = (v?: number | null) => v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' VNĐ' : '—';
const fmtRate = (v?: number | null) => v !== undefined && v !== null ? (v * 100).toFixed(2) + '%/năm' : '—';
const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('vi-VN'); } catch { return v; }
};

// Helper: Auto-calculate End Date by adding months to a date string (YYYY-MM-DD)
function addMonthsToDate(dateStr?: string | null, months?: number | null): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month + Number(months), day);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function parseKunnTenorMonths(tenorStr?: string | null): number {
  if (!tenorStr) return 0;
  const match = tenorStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Generate repayment schedule with Bullet (Gốc trả cuối kỳ) or Equal Principal support
function generateSchedule(
  contractId: number,
  loanAmount: number,
  interestRate: number,
  startDateStr: string,
  periods: number,
  isBulletPrincipal: boolean = true
): Partial<RepaymentSchedule>[] {
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;

  let startYear = 2026;
  let startMonth = 4;
  let startDay = 5;

  if (startDateStr) {
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      startYear = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10) - 1;
      startDay = parseInt(parts[2], 10);
    }
  }

  const annualRate = interestRate / 100;

  for (let i = 1; i <= periods; i++) {
    const dueDate = new Date(startYear, startMonth + i, startDay);
    const prevDate = new Date(startYear, startMonth + i - 1, startDay);
    const diffDays = Math.max(28, Math.round((dueDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));

    let principal = 0;
    if (isBulletPrincipal) {
      // HMTD / KUNN: Gốc trả cuối kỳ
      principal = (i === periods) ? balance : 0;
    } else {
      // Gốc trả đều hàng tháng
      principal = Math.round(loanAmount / periods);
      if (i === periods) principal = balance;
    }

    const interest = Math.round(balance * annualRate * (diffDays / 365));

    schedules.push({
      ContractId: contractId,
      PeriodNumber: i,
      DueDate: dueDate.toISOString().split('T')[0],
      PrincipalAmount: principal,
      InterestAmount: interest,
      TotalAmount: principal + interest,
      IsPaid: false,
    });

    balance = Math.max(0, balance - principal);
  }

  return schedules;
}

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

  // Tab
  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [showForm, setShowForm] = useState(false);

  // Form state (HĐTD + KUNN + Lãi suất + Phương thức trả nợ)
  const [form, setForm] = useState<Partial<LoanContract>>({});
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState('');
  const [formCurrentBalance, setFormCurrentBalance] = useState('');

  // Interest Rates form state (% string, e.g. "8.5")
  const [interestRateMode, setInterestRateMode] = useState<'pref' | 'base'>('pref');
  const [ratePreferential, setRatePreferential] = useState('');
  const [ratePreferentialMonths, setRatePreferentialMonths] = useState('');
  const [rateBase, setRateBase] = useState('');
  const [rateMargin, setRateMargin] = useState('');

  // Selected Collateral IDs for current contract
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);

  // Custom LTV override map (collateralId -> LTV percent)
  const [customLtvMap, setCustomLtvMap] = useState<Record<number, number>>({});

  // Schedule gen form
  const [isGenerating, setIsGenerating] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all customers for dropdown on mount & sort A-Z
  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setAllCustomers(list);
    }).catch(() => {});
  }, []);

  // Requirement 1 & 2: Auto-sync cho Cho vay từng lần & KUNN
  useEffect(() => {
    const isSingleLoan = form.LoanMethod === 'Cho vay từng lần' || form.LoanMethod === 'Hạn mức tín dụng từng lần';
    if (isSingleLoan) {
      if (form.LoanTenorMonths) {
        const kunnTenorStr = `${form.LoanTenorMonths} tháng`;
        const calculatedEnd = addMonthsToDate(form.ContractStartDate || form.DisbursementDate, form.LoanTenorMonths);

        setForm(prev => {
          let updated = false;
          const copy = { ...prev };
          if (copy.KunnTenor !== kunnTenorStr) { copy.KunnTenor = kunnTenorStr; updated = true; }
          if (!copy.DisbursementDate && copy.ContractStartDate) { copy.DisbursementDate = copy.ContractStartDate; updated = true; }
          if (calculatedEnd && copy.KunnDueDate !== calculatedEnd) { copy.KunnDueDate = calculatedEnd; updated = true; }
          return updated ? copy : prev;
        });
      }

      // Auto-sync Total Limit = KUNN Loan Amount for Single Loans
      if (formLoanAmount && formCreditLimit !== formLoanAmount) {
        setFormCreditLimit(formLoanAmount);
      }
    }
  }, [form.LoanMethod, form.LoanTenorMonths, form.ContractStartDate, form.DisbursementDate, formLoanAmount]);

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

  // Derived Rates & Amount Calculations
  const prefVal = parseFloat(ratePreferential) || 0;
  const baseVal = parseFloat(rateBase) || 0;
  const marginVal = parseFloat(rateMargin) || 0;

  const postPrefRate = prefVal + marginVal; // LSUD + Biên độ
  const normalRate = baseVal + marginVal;    // LSCS + Biên độ

  const creditLimitNum = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
  const kunnLoanAmountNum = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || 0;

  // Sum of all existing KUNNs under current customer (excluding selectedContract if editing)
  const totalExistingKunnBalance = contracts
    .filter(c => !selectedContract || c.Id !== selectedContract.Id)
    .reduce((acc, c) => acc + (c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount ?? 0), 0);

  // Remaining HMTD Credit Limit = Total Limit - (Existing KUNNs + Current KUNN)
  const remainingHmtdLimit = Math.max(0, creditLimitNum - totalExistingKunnBalance - kunnLoanAmountNum);

  // Filtered dropdown list for quick pick
  const dropdownFiltered = dropdownQuery.trim().length < 1
    ? allCustomers.slice(0, 30)
    : allCustomers.filter(c =>
        c.FullName.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
        c.CifKh.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
        (c.NationalId || '').includes(dropdownQuery)
      ).slice(0, 30);

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
    setSchedules(s);
  };

  const populateForm = (c: LoanContract) => {
    setForm({
      Id: c.Id,
      CustomerId: c.CustomerId,
      ContractNumber: c.ContractNumber,
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
    setFormLoanAmount(c.LoanAmount ? c.LoanAmount.toLocaleString('vi-VN') : '');
    setFormCurrentBalance(c.CurrentBalance ? c.CurrentBalance.toLocaleString('vi-VN') : '');

    setRatePreferential(c.PreferentialRate ? (c.PreferentialRate * 100).toString() : '');
    setRatePreferentialMonths(c.PreferentialPeriodMonths ? c.PreferentialPeriodMonths.toString() : '');
    setRateBase(c.BaseRate ? (c.BaseRate * 100).toString() : '');
    setRateMargin(c.MarginRate ? (c.MarginRate * 100).toString() : '');

    if (c.CollateralId) {
      setSelectedCollateralIds([c.CollateralId]);
    } else {
      setSelectedCollateralIds([]);
    }
  };

  const handleNewContract = () => {
    setSelectedContract(null);
    setSchedules([]);
    const defaultMethod = LOAN_METHODS[0];

    // Pre-populate master contract info if customer already has one
    const master = contracts.find(c => c.LoanMethod === 'Hạn mức tín dụng') || (contracts.length > 0 ? contracts[0] : null);

    setForm({
      CustomerId: foundCustomer?.Id,
      ContractType: master ? master.ContractType : 0,
      LoanMethod: master ? master.LoanMethod : defaultMethod,
      DebtGroup: master ? master.DebtGroup : 1,
      ContractNumber: master ? `${master.ContractNumber}/KUNN-${(contracts.length + 1).toString().padStart(2, '0')}` : '',
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

    if (master) {
      setFormCreditLimit(master.ContractAmount ? master.ContractAmount.toLocaleString('vi-VN') : '');
    } else {
      setFormCreditLimit('');
    }

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
        return;
      }
      if (!form.ContractNumber?.trim()) {
        showNotify('error', 'Vui lòng nhập Số Hợp đồng Tín dụng!');
        return;
      }

      const creditLimit = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
      const loanAmount = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || undefined;
      const currentBal = parseFloat(formCurrentBalance.replace(/\./g, '').replace(',', '.')) || undefined;

      const prefDec = prefVal ? prefVal / 100 : undefined;
      const baseDec = baseVal ? baseVal / 100 : undefined;
      const marginDec = marginVal ? marginVal / 100 : undefined;
      const postPrefDec = postPrefRate ? postPrefRate / 100 : undefined;
      const normalDec = normalRate ? normalRate / 100 : undefined;

      const activeInterestRate = prefDec || normalDec || baseDec || undefined;

      const payload: Partial<LoanContract> = {
        ...form,
        CustomerId: targetCustomerId,
        ContractAmount: creditLimit,
        LoanAmount: loanAmount ?? creditLimit,
        CurrentBalance: currentBal ?? loanAmount ?? creditLimit,

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
      }

      const savedContract = await saveContractAPI(payload);
      showNotify('success', (forceInsert || !selectedContract) ? 'Đã TẠO MỚI thành công Giấy nhận nợ (KUNN)!' : 'Đã CẬP NHẬT thông tin KUNN/HĐTD!');

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

  const handleGenerateSchedule = async () => {
    if (!selectedContract) return;
    const loanAmt = selectedContract.LoanAmount || selectedContract.ContractAmount || 0;
    const rate = selectedContract.InterestRate || selectedContract.NormalRate || 0;
    const startDate = selectedContract.DisbursementDate || selectedContract.RepaymentStartDate || selectedContract.ContractStartDate;

    const periods = parseKunnTenorMonths(selectedContract.KunnTenor) || selectedContract.LoanTenorMonths || 12;

    const isBullet = (selectedContract.PrincipalRepaymentMethod ?? 'Gốc trả cuối kỳ') === 'Gốc trả cuối kỳ' || selectedContract.LoanMethod === 'Hạn mức tín dụng';

    if (!loanAmt || !rate || !startDate) {
      showNotify('error', 'Cần có Số tiền nhận nợ, Lãi suất và Ngày giải ngân/bắt đầu trả nợ!');
      return;
    }

    setIsGenerating(true);
    try {
      await deleteRepaymentSchedulesByContractAPI(selectedContract.Id);

      const generated = generateSchedule(selectedContract.Id, loanAmt, rate, startDate, periods, isBullet);
      await bulkSaveRepaymentSchedulesAPI(generated);

      const refreshed = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      setSchedules(refreshed);
      showNotify('success', `Đã tạo tự động ${refreshed.length} kỳ trả nợ (${isBullet ? 'Gốc trả cuối kỳ' : 'Gốc trả đều hàng tháng'})!`);
    } catch (err: any) {
      showNotify('error', `Lỗi tạo lịch: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkPaid = async (s: RepaymentSchedule) => {
    try {
      const updated = { ...s, IsPaid: !s.IsPaid, PaymentDate: !s.IsPaid ? new Date().toISOString().split('T')[0] : null };
      const { error } = await (await import('../../lib/supabase')).supabase
        .from('RepaymentSchedules')
        .update({ IsPaid: updated.IsPaid, PaymentDate: updated.PaymentDate })
        .eq('Id', s.Id);
      if (error) throw error;
      setSchedules(prev => prev.map(x => x.Id === s.Id ? { ...x, IsPaid: updated.IsPaid, PaymentDate: updated.PaymentDate ?? undefined } : x));
      showNotify('success', updated.IsPaid ? 'Đã đánh dấu thanh toán!' : 'Đã hủy thanh toán');
    } catch (err: any) {
      showNotify('error', `Lỗi: ${err.message}`);
    }
  };

  // Helper function to get effective LTV percentage for a collateral item (default 70% if unassigned)
  const getEffectiveLtv = (c: Collateral) => {
    if (customLtvMap[c.Id] !== undefined) return customLtvMap[c.Id];
    return (c.LtvPercent && c.LtvPercent > 0) ? c.LtvPercent : 70;
  };

  // Compute total Appraised Collateral Value & Max Allowed Loan based on LTV
  const selectedCollaterals = collaterals.filter(c => selectedCollateralIds.includes(c.Id));
  const totalAppraisedValue = selectedCollaterals.reduce((sum, c) => sum + (c.AppraisedValue || c.Value || 0), 0);

  const maxAllowedLoanLtv = selectedCollaterals.reduce((sum, c) => {
    const val = c.AppraisedValue || c.Value || 0;
    const ltv = getEffectiveLtv(c);
    return sum + (val * ltv / 100);
  }, 0);

  const currentFormCreditLimitNum = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
  const isLtvExceeded = selectedCollateralIds.length > 0 && maxAllowedLoanLtv > 0 && currentFormCreditLimitNum > maxAllowedLoanLtv;

  const totalKunnAmount = contracts.reduce((sum, c) => sum + (c.LoanAmount || 0), 0);
  const totalCreditLimit = contracts.reduce((sum, c) => sum + (c.ContractAmount || 0), 0);

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
      <div className={`${containerCardBg} rounded-2xl p-5 border`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
          <Search className="w-4 h-4" />
          <span>TRA CỨU THÔNG TIN KHOẢN VAY KHÁCH HÀNG</span>
        </div>

        {/* Quick-pick dropdown */}
        <div className="mb-3 relative">
          <label className={`block mb-1 text-[11px] uppercase tracking-wide ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>
            ⚡ Chọn nhanh từ danh sách Khách hàng
          </label>
          <div className="relative">
            <input
              type="text"
              value={dropdownQuery}
              onChange={e => { setDropdownQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              placeholder={`Gõ tên hoặc CIF để lọc nhanh... (${allCustomers.length} KH)`}
              className={`w-full rounded-xl pl-3 pr-10 py-2.5 text-xs transition-colors ${inputStyle}`}
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {showDropdown && dropdownFiltered.length > 0 && (
            <div className={`absolute z-40 w-full mt-1 border rounded-xl shadow-2xl max-h-60 overflow-y-auto ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}>
              {dropdownFiltered.map(c => (
                <button
                  key={c.Id}
                  type="button"
                  onMouseDown={() => handlePickCustomer(c)}
                  className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between group border-b last:border-0 ${
                    isLight
                      ? 'hover:bg-sky-50 border-slate-100'
                      : 'hover:bg-sky-600/20 border-slate-800/50'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">{c.FullName}</span>
                    {c.SpouseName && <span className="text-slate-400 ml-2 text-[10px]">KHLQ: {c.SpouseName}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-bold text-[11px]">{c.CifKh}</span>
                    {c.Phone && <span className="block text-slate-400 text-[10px]">📞 {c.Phone}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
          <span className={`text-[10px] uppercase tracking-wider px-2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>hoặc tìm kiếm nâng cao</span>
          <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={`block mb-1 text-[11px] ${labelStyle}`}>Mã CIF Khách hàng</label>
            <input type="text" value={searchCif} onChange={e => setSearchCif(e.target.value)}
              placeholder="005236683..."
              className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={`block mb-1 text-[11px] ${labelStyle}`}>Họ tên Khách hàng</label>
            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
              placeholder="Lê Ngọc Quế Hân..."
              className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={`block mb-1 text-[11px] ${labelStyle}`}>Số Hợp Đồng Tín Dụng</label>
            <input type="text" value={searchContract} onChange={e => setSearchContract(e.target.value)}
              placeholder="HDTL-005236683..."
              className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
          </div>
          <button type="submit" disabled={isSearching}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl transition-colors shrink-0 shadow-sm">
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Đang tìm...' : 'TÌM KIẾM'}</span>
          </button>
          {foundCustomer && (
            <button type="button" onClick={() => {
              setFoundCustomer(null); setContracts([]); setCollaterals([]); setSelectedContract(null);
              setShowForm(false); setSearchCif(''); setSearchName('');
              setSearchContract(''); setDropdownQuery('');
            }}
              className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-2 rounded-xl transition-colors">
              <X className="w-4 h-4" />
              <span>Xóa</span>
            </button>
          )}
        </form>
      </div>

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
          <div className={`${containerCardBg} rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border`}>
            <div className="flex items-center space-x-3">
              <div className="bg-sky-600 rounded-full p-2.5 shadow-lg shadow-sky-600/30">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center space-x-2">
                  <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>{foundCustomer.FullName}</span>
                  <span className="text-xs font-mono font-normal bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md">
                    CIF: {foundCustomer.CifKh}
                  </span>
                </div>
                <div className="text-[11px] flex flex-wrap items-center gap-3 mt-1 text-slate-500">
                  {foundCustomer.CifKhlq && <span>CIF KHLQ: <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{foundCustomer.CifKhlq}</span></span>}
                  {foundCustomer.Phone && <span>📞 {foundCustomer.Phone}</span>}
                  <span>TSBĐ hiện có: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{collaterals.length} tài sản</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`text-right pr-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Tổng mức cấp HĐTD</div>
                <div className="text-sky-600 dark:text-sky-400 font-bold text-sm">{fmtMoney(totalCreditLimit)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Tổng số dư KUNN</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{fmtMoney(totalKunnAmount)}</div>
              </div>
              <button onClick={handleNewContract}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs shadow-md shadow-emerald-600/20">
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo HĐTD mới</span>
              </button>
            </div>
          </div>

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
              <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
                <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                  <span className="font-bold flex items-center space-x-2 text-xs">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    <span>DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {contracts.length} KHOẢN VAY</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Nhấp vào dòng để xem chi tiết / cập nhật HĐTD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={tableHeaderStyle}>
                      <tr>
                        <th className="p-3 whitespace-nowrap">SỐ HĐTD</th>
                        <th className="p-3 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ</th>
                        <th className="p-3 whitespace-nowrap text-right">DƯ NỢ HIỆN HỮU</th>
                        <th className="p-3 whitespace-nowrap">LÃI SUẤT AP</th>
                        <th className="p-3 whitespace-nowrap">NGÀY GIẢI NGÂN</th>
                        <th className="p-3 whitespace-nowrap">NGÀY KẾT THÚC</th>
                        <th className="p-3 whitespace-nowrap">PHƯƠNG THỨC VAY</th>
                        <th className="p-3 whitespace-nowrap">NHÓM NỢ</th>
                        <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                      {contracts.length === 0 ? (
                        <tr><td colSpan={9} className="text-center p-8 text-slate-400">
                          Chưa có Giấy Nhận Nợ nào. Nhấn "Tạo HĐTD mới" để nhập khoản vay.
                        </td></tr>
                      ) : contracts.map(c => {
                        const isSelected = selectedContract?.Id === c.Id;
                        const dg = c.DebtGroup || 1;
                        return (
                          <tr key={c.Id}
                            onClick={() => handleSelectContract(c)}
                            className={`cursor-pointer transition-colors ${isSelected
                              ? 'bg-sky-50 dark:bg-sky-950/50 border-l-4 border-l-sky-500 font-semibold'
                              : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'
                            }`}>
                            <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">
                              <div className="flex items-center space-x-1">
                                {isSelected && <ChevronRight className="w-3.5 h-3.5 text-sky-500" />}
                                <span>{c.ContractNumber}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {fmtMoney(c.LoanAmount || c.ContractAmount)}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {fmtMoney(c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount)}
                            </td>
                            <td className="p-3 text-sky-600 dark:text-sky-300 font-mono whitespace-nowrap">{fmtRate(c.InterestRate || c.NormalRate)}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(c.DisbursementDate || c.ContractStartDate)}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
                                {c.LoanMethod || (c.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần')}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {dg > 1 ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${DEBT_GROUP_COLORS[dg]}`}>
                                  {DEBT_GROUP_LABELS[dg]}
                                </span>
                              ) : <span className="text-slate-400 font-medium">Nhóm 1</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

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
                          <label className={`block mb-1 ${labelStyle}`}>Số Hợp Đồng Tín Dụng *</label>
                          <input type="text" value={form.ContractNumber || ''}
                            onChange={e => setForm(f => ({ ...f, ContractNumber: e.target.value }))}
                            placeholder="HDTD-71803/2026..."
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
                        </div>
                        <div>
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
                            onChange={e => {
                              const val = formatMoneyInput(e.target.value);
                              setFormCreditLimit(val);
                              if (form.LoanMethod === 'Cho vay từng lần' || form.LoanMethod === 'Hạn mức tín dụng từng lần') {
                                setFormLoanAmount(val);
                              }
                            }}
                            placeholder="1.000.000.000"
                            className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Ngày HĐ có hiệu lực</label>
                          <input type="date" value={form.ContractStartDate || ''}
                            onChange={e => setForm(f => ({ ...f, ContractStartDate: e.target.value }))}
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
                            <span>Ngày kết thúc HĐ</span>
                          </label>
                          <input type="date" value={form.ContractEndDate || ''}
                            onChange={e => setForm(f => ({ ...f, ContractEndDate: e.target.value }))}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Phân loại Nhóm nợ</label>
                          <select value={form.DebtGroup ?? 1}
                            onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`}>
                            {[1,2,3,4,5].map(g => <option key={g} value={g}>Nhóm {g}</option>)}
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
                          <label className={`block mb-1 ${labelStyle}`}>Số tiền nhận nợ lần này (KUNN) *</label>
                          <input type="text" value={formLoanAmount}
                            onChange={e => {
                              const val = formatMoneyInput(e.target.value);
                              setFormLoanAmount(val);
                              if (form.LoanMethod === 'Cho vay từng lần' || form.LoanMethod === 'Hạn mức tín dụng từng lần') {
                                setFormCreditLimit(val);
                              }
                            }}
                            placeholder="200.000.000"
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
                          <input type="date" value={form.DisbursementDate || ''}
                            onChange={e => {
                              const disDate = e.target.value;
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
                            <span>Ngày kết thúc KUNN (Tự động tính)</span>
                          </label>
                          <input type="date" value={form.KunnDueDate || ''}
                            onChange={e => setForm(f => ({ ...f, KunnDueDate: e.target.value }))}
                            className={`w-full rounded-xl p-2.5 text-xs font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
                        </div>
                        <div>
                          <label className={`block mb-1 ${labelStyle}`}>Ngày bắt đầu trả nợ</label>
                          <input type="date" value={form.RepaymentStartDate || ''}
                            onChange={e => setForm(f => ({ ...f, RepaymentStartDate: e.target.value }))}
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
                          <div className={`col-span-full flex items-center justify-between p-2.5 rounded-lg border ${
                            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <span className={labelStyle}>Lãi suất sau ưu đãi (LSUD + Biên độ):</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{postPrefRate.toFixed(2)} %/năm</span>
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
                          <div className={`col-span-full flex items-center justify-between p-2.5 rounded-lg border ${
                            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <span className={labelStyle}>Lãi suất thông thường (LSCS + Biên độ):</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{normalRate.toFixed(2)} %/năm</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 7: PHƯƠNG THỨC TRẢ NỢ & ÂN HẠN */}
                    <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        PHƯƠNG THỨC TRẢ NỢ {form.LoanMethod === 'Hạn mức tín dụng' ? '(MẶC ĐỊNH HMTD)' : '& ÂN HẠN'}
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
                          <span>TÀI SẢN BẢO ĐẢM LIÊN KẾT (1 HĐTD — N TSBĐ)</span>
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
                                      <span className="flex items-center space-x-1">
                                        <span>LTV cho phép:</span>
                                        <input
                                          type="number"
                                          min={10}
                                          max={100}
                                          value={effectiveLtv}
                                          onChange={e => setCustomLtvMap(prev => ({ ...prev, [col.Id]: parseFloat(e.target.value) || 70 }))}
                                          className={`w-14 px-1.5 py-0.5 text-center font-bold text-xs rounded border ${
                                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                                          }`}
                                        />
                                        <span>%</span>
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
                            <strong>Cảnh báo LTV:</strong> Tổng mức cấp HĐTD ({fmtMoney(currentFormCreditLimitNum)}) vượt quá mức bảo đảm tối đa cho phép của TSBĐ ({fmtMoney(maxAllowedLoanLtv)})!
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
                            <span>{loading ? 'Đang lưu...' : `💾 CẬP NHẬT KUNN NÀY (#${selectedContract.ContractNumber})`}</span>
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
                      <span>Lãi suất: <strong className="text-rose-600 dark:text-rose-400 font-mono">{fmtRate(selectedContract.InterestRate || selectedContract.NormalRate)}</strong></span>
                      <span>Thời hạn KUNN: <strong className="text-sky-600 dark:text-sky-400">{selectedContract.KunnTenor || `${selectedContract.LoanTenorMonths || 12} tháng`}</strong></span>
                      <span>Phương thức gốc: <strong className="text-purple-600 dark:text-purple-400">{selectedContract.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}</strong></span>
                      <span>Ngày giải ngân: <strong className="text-amber-600 dark:text-amber-400 font-mono">{fmtDate(selectedContract.DisbursementDate || selectedContract.ContractStartDate)}</strong></span>
                    </div>

                    <button onClick={handleGenerateSchedule} disabled={isGenerating}
                      className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-xs shadow-md shadow-amber-600/20">
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Đang tính toán...' : '🔄 TẠO / LÀM MỚI LỊCH THU NỢ TỰ ĐỘNG'}</span>
                    </button>
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
                  <table className="w-full text-left text-xs">
                    <thead className={tableHeaderStyle}>
                      <tr>
                        <th className="p-3 text-center">KỲ</th>
                        <th className="p-3">NGÀY ĐẾN HẠN</th>
                        <th className="p-3 text-center">SỐ NGÀY QUÁ HẠN</th>
                        <th className="p-3 text-right">GỐC</th>
                        <th className="p-3 text-right">LÃI</th>
                        <th className="p-3 text-right">TỔNG CỘNG</th>
                        <th className="p-3 text-center">TRẠNG THÁI</th>
                        <th className="p-3">NGÀY TT</th>
                        <th className="p-3 text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                      {!selectedContract ? (
                        <tr><td colSpan={9} className="text-center p-8 text-slate-400">Chọn một HĐTD để xem lịch thu nợ</td></tr>
                      ) : schedules.length === 0 ? (
                        <tr><td colSpan={9} className="text-center p-8 text-slate-400">
                          Chưa có lịch thu nợ. Nhấn "TẠO LỊCH THU NỢ TỰ ĐỘNG" để tính toán.
                        </td></tr>
                      ) : schedules.map(s => {
                        // Calculate overdue days
                        let overdueDays = 0;
                        if (!s.IsPaid && s.DueDate) {
                          const parts = s.DueDate.split('-');
                          if (parts.length === 3) {
                            const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            due.setHours(0, 0, 0, 0);
                            const diff = today.getTime() - due.getTime();
                            if (diff > 0) overdueDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                          }
                        }

                        const isOverdue = !s.IsPaid && overdueDays > 0;

                        return (
                          <tr key={s.Id} className={`transition-colors ${
                            s.IsPaid
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                              : isOverdue
                                ? 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold'
                                : tableRowHover
                          }`}>
                            <td className="p-3 text-center font-bold">{s.PeriodNumber}</td>
                            <td className="p-3 font-mono font-bold">{fmtDate(s.DueDate)}</td>
                            <td className="p-3 text-center font-bold">
                              {overdueDays > 0 ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] bg-rose-600 text-white font-mono animate-pulse">
                                  Quá {overdueDays} ngày
                                </span>
                              ) : <span className="text-slate-400 font-normal">—</span>}
                            </td>
                            <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono font-bold">{(s.PrincipalAmount || 0).toLocaleString('vi-VN')}</td>
                            <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono font-bold">{(s.InterestAmount || 0).toLocaleString('vi-VN')}</td>
                            <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">{(s.TotalAmount || 0).toLocaleString('vi-VN')}</td>
                            <td className="p-3 text-center">
                              {s.IsPaid ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  ✓ Đã TT
                                </span>
                              ) : isOverdue ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white border border-rose-500 animate-pulse">
                                  🔴 Quá hạn
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  🟡 Chờ TT
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">{s.IsPaid ? fmtDate(s.PaymentDate) : '—'}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleMarkPaid(s)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  s.IsPaid
                                    ? isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 dark:text-emerald-400 border border-emerald-600/30'
                                }`}>
                                {s.IsPaid ? 'Hủy TT' : 'Đánh dấu TT'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {schedules.length > 0 && (
                      <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                        <tr>
                          <td className="p-3" colSpan={3}>TỔNG CỘNG LỊCH THU NỢ</td>
                          <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.PrincipalAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.InterestAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.TotalAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* ── BẢNG THỐNG KÊ CHI TIẾT DƯ NỢ & LÃI PHẠT QUÁ HẠN ── */}
                {selectedContract && schedules.length > 0 && (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  let duePrincipal = 0;
                  let paidPrincipal = 0;
                  let dueInterest = 0;
                  let paidInterest = 0;
                  let penaltyPrincipal = 0;
                  let penaltyInterest = 0;

                  const annualRate = (selectedContract.InterestRate || selectedContract.NormalRate || 0.11) > 1 
                    ? (selectedContract.InterestRate || selectedContract.NormalRate || 11) / 100 
                    : (selectedContract.InterestRate || selectedContract.NormalRate || 0.11);

                  schedules.forEach(s => {
                    if (!s.DueDate) return;
                    const parts = s.DueDate.split('-');
                    if (parts.length !== 3) return;
                    const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    due.setHours(0, 0, 0, 0);

                    const isDue = due <= today;
                    if (isDue) {
                      duePrincipal += s.PrincipalAmount || 0;
                      dueInterest += s.InterestAmount || 0;
                    }

                    if (s.IsPaid) {
                      paidPrincipal += s.PrincipalAmount || 0;
                      paidInterest += s.InterestAmount || 0;
                    } else if (due < today) {
                      const diffTime = today.getTime() - due.getTime();
                      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (daysOverdue > 0) {
                        // Penalty on overdue principal (150% of annual rate * days / 365)
                        penaltyPrincipal += (s.PrincipalAmount || 0) * (annualRate * 1.5) * (daysOverdue / 365);
                        // Penalty on overdue interest (10% annual rate * days / 365)
                        penaltyInterest += (s.InterestAmount || 0) * 0.10 * (daysOverdue / 365);
                      }
                    }
                  });

                  const overduePrincipal = Math.max(0, duePrincipal - paidPrincipal);
                  const overdueInterest = Math.max(0, dueInterest - paidInterest);
                  const totalPenalty = Math.round(penaltyPrincipal + penaltyInterest);
                  const totalUrgentPayment = overduePrincipal + overdueInterest + totalPenalty;

                  return (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 space-y-3">
                      <div className="font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>BẢNG THỐNG KÊ CHI TIẾT NGHĨA VỤ NỢ & PHẠT CHẬM TRẢ KHẨN CẤP</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Gốc */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">NGHĨA VỤ NỢ GỐC</div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Gốc tới due (đến hạn):</span>
                            <span className="font-mono font-bold">{duePrincipal.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Gốc đã thanh toán:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{paidPrincipal.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-rose-600 dark:text-rose-400">🔴 GỐC QUÁ HẠN:</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{overduePrincipal.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        </div>

                        {/* Lãi */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">NGHĨA VỤ NỢ LÃI</div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Lãi tới due (đến hạn):</span>
                            <span className="font-mono font-bold">{dueInterest.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Lãi đã thanh toán:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{paidInterest.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-rose-600 dark:text-rose-400">🔴 LÃI QUÁ HẠN:</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{overdueInterest.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        </div>

                        {/* Lãi phạt chậm trả */}
                        <div className="p-3 rounded-xl border bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 space-y-1.5">
                          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">LÃI PHẠT CHẬM TRẢ & PHÍ QUÁ HẠN</div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Phạt gốc (150% LS):</span>
                            <span className="font-mono font-bold text-rose-600">{Math.round(penaltyPrincipal).toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Phạt lãi (10%/năm):</span>
                            <span className="font-mono font-bold text-rose-600">{Math.round(penaltyInterest).toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-rose-200 dark:border-rose-800">
                            <span className="font-bold text-rose-700 dark:text-rose-300">TỔNG PHẠT CHẬM TRẢ:</span>
                            <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{totalPenalty.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        </div>
                      </div>

                      {/* Bar Total Urgent Payment */}
                      <div className="p-3 rounded-xl bg-rose-600 text-white font-bold flex flex-wrap items-center justify-between shadow-md">
                        <span className="text-xs uppercase tracking-wider">TỔNG NGHĨA VỤ CẦN THANH TOÁN KHẨN CẤP (GỐC + LÃI QUÁ HẠN + PHẠT):</span>
                        <span className="font-mono text-base font-extrabold">{totalUrgentPayment.toLocaleString('vi-VN')} VNĐ</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
