import React, { useState, useEffect } from 'react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI, saveContractAPI,
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI, deleteRepaymentSchedulesByContractAPI
} from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { LoanContract, Customer, RepaymentSchedule } from '../../types';
import {
  Search, FileText, Receipt, Calendar, CheckCircle, AlertCircle,
  User, ChevronRight, Plus, RefreshCw, X, ChevronDown
} from 'lucide-react';

const LOAN_PURPOSE_TYPES = ['Kinh doanh', 'Tiêu dùng', 'Sửa chữa nhà', 'Mua bất động sản', 'Khác'];
const DEBT_GROUP_LABELS: Record<number, string> = { 1: 'Nhóm 1', 2: 'Nhóm 2', 3: 'Nhóm 3', 4: 'Nhóm 4', 5: 'Nhóm 5' };
const DEBT_GROUP_COLORS: Record<number, string> = {
  2: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  3: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  4: 'bg-red-500/15 text-red-400 border border-red-500/30',
  5: 'bg-red-900/30 text-red-300 border border-red-700/40',
};

const fmtMoney = (v?: number | null) => v ? v.toLocaleString('vi-VN') + ' VNĐ' : '—';
const fmtRate = (v?: number | null) => v ? (v * 100).toFixed(2) + '%/năm' : '—';
const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('vi-VN'); } catch { return v; }
};

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
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);

  // Tab
  const [mainTab, setMainTab] = useState<'kunn' | 'schedule'>('kunn');
  const [showForm, setShowForm] = useState(false);

  // Form state (HĐTD + KUNN)
  const [form, setForm] = useState<Partial<LoanContract>>({});
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState('');
  const [formCurrentBalance, setFormCurrentBalance] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('');

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

  // Filtered dropdown list
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
    const cons = await fetchContractsByCustomerAPI(c.Id);
    setContracts(cons);
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
    setSelectedContract(null);
    setShowForm(false);

    try {
      const customers = await fetchCustomersAPI({
        cif: searchCif.trim() || undefined,
        name: searchName.trim() || undefined,
      });

      let matchedCustomer: Customer | null = null;

      // If searching by contract number
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
      }
    } catch (err: any) {
      showNotify('error', `Lỗi tìm kiếm: ${err.message}`);
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
    // Load schedule
    const s = await fetchRepaymentSchedulesAPI(c.Id);
    setSchedules(s);
  };

  const populateForm = (c: LoanContract) => {
    setForm({
      Id: c.Id,
      CustomerId: c.CustomerId,
      ContractNumber: c.ContractNumber,
      ContractType: c.ContractType,
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
      IsSettled: c.IsSettled ?? false,
      IsRestructured: c.IsRestructured ?? false,
    });
    setFormCreditLimit(c.ContractAmount ? c.ContractAmount.toLocaleString('vi-VN') : '');
    setFormLoanAmount(c.LoanAmount ? c.LoanAmount.toLocaleString('vi-VN') : '');
    setFormCurrentBalance(c.CurrentBalance ? c.CurrentBalance.toLocaleString('vi-VN') : '');
    setFormInterestRate(c.InterestRate ? (c.InterestRate * 100).toString() : '');
  };

  const handleNewContract = () => {
    setSelectedContract(null);
    setSchedules([]);
    setForm({ CustomerId: foundCustomer?.Id, ContractType: 1, DebtGroup: 1, IsSettled: false, IsRestructured: false });
    setFormCreditLimit('');
    setFormLoanAmount('');
    setFormCurrentBalance('');
    setFormInterestRate('');
    setShowForm(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const creditLimit = parseFloat(formCreditLimit.replace(/\./g, '').replace(',', '.')) || undefined;
      const loanAmount = parseFloat(formLoanAmount.replace(/\./g, '').replace(',', '.')) || undefined;
      const currentBal = parseFloat(formCurrentBalance.replace(/\./g, '').replace(',', '.')) || undefined;
      const rate = formInterestRate ? parseFloat(formInterestRate) / 100 : undefined;

      const payload: Partial<LoanContract> = {
        ...form,
        ContractAmount: creditLimit,
        LoanAmount: loanAmount ?? creditLimit,
        CurrentBalance: currentBal ?? loanAmount ?? creditLimit,
        InterestRate: rate,
      };

      await saveContractAPI(payload);
      showNotify('success', 'Đã lưu thông tin HĐTD thành công!');
      // Refresh
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
    const rate = selectedContract.InterestRate || 0;
    const startDate = selectedContract.RepaymentStartDate || selectedContract.DisbursementDate;
    const periods = parseInt(schedPeriods) || 12;
    const repayDay = parseInt(schedRepayDay) || 15;

    if (!loanAmt || !rate || !startDate) {
      showNotify('error', 'Cần nhập đủ: Số tiền nhận nợ, Lãi suất, Ngày bắt đầu trả nợ trước khi tạo lịch!');
      return;
    }

    setIsGenerating(true);
    try {
      // Delete existing schedules for this contract
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
      // Update via API (we can use saveRepaymentScheduleAPI but it's an update)
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

  // ─── KUNN TABLE ──────────────────────────────────────────────────────────
  const kunnContracts = contracts; // Each contract row = a KUNN

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 text-xs">
      {/* Notification */}
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
          <span>TRA CỨU THÔNG TIN KHOẢN VAY</span>
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
          {showDropdown && dropdownQuery.trim().length > 0 && dropdownFiltered.length === 0 && (
            <div className="absolute z-40 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-4 py-3 text-slate-500 text-xs">
              Không tìm thấy khách hàng phù hợp.
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-[10px] text-slate-600 uppercase tracking-wider px-2">hoặc tìm theo thông tin</span>
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
              setFoundCustomer(null); setContracts([]); setSelectedContract(null);
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
          <p className="text-sm">Nhập thông tin Khách hàng và nhấn Tìm kiếm để bắt đầu</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {foundCustomer && (
        <div className="space-y-4">
          {/* Customer card */}
          <div className="bg-slate-900 border border-sky-900/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-sky-600 rounded-full p-2.5">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-100 text-sm">{foundCustomer.FullName}</div>
                <div className="text-slate-400 text-[11px] flex items-center space-x-3 mt-0.5">
                  <span>CIF: <span className="text-sky-400 font-mono">{foundCustomer.CifKh}</span></span>
                  {foundCustomer.CifKhlq && <span>CIF KHLQ: <span className="text-purple-400 font-mono">{foundCustomer.CifKhlq}</span></span>}
                  {foundCustomer.Phone && <span>📞 {foundCustomer.Phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-slate-500 text-[11px]">Tổng KUNN</div>
                <div className="text-sky-400 font-bold">{contracts.length} khoản</div>
              </div>
              <button onClick={handleNewContract}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs">
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm HĐTD mới</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
            {[
              { id: 'kunn' as const, label: 'Danh sách KUNN & HĐTD', icon: Receipt },
              { id: 'schedule' as const, label: 'Lịch Thu Nợ', icon: Calendar },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mainTab === id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB: KUNN + HĐTD ── */}
          {mainTab === 'kunn' && (
            <div className="space-y-4">
              {/* KUNN Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {kunnContracts.length} khoản</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Nhấp vào dòng để xem / chỉnh sửa HĐTD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3 whitespace-nowrap">SỐ HĐTD</th>
                        <th className="p-3 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ</th>
                        <th className="p-3 whitespace-nowrap text-right">TỔNG MỨC CẤP</th>
                        <th className="p-3 whitespace-nowrap text-right">DƯ NỢ HIỆN HỮU</th>
                        <th className="p-3 whitespace-nowrap">LÃI SUẤT</th>
                        <th className="p-3 whitespace-nowrap">NGÀY GIẢI NGÂN</th>
                        <th className="p-3 whitespace-nowrap">NGÀY KẾT THÚC</th>
                        <th className="p-3 whitespace-nowrap">NHÓM NỢ</th>
                        <th className="p-3 whitespace-nowrap">LOẠI HĐ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {kunnContracts.length === 0 ? (
                        <tr><td colSpan={9} className="text-center p-8 text-slate-600">
                          Chưa có KUNN nào. Nhấn "Thêm HĐTD mới" để tạo.
                        </td></tr>
                      ) : kunnContracts.map(c => {
                        const isSelected = selectedContract?.Id === c.Id;
                        const dg = c.DebtGroup || 1;
                        return (
                          <tr key={c.Id}
                            onClick={() => handleSelectContract(c)}
                            className={`cursor-pointer transition-colors ${isSelected
                              ? 'bg-sky-950/50 border-l-4 border-l-sky-500'
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
                            <td className="p-3 text-right text-slate-300 whitespace-nowrap">
                              {fmtMoney(c.ContractAmount)}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-400 whitespace-nowrap">
                              {fmtMoney(c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount)}
                            </td>
                            <td className="p-3 text-sky-300 whitespace-nowrap">{fmtRate(c.InterestRate)}</td>
                            <td className="p-3 text-slate-300 whitespace-nowrap">{fmtDate(c.DisbursementDate)}</td>
                            <td className="p-3 text-slate-300 whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                            <td className="p-3 whitespace-nowrap">
                              {dg > 1 ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${DEBT_GROUP_COLORS[dg]}`}>
                                  {DEBT_GROUP_LABELS[dg]}
                                </span>
                              ) : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                c.ContractType === 0
                                  ? 'bg-sky-500/10 text-sky-400'
                                  : 'bg-purple-500/10 text-purple-400'
                              }`}>
                                {c.ContractType === 0 ? 'HMTD' : 'Từng lần'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HĐTD Detail Form */}
              {showForm && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>{selectedContract ? `HĐTD: ${selectedContract.ContractNumber}` : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}</span>
                    </h3>
                    <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveContract} className="space-y-5">
                    {/* Row 1: Số HĐ + Loại + Tên KH */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Số Hợp Đồng <span className="text-slate-600 text-[10px]">(tùy chọn)</span></label>
                        <input type="text" value={form.ContractNumber || ''}
                          onChange={e => setForm(f => ({ ...f, ContractNumber: e.target.value }))}
                          placeholder="71803.2023..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Loại Hợp Đồng *</label>
                        <select required value={form.ContractType ?? 1}
                          onChange={e => setForm(f => ({ ...f, ContractType: Number(e.target.value) }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500">
                          <option value={0}>Hạn Mức Tín Dụng (HMTD)</option>
                          <option value={1}>Cho Vay Từng Lần (Term Loan)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Khách hàng vay</label>
                        <input type="text" readOnly
                          value={foundCustomer ? `${foundCustomer.FullName} (${foundCustomer.CifKh})` : ''}
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-slate-400 cursor-default" />
                      </div>
                    </div>

                    {/* Row 2: Dates */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày HĐ có hiệu lực</label>
                        <input type="date" value={form.ContractStartDate || ''}
                          onChange={e => setForm(f => ({ ...f, ContractStartDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày kết thúc HĐ</label>
                        <input type="date" value={form.ContractEndDate || ''}
                          onChange={e => setForm(f => ({ ...f, ContractEndDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Thời hạn vay (tháng)</label>
                        <input type="number" min={1} value={form.LoanTenorMonths || ''}
                          onChange={e => setForm(f => ({ ...f, LoanTenorMonths: Number(e.target.value) || undefined }))}
                          placeholder="120"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Nhóm nợ</label>
                        <select value={form.DebtGroup ?? 1}
                          onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500">
                          {[1,2,3,4,5].map(g => <option key={g} value={g}>Nhóm {g}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: KUNN dates */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày giải ngân (KUNN)</label>
                        <input type="date" value={form.DisbursementDate || ''}
                          onChange={e => setForm(f => ({ ...f, DisbursementDate: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Thời hạn KUNN</label>
                        <input type="text" value={form.KunnTenor || ''}
                          onChange={e => setForm(f => ({ ...f, KunnTenor: e.target.value }))}
                          placeholder="5T / 10 năm..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Ngày kết thúc KUNN</label>
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

                    {/* Row 4: Purpose */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Mục đích vay</label>
                        <select value={form.LoanPurposeType || ''}
                          onChange={e => setForm(f => ({ ...f, LoanPurposeType: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500">
                          <option value="">-- Chọn mục đích --</option>
                          {LOAN_PURPOSE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Mô tả chi tiết mục đích</label>
                        <input type="text" value={form.LoanPurpose || ''}
                          onChange={e => setForm(f => ({ ...f, LoanPurpose: e.target.value }))}
                          placeholder="Chi tiết mục đích sử dụng vốn..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>

                    {/* Row 5: Amounts */}
                    <div className="bg-slate-950 rounded-xl p-4 space-y-3">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Thông tin Số Tiền</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1">
                            Tổng mức cấp (HĐTD) <span className="text-slate-600 text-[10px]">— ngắn hạn = số tiền giải ngân</span>
                          </label>
                          <input type="text" value={formCreditLimit}
                            onChange={e => setFormCreditLimit(formatMoneyInput(e.target.value))}
                            placeholder="960.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">
                            Số tiền nhận nợ (KUNN) <span className="text-slate-600 text-[10px]">— số tiền giải ngân thực tế</span>
                          </label>
                          <input type="text" value={formLoanAmount}
                            onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
                            placeholder="960.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">
                            Dư nợ hiện hữu <span className="text-slate-600 text-[10px]">— dài hạn: giảm dần khi trả gốc</span>
                          </label>
                          <input type="text" value={formCurrentBalance}
                            onChange={e => setFormCurrentBalance(formatMoneyInput(e.target.value))}
                            placeholder="944.000.000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Lãi suất (%/năm)</label>
                          <input type="number" step="0.01" min={0} value={formInterestRate}
                            onChange={e => setFormInterestRate(e.target.value)}
                            placeholder="9.5"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={form.IsSettled ?? false}
                          onChange={e => setForm(f => ({ ...f, IsSettled: e.target.checked }))}
                          className="w-4 h-4 rounded" />
                        <span className="text-slate-400">Đã tất toán</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={form.IsRestructured ?? false}
                          onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
                          className="w-4 h-4 rounded" />
                        <span className="text-slate-400">Đã tái cơ cấu</span>
                      </label>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20">
                      {loading ? 'Đang lưu...' : (selectedContract ? 'CẬP NHẬT HĐTD' : 'LƯU HỢP ĐỒNG TÍN DỤNG')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SCHEDULE ── */}
          {mainTab === 'schedule' && (
            <div className="space-y-4">
              {/* Select contract */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="font-bold text-slate-300 mb-3 flex items-center space-x-2 text-xs">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>CHỌN HĐTD ĐỂ XEM / TẠO LỊCH THU NỢ</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {contracts.map(c => (
                    <button key={c.Id} onClick={() => handleSelectContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        selectedContract?.Id === c.Id
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-sky-700'
                      }`}>
                      {c.ContractNumber}
                    </button>
                  ))}
                </div>

                {selectedContract && (
                  <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="block text-slate-500 mb-1 text-[11px]">Số kỳ trả nợ</label>
                      <input type="number" value={schedPeriods} onChange={e => setSchedPeriods(e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-sky-500 text-center" />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 text-[11px]">Ngày trả trong tháng</label>
                      <select value={schedRepayDay} onChange={e => setSchedRepayDay(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-sky-500">
                        {['1','5','10','15','20','25','28','30'].map(d => <option key={d} value={d}>Ngày {d}</option>)}
                      </select>
                    </div>
                    <button onClick={handleGenerateSchedule} disabled={isGenerating}
                      className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs">
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Đang tạo...' : 'Tạo lại lịch'}</span>
                    </button>
                    {selectedContract && (
                      <div className="text-[11px] text-slate-500 flex flex-col">
                        <span>Số tiền nhận nợ: <span className="text-emerald-400 font-bold">{fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount)}</span></span>
                        <span>Lãi suất: <span className="text-rose-400 font-bold">{fmtRate(selectedContract.InterestRate)}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-xs">
                    LỊCH THU NỢ {selectedContract ? `— ${selectedContract.ContractNumber}` : ''} ({schedules.length} kỳ)
                  </span>
                  {schedules.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Đã thanh toán: {schedules.filter(s => s.IsPaid).length} kỳ</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Còn lại: {schedules.filter(s => !s.IsPaid).length} kỳ</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
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
                          Chưa có lịch thu nợ. Nhấn "Tạo lại lịch" để tạo tự động.
                        </td></tr>
                      ) : schedules.map(s => (
                        <tr key={s.Id} className={`transition-colors ${s.IsPaid ? 'bg-emerald-950/10' : ''} hover:bg-slate-800/30`}>
                          <td className="p-3 text-center font-bold text-slate-300">{s.PeriodNumber}</td>
                          <td className="p-3 text-slate-300">{fmtDate(s.DueDate)}</td>
                          <td className="p-3 text-right text-sky-400 font-mono">{(s.PrincipalAmount || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-right text-rose-400 font-mono">{(s.InterestAmount || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-right font-bold text-amber-400 font-mono">{(s.TotalAmount || 0).toLocaleString('vi-VN')}</td>
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
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
                      <tfoot className="bg-slate-950 border-t border-slate-800">
                        <tr className="font-bold text-slate-300">
                          <td className="p-3" colSpan={2}>TỔNG CỘNG</td>
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
