import React, { useState, useEffect } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByContractAPI,
  fetchCollateralsByCustomerAPI
} from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { LoanContract, Customer, RepaymentSchedule, Collateral } from '../../types';
import {
  Search, FileText, Receipt, Calendar, CheckCircle, AlertCircle,
  User, ChevronRight, Plus, RefreshCw, X, ChevronDown, ShieldCheck, DollarSign
} from 'lucide-react';

const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm'
];

const PRINCIPAL_REPAY_OPTIONS = [
  'Trả cuối kỳ',
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

// Generate repayment schedule (equal principal method)
function generateSchedule(
  contractId: number,
  loanAmount: number,
  interestRate: number,
  startDate: string,
  periods: number,
  repaymentDay: number // day of month (1,15,25,30)
): Partial<RepaymentSchedule>[] {
  const monthlyPrincipal = loanAmount / periods;
  const monthlyRate = interestRate / 12;
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;
  const start = new Date(startDate);

  for (let i = 1; i <= periods; i++) {
    const dueDate = new Date(start.getFullYear(), start.getMonth() + i, repaymentDay);
    const interest = balance * monthlyRate;
    const principal = Math.round(monthlyPrincipal);
    schedules.push({
      ContractId: contractId,
      PeriodNumber: i,
      DueDate: dueDate.toISOString().split('T')[0],
      PrincipalAmount: principal,
      InterestAmount: Math.round(interest),
      TotalAmount: Math.round(principal + interest),
      IsPaid: false,
    });
    balance -= principal;
  }
  return schedules;
}

export const LoanPortfolioView: React.FC = () => {
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
  const [ratePreferential, setRatePreferential] = useState('');
  const [ratePreferentialMonths, setRatePreferentialMonths] = useState('');
  const [rateBase, setRateBase] = useState('');
  const [rateMargin, setRateMargin] = useState('');

  // Selected Collateral IDs for current contract
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);

  // Schedule gen form
  const [schedPeriods, setSchedPeriods] = useState('12');
  const [schedRepayDay, setSchedRepayDay] = useState('15');
  const [isGenerating, setIsGenerating] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all customers for dropdown on mount
  useEffect(() => {
    fetchCustomersAPI().then(setAllCustomers).catch(() => {});
  }, []);

  // Auto-calculate End Dates when Effective Date / Disbursement Date / Tenor changes
  useEffect(() => {
    if (form.ContractStartDate && form.LoanTenorMonths) {
      const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
      if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
        setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
      }
    }
  }, [form.ContractStartDate, form.LoanTenorMonths]);

  useEffect(() => {
    if (form.DisbursementDate && form.LoanTenorMonths) {
      const calculatedKunnEnd = addMonthsToDate(form.DisbursementDate, form.LoanTenorMonths);
      if (calculatedKunnEnd && calculatedKunnEnd !== form.KunnDueDate) {
        setForm(prev => ({ ...prev, KunnDueDate: calculatedKunnEnd }));
      }
    }
  }, [form.DisbursementDate, form.LoanTenorMonths]);

  // Derived Rates Calculations
  const prefVal = parseFloat(ratePreferential) || 0;
  const baseVal = parseFloat(rateBase) || 0;
  const marginVal = parseFloat(rateMargin) || 0;

  const postPrefRate = prefVal + marginVal; // LSUD + Biên độ
  const normalRate = baseVal + marginVal;    // LSCS + Biên độ

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
      const customers = await fetchCustomersAPI({
        cif: searchCif.trim() || undefined,
        name: searchName.trim() || undefined,
      });

      let matchedCustomer: Customer | null = null;

      if (searchContract.trim() && !matchedCustomer) {
        const allCust = customers.length > 0 ? customers : await fetchCustomersAPI({});
        for (const c of allCust) {
          const cons = await fetchContractsByCustomerAPI(c.Id);
          const found = cons.find(con => con.ContractNumber?.toLowerCase().includes(searchContract.toLowerCase()));
          if (found) { matchedCustomer = c; setContracts(cons); break; }
        }
      } else if (customers.length > 0) {
        matchedCustomer = customers[0];
        const cons = await fetchContractsByCustomerAPI(matchedCustomer.Id);
        setContracts(cons);
      }

      if (!matchedCustomer) {
        showNotify('error', 'Không tìm thấy khách hàng phù hợp.');
      } else {
        setFoundCustomer(matchedCustomer);
        const cols = await fetchCollateralsByCustomerAPI(matchedCustomer.Id);
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
    let pRepay = form.PrincipalRepaymentMethod || 'Trả cuối kỳ';
    let iRepay = form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế';

    if (method === 'Hạn mức tín dụng') {
      pRepay = 'Trả cuối kỳ';
      iRepay = 'Trả hàng tháng theo dư nợ thực tế';
    } else if (method === 'Cho vay từng lần' || method === 'Hạn mức tín dụng từng lần') {
      pRepay = 'Trả đều hàng tháng';
      iRepay = 'Trả hàng tháng theo dư nợ giảm dần';
    } else if (method === 'Cầm cố sổ tiết kiệm') {
      pRepay = 'Trả cuối kỳ';
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
    setForm({
      CustomerId: foundCustomer?.Id,
      ContractType: 0,
      LoanMethod: defaultMethod,
      DebtGroup: 1,
      PrincipalRepaymentMethod: 'Trả cuối kỳ',
      InterestRepaymentMethod: 'Trả hàng tháng theo dư nợ thực tế',
      PrincipalGracePeriodMonths: 0,
      InterestGracePeriodMonths: 0,
      IsSettled: false,
      IsRestructured: false
    });
    setFormCreditLimit('');
    setFormLoanAmount('');
    setFormCurrentBalance('');
    setRatePreferential('');
    setRatePreferentialMonths('');
    setRateBase('');
    setRateMargin('');
    setSelectedCollateralIds([]);
    setShowForm(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const creditLimit = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || undefined;
      const loanAmount = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || undefined;
      const currentBal = parseFloat(formCurrentBalance.replace(/\./g, '').replace(',', '.')) || undefined;

      const prefDec = prefVal ? prefVal / 100 : undefined;
      const baseDec = baseVal ? baseVal / 100 : undefined;
      const marginDec = marginVal ? marginVal / 100 : undefined;
      const postPrefDec = postPrefRate ? postPrefRate / 100 : undefined;
      const normalDec = normalRate ? normalRate / 100 : undefined;

      // Primary interest rate for scheduling = prefDec if active, else normalDec
      const activeInterestRate = prefDec || normalDec || baseDec || undefined;

      const payload: Partial<LoanContract> = {
        ...form,
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

      await saveContractAPI(payload);
      showNotify('success', 'Đã lưu thông tin HĐTD thành công!');
      
      if (foundCustomer) {
        const refreshed = await fetchContractsByCustomerAPI(foundCustomer.Id);
        setContracts(refreshed);
        const updated = refreshed.find(c => c.Id === payload.Id);
        if (updated) { setSelectedContract(updated); populateForm(updated); }
      }
    } catch (err: any) {
      showNotify('error', `Lỗi lưu HĐTD: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!selectedContract) return;
    const loanAmt = selectedContract.LoanAmount || selectedContract.ContractAmount || 0;
    const rate = selectedContract.InterestRate || (selectedContract.NormalRate) || 0;
    const startDate = selectedContract.RepaymentStartDate || selectedContract.DisbursementDate || selectedContract.ContractStartDate;
    const periods = parseInt(schedPeriods) || selectedContract.LoanTenorMonths || 12;
    const repayDay = parseInt(schedRepayDay) || 15;

    if (!loanAmt || !rate || !startDate) {
      showNotify('error', 'Cần nhập đủ: Số tiền nhận nợ, Lãi suất, Ngày bắt đầu trả nợ trước khi tạo lịch!');
      return;
    }

    setIsGenerating(true);
    try {
      await deleteRepaymentSchedulesByContractAPI(selectedContract.Id);

      const generated = generateSchedule(selectedContract.Id, loanAmt, rate, startDate, periods, repayDay);
      await bulkSaveRepaymentSchedulesAPI(generated);

      const refreshed = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      setSchedules(refreshed);
      showNotify('success', `Đã tạo ${refreshed.length} kỳ trả nợ thành công!`);
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

  // Compute total Appraised Collateral Value & Max Allowed Loan based on LTV
  const selectedCollaterals = collaterals.filter(c => selectedCollateralIds.includes(c.Id));
  const totalAppraisedValue = selectedCollaterals.reduce((sum, c) => sum + (c.AppraisedValue || c.Value || 0), 0);
  const maxAllowedLoanLtv = selectedCollaterals.reduce((sum, c) => {
    const val = c.AppraisedValue || c.Value || 0;
    const ltv = c.LtvPercent || 70;
    return sum + (val * ltv / 100);
  }, 0);

  const currentFormCreditLimitNum = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || 0;
  const isLtvExceeded = selectedCollateralIds.length > 0 && maxAllowedLoanLtv > 0 && currentFormCreditLimitNum > maxAllowedLoanLtv;

  // Compute Total Active KUNN vs Credit Limit
  const totalKunnAmount = contracts.reduce((sum, c) => sum + (c.LoanAmount || 0), 0);
  const totalCreditLimit = contracts.reduce((sum, c) => sum + (c.ContractAmount || 0), 0);

  return (
    <div className="space-y-4 text-xs">
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
          <Search className="w-4 h-4" />
          <span>TRA CỨU THÔNG TIN KHOẢN VAY KHÁCH HÀNG</span>
        </div>

        {/* Quick-pick dropdown */}
        <div className="mb-3 relative">
          <label className="block text-slate-500 mb-1 text-[11px] uppercase tracking-wide">⚡ Chọn nhanh từ danh sách Khách hàng</label>
          <div className="relative">
            <input
              type="text"
              value={dropdownQuery}
              onChange={e => { setDropdownQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              placeholder={`Gõ tên hoặc CIF để lọc nhanh... (${allCustomers.length} KH)`}
              className="w-full bg-slate-950 border border-sky-800/60 rounded-xl pl-3 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          {showDropdown && dropdownFiltered.length > 0 && (
            <div className="absolute z-40 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {dropdownFiltered.map(c => (
                <button
                  key={c.Id}
                  type="button"
                  onMouseDown={() => handlePickCustomer(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-sky-600/20 transition-colors flex items-center justify-between group border-b border-slate-800/50 last:border-0"
                >
                  <div>
                    <span className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">{c.FullName}</span>
                    {c.SpouseName && <span className="text-slate-500 ml-2 text-[10px]">KHLQ: {c.SpouseName}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-mono text-sky-400 text-[11px]">{c.CifKh}</span>
                    {c.Phone && <span className="block text-slate-500 text-[10px]">📞 {c.Phone}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-[10px] text-slate-600 uppercase tracking-wider px-2">hoặc tìm kiếm nâng cao</span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-slate-500 mb-1 text-[11px]">Mã CIF Khách hàng</label>
            <input type="text" value={searchCif} onChange={e => setSearchCif(e.target.value)}
              placeholder="005236683..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-slate-500 mb-1 text-[11px]">Họ tên Khách hàng</label>
            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
              placeholder="Lê Ngọc Quế Hân..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-slate-500 mb-1 text-[11px]">Số Hợp Đồng Tín Dụng</label>
            <input type="text" value={searchContract} onChange={e => setSearchContract(e.target.value)}
              placeholder="HDTL-005236683..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors" />
          </div>
          <button type="submit" disabled={isSearching}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl transition-colors shrink-0">
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Đang tìm...' : 'TÌM KIẾM'}</span>
          </button>
          {foundCustomer && (
            <button type="button" onClick={() => {
              setFoundCustomer(null); setContracts([]); setCollaterals([]); setSelectedContract(null);
              setShowForm(false); setSearchCif(''); setSearchName('');
              setSearchContract(''); setDropdownQuery('');
            }}
              className="flex items-center space-x-1 text-slate-500 hover:text-slate-300 px-3 py-2 rounded-xl transition-colors">
              <X className="w-4 h-4" />
              <span>Xóa</span>
            </button>
          )}
        </form>
      </div>

      {/* ── NO RESULT YET ── */}
      {!foundCustomer && !isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 space-y-3">
          <Search className="w-12 h-12 text-slate-700" />
          <p className="text-sm">Nhập thông tin hoặc Chọn nhanh Khách hàng từ danh sách để bắt đầu</p>
        </div>
      )}

      {/* ── RESULTS & MAIN DASHBOARD ── */}
      {foundCustomer && (
        <div className="space-y-4">
          {/* Customer Header summary card */}
          <div className="bg-slate-900 border border-sky-900/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-sky-600 rounded-full p-2.5 shadow-lg shadow-sky-600/30">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                  <span>{foundCustomer.FullName}</span>
                  <span className="text-xs font-mono font-normal bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded-md">
                    CIF: {foundCustomer.CifKh}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] flex flex-wrap items-center gap-3 mt-1">
                  {foundCustomer.CifKhlq && <span>CIF KHLQ: <span className="text-purple-400 font-mono">{foundCustomer.CifKhlq}</span></span>}
                  {foundCustomer.Phone && <span>📞 {foundCustomer.Phone}</span>}
                  <span>TSBĐ hiện có: <span className="text-emerald-400 font-bold">{collaterals.length} tài sản</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right border-r border-slate-800 pr-4">
                <div className="text-slate-500 text-[10px] uppercase">Tổng mức cấp HĐTD</div>
                <div className="text-sky-400 font-bold">{fmtMoney(totalCreditLimit)}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-[10px] uppercase">Tổng số dư KUNN</div>
                <div className="text-emerald-400 font-bold">{fmtMoney(totalKunnAmount)}</div>
              </div>
              <button onClick={handleNewContract}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs shadow-lg shadow-emerald-600/20">
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo HĐTD mới</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
            {[
              { id: 'kunn' as const, label: 'Danh sách KUNN & HĐTD', icon: Receipt },
              { id: 'schedule' as const, label: 'Lịch Thu Nợ', icon: Calendar },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mainTab === id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <span className="font-bold text-slate-300 flex items-center space-x-2 text-xs">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {contracts.length} KHOẢN VAY</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Nhấp vào dòng để xem chi tiết / cập nhật HĐTD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3 whitespace-nowrap">SỐ HĐTD</th>
                        <th className="p-3 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ</th>
                        <th className="p-3 whitespace-nowrap text-right">DƯ NỢ HIỆN HỮU</th>
                        <th className="p-3 whitespace-nowrap">LÃI SUẤT AP</th>
                        <th className="p-3 whitespace-nowrap">NGÀY GIẢI NGÂN</th>
                        <th className="p-3 whitespace-nowrap">NGÀY KẾT THÚC</th>
                        <th className="p-3 whitespace-nowrap">PHƯƠNG THỨC VAY</th>
                        <th className="p-3 whitespace-nowrap">NHÓM NỢ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {contracts.length === 0 ? (
                        <tr><td colSpan={8} className="text-center p-8 text-slate-600">
                          Chưa có Giấy Nhận Nợ nào. Nhấn "Tạo HĐTD mới" để nhập khoản vay.
                        </td></tr>
                      ) : contracts.map(c => {
                        const isSelected = selectedContract?.Id === c.Id;
                        const dg = c.DebtGroup || 1;
                        return (
                          <tr key={c.Id}
                            onClick={() => handleSelectContract(c)}
                            className={`cursor-pointer transition-colors ${isSelected
                              ? 'bg-sky-950/50 border-l-4 border-l-sky-500 font-medium'
                              : 'hover:bg-slate-800/30'
                            }`}>
                            <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">
                              <div className="flex items-center space-x-1">
                                {isSelected && <ChevronRight className="w-3.5 h-3.5 text-sky-400" />}
                                <span>{c.ContractNumber}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                              {fmtMoney(c.LoanAmount || c.ContractAmount)}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-400 whitespace-nowrap">
                              {fmtMoney(c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount)}
                            </td>
                            <td className="p-3 text-sky-300 font-mono whitespace-nowrap">{fmtRate(c.InterestRate || c.NormalRate)}</td>
                            <td className="p-3 text-slate-300 whitespace-nowrap">{fmtDate(c.DisbursementDate || c.ContractStartDate)}</td>
                            <td className="p-3 text-slate-300 whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                {c.LoanMethod || (c.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần')}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {dg > 1 ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${DEBT_GROUP_COLORS[dg]}`}>
                                  {DEBT_GROUP_LABELS[dg]}
                                </span>
                              ) : <span className="text-slate-500 font-medium">Nhóm 1</span>}
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>{selectedContract ? `THÔNG TIN HỢP ĐỒNG TÍN DỤNG: ${selectedContract.ContractNumber}` : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}</span>
                    </h3>
                    <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveContract} className="space-y-6">
                    {/* SECTION 1: thông tin chung khách hàng & phương thức vay */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Tên Khách hàng vay</label>
                        <input type="text" readOnly
                          value={foundCustomer ? foundCustomer.FullName : ''}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold cursor-default" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Mã CIF KH</label>
                        <input type="text" readOnly
                          value={foundCustomer ? foundCustomer.CifKh : ''}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold cursor-default" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Số Hợp Đồng Tín Dụng</label>
                        <input type="text" value={form.ContractNumber || ''}
                          onChange={e => setForm(f => ({ ...f, ContractNumber: e.target.value }))}
                          placeholder="HDTD-71803/2026..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Phương thức vay *</label>
                        <select required value={form.LoanMethod || LOAN_METHODS[0]}
                          onChange={e => handleLoanMethodChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500">
                          {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* SECTION 2: Thời hạn & Ngày tháng (Có tự động tính toán ngày kết thúc) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày HĐ có hiệu lực</label>
                        <input type="date" value={form.ContractStartDate || ''}
                          onChange={e => setForm(f => ({ ...f, ContractStartDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 flex items-center justify-between">
                          <span>Thời hạn vay (tháng)</span>
                        </label>
                        <input type="number" min={1} value={form.LoanTenorMonths || ''}
                          onChange={e => setForm(f => ({ ...f, LoanTenorMonths: parseInt(e.target.value) || undefined }))}
                          placeholder="12, 120, 240..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 flex items-center space-x-1">
                          <span>Ngày kết thúc HĐ</span>
                          <span className="text-[10px] text-sky-400 font-semibold">(Tự động tính)</span>
                        </label>
                        <input type="date" value={form.ContractEndDate || ''}
                          onChange={e => setForm(f => ({ ...f, ContractEndDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Phân loại Nhóm nợ</label>
                        <select value={form.DebtGroup ?? 1}
                          onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500">
                          {[1,2,3,4,5].map(g => <option key={g} value={g}>Nhóm {g}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* SECTION 3: KUNN Detail Dates */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày giải ngân (bắt đầu KUNN)</label>
                        <input type="date" value={form.DisbursementDate || ''}
                          onChange={e => setForm(f => ({ ...f, DisbursementDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Thời hạn KUNN</label>
                        <input type="text" value={form.KunnTenor || ''}
                          onChange={e => setForm(f => ({ ...f, KunnTenor: e.target.value }))}
                          placeholder="5T / 12 tháng..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 flex items-center space-x-1">
                          <span>Ngày kết thúc KUNN</span>
                          <span className="text-[10px] text-sky-400 font-semibold">(Tự động tính)</span>
                        </label>
                        <input type="date" value={form.KunnDueDate || ''}
                          onChange={e => setForm(f => ({ ...f, KunnDueDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày bắt đầu trả nợ</label>
                        <input type="date" value={form.RepaymentStartDate || ''}
                          onChange={e => setForm(f => ({ ...f, RepaymentStartDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>

                    {/* SECTION 4: Purpose & Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Mục đích vay vốn</label>
                        <select value={form.LoanPurposeType || ''}
                          onChange={e => setForm(f => ({ ...f, LoanPurposeType: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500">
                          <option value="">-- Chọn mục đích --</option>
                          {LOAN_PURPOSE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Mô tả chi tiết mục đích vay</label>
                        <input type="text" value={form.LoanPurpose || ''}
                          onChange={e => setForm(f => ({ ...f, LoanPurpose: e.target.value }))}
                          placeholder="Bổ sung vốn kinh doanh, mua sắm máy móc..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>

                    {/* SECTION 5: THÔNG TIN SỐ TIỀN (Sạch sẽ, không chú thích rườm rà) */}
                    <div className="bg-slate-950 rounded-xl p-4 space-y-3 border border-slate-800">
                      <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>THÔNG TIN SỐ TIỀN VAY</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Tổng mức cấp (HĐTD)</label>
                          <input type="text" value={formCreditLimit}
                            onChange={e => setFormCreditLimit(formatMoneyInput(e.target.value))}
                            placeholder="960.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold text-sm focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Số tiền nhận nợ (KUNN)</label>
                          <input type="text" value={formLoanAmount}
                            onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
                            placeholder="960.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Dư nợ hiện hữu</label>
                          <input type="text" value={formCurrentBalance}
                            onChange={e => setFormCurrentBalance(formatMoneyInput(e.target.value))}
                            placeholder="944.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500" />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 6: CHI TIẾT LÃI SUẤT (LSUD, LSCS, Biên độ) */}
                    <div className="bg-slate-950 rounded-xl p-4 space-y-3 border border-slate-800">
                      <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                        <span>CẤU TRÚC LÃI SUẤT CHUYÊN SÂU</span>
                        <span className="text-[10px] text-slate-500 font-normal">Công thức: LS sau ưu đãi = LSUD + Biên độ | LS thông thường = LSCS + Biên độ</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1">Lãi suất ưu đãi (LSUD) %</label>
                          <input type="number" step="0.01" min={0} value={ratePreferential}
                            onChange={e => setRatePreferential(e.target.value)}
                            placeholder="7.5"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Thời gian ưu đãi (tháng)</label>
                          <input type="number" min={0} value={ratePreferentialMonths}
                            onChange={e => setRatePreferentialMonths(e.target.value)}
                            placeholder="6, 12..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-rose-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Lãi suất cơ sở (LSCS) %</label>
                          <input type="number" step="0.01" min={0} value={rateBase}
                            onChange={e => setRateBase(e.target.value)}
                            placeholder="8.5"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Biên độ cộng thêm %</label>
                          <input type="number" step="0.01" min={0} value={rateMargin}
                            onChange={e => setRateMargin(e.target.value)}
                            placeholder="3.5"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400">Lãi suất sau ưu đãi:</span>
                          <span className="font-mono font-bold text-amber-400 text-sm">{postPrefRate.toFixed(2)} %/năm</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400">Lãi suất thông thường:</span>
                          <span className="font-mono font-bold text-rose-400 text-sm">{normalRate.toFixed(2)} %/năm</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 7: PHƯƠNG THỨC TRẢ NỢ & ÂN HẠN */}
                    <div className="bg-slate-950 rounded-xl p-4 space-y-3 border border-slate-800">
                      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        PHƯƠNG THỨC TRẢ NỢ & ÂN HẠN
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1">Cách thức trả gốc</label>
                          <select value={form.PrincipalRepaymentMethod || ''}
                            onChange={e => setForm(f => ({ ...f, PrincipalRepaymentMethod: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            {PRINCIPAL_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Cách thức trả lãi</label>
                          <select value={form.InterestRepaymentMethod || ''}
                            onChange={e => setForm(f => ({ ...f, InterestRepaymentMethod: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            {INTEREST_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1">Ân hạn gốc (tháng)</label>
                          <input type="number" min={0} value={form.PrincipalGracePeriodMonths ?? 0}
                            onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Ân hạn lãi (tháng)</label>
                          <input type="number" min={0} value={form.InterestGracePeriodMonths ?? 0}
                            onChange={e => setForm(f => ({ ...f, InterestGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 8: BẢO ĐẢM TÀI SẢN (N-N Relationship Check) */}
                    <div className="bg-slate-950 rounded-xl p-4 space-y-3 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>TÀI SẢN BẢO ĐẢM LIÊN KẾT (1 HĐTD — N TSBĐ)</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Định giá TSBĐ: {fmtMoney(totalAppraisedValue)}</span>
                      </div>

                      {collaterals.length === 0 ? (
                        <div className="text-slate-500 text-xs py-2 italic">
                          Khách hàng này chưa có tài sản bảo đảm nào trong hệ thống.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {collaterals.map(col => {
                            const isChecked = selectedCollateralIds.includes(col.Id);
                            const val = col.AppraisedValue || col.Value || 0;
                            const ltv = col.LtvPercent || 70;
                            const maxLoanCol = val * ltv / 100;
                            return (
                              <label key={col.Id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-sky-950/60 border-sky-500 text-slate-100'
                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}>
                                <div className="flex items-center space-x-3">
                                  <input type="checkbox" checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) setSelectedCollateralIds(prev => [...prev, col.Id]);
                                      else setSelectedCollateralIds(prev => prev.filter(id => id !== col.Id));
                                    }}
                                    className="w-4 h-4 rounded text-sky-600" />
                                  <div>
                                    <div className="font-bold text-xs">{col.AssetType || 'TSBĐ'} — {col.Address || col.AssetCode}</div>
                                    <div className="text-[10px] text-slate-500">Giá trị: {fmtMoney(val)} | LTV: {ltv}%</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">Tối đa vay: {fmtMoney(maxLoanCol)}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* LTV Constraint Alert */}
                      {isLtvExceeded && (
                        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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
                        <span className="text-slate-300 font-medium">Hợp đồng đã tất toán</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={form.IsRestructured ?? false}
                          onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
                          className="w-4 h-4 rounded text-sky-600" />
                        <span className="text-slate-300 font-medium">Hợp đồng đã tái cơ cấu nợ</span>
                      </label>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/30 text-sm">
                      {loading ? 'Đang lưu...' : (selectedContract ? 'CẬP NHẬT HỢP ĐỒNG TÍN DỤNG' : 'LƯU HỢP ĐỒNG TÍN DỤNG')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: SCHEDULE MANAGEMENT ── */}
          {mainTab === 'schedule' && (
            <div className="space-y-4">
              {/* Select contract */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="font-bold text-slate-300 mb-3 flex items-center space-x-2 text-xs">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>CHỌN HỢP ĐỒNG TÍN DỤNG ĐỂ XEM / TẠO LỊCH THU NỢ</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {contracts.map(c => (
                    <button key={c.Id} onClick={() => handleSelectContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        selectedContract?.Id === c.Id
                          ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-sky-700'
                      }`}>
                      {c.ContractNumber} ({fmtMoney(c.LoanAmount || c.ContractAmount)})
                    </button>
                  ))}
                </div>

                {selectedContract && (
                  <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="block text-slate-500 mb-1 text-[11px]">Số kỳ trả nợ (tháng)</label>
                      <input type="number" value={schedPeriods} onChange={e => setSchedPeriods(e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-sky-500 text-center font-bold" />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 text-[11px]">Ngày trả trong tháng</label>
                      <select value={schedRepayDay} onChange={e => setSchedRepayDay(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-sky-500 font-bold">
                        {['1','5','10','15','20','25','28','30'].map(d => <option key={d} value={d}>Ngày {d}</option>)}
                      </select>
                    </div>
                    <button onClick={handleGenerateSchedule} disabled={isGenerating}
                      className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs shadow-lg shadow-amber-600/20">
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Đang tạo...' : 'Tạo tự động lịch thu nợ'}</span>
                    </button>
                    {selectedContract && (
                      <div className="text-[11px] text-slate-400 flex flex-col ml-auto">
                        <span>Số tiền tính lãi: <span className="text-emerald-400 font-bold">{fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount)}</span></span>
                        <span>Lãi suất áp dụng: <span className="text-rose-400 font-bold">{fmtRate(selectedContract.InterestRate || selectedContract.NormalRate)}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <span className="font-bold text-slate-300 text-xs">
                    LỊCH THU NỢ {selectedContract ? `— ${selectedContract.ContractNumber}` : ''} ({schedules.length} kỳ)
                  </span>
                  {schedules.length > 0 && (
                    <div className="text-[11px] text-slate-400 flex items-center space-x-4">
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
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3 text-center">KỲ</th>
                        <th className="p-3">NGÀY ĐẾN HẠN</th>
                        <th className="p-3 text-right">GỐC</th>
                        <th className="p-3 text-right">LÃI</th>
                        <th className="p-3 text-right">TỔNG CỘNG</th>
                        <th className="p-3 text-center">TRẠNG THÁI</th>
                        <th className="p-3">NGÀY TT</th>
                        <th className="p-3 text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {!selectedContract ? (
                        <tr><td colSpan={8} className="text-center p-8 text-slate-600">Chọn một HĐTD để xem lịch thu nợ</td></tr>
                      ) : schedules.length === 0 ? (
                        <tr><td colSpan={8} className="text-center p-8 text-slate-600">
                          Chưa có lịch thu nợ. Nhấn "Tạo tự động lịch thu nợ" để tính toán.
                        </td></tr>
                      ) : schedules.map(s => (
                        <tr key={s.Id} className={`transition-colors ${s.IsPaid ? 'bg-emerald-950/10' : ''} hover:bg-slate-800/30`}>
                          <td className="p-3 text-center font-bold text-slate-300">{s.PeriodNumber}</td>
                          <td className="p-3 text-slate-300 font-mono">{fmtDate(s.DueDate)}</td>
                          <td className="p-3 text-right text-sky-400 font-mono font-bold">{(s.PrincipalAmount || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-right text-rose-400 font-mono font-bold">{(s.InterestAmount || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-right font-bold text-amber-400 font-mono text-sm">{(s.TotalAmount || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-center">
                            {s.IsPaid ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ✓ Đã TT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Chờ TT
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">{s.IsPaid ? fmtDate(s.PaymentDate) : '—'}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleMarkPaid(s)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                s.IsPaid
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                                  : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30'
                              }`}>
                              {s.IsPaid ? 'Hủy TT' : 'Đánh dấu TT'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {schedules.length > 0 && (
                      <tfoot className="bg-slate-950 border-t border-slate-800 sticky bottom-0 font-bold text-slate-200">
                        <tr>
                          <td className="p-3" colSpan={2}>TỔNG CỘNG LỊCH THU NỢ</td>
                          <td className="p-3 text-right text-sky-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.PrincipalAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-right text-rose-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.InterestAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-right text-amber-400 font-mono">
                            {schedules.reduce((a, s) => a + (s.TotalAmount || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
