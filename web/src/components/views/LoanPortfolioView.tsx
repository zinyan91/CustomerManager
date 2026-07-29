import React, { useEffect, useState } from 'react';
import { fetchContractsAPI, fetchCustomersAPI, saveContractAPI } from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { LoanContract, Customer } from '../../types';
import { FileText, CheckCircle, AlertCircle, Receipt, Plus } from 'lucide-react';

// Giấy Nhận Nợ type (stored in the same LoanContracts table but with HdtdDueDate & LoanPurpose)
type KunnRecord = {
  id: string;
  contractId: number;
  contractNumber: string;
  customerName: string;
  customerCif: string;
  loanAmount: number;
  receiptDate: string;
  dueDate: string;
  purpose: string;
};

export const LoanPortfolioView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'hdtd' | 'kunn'>('hdtd');

  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);

  // Filters
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContractOrAccount, setSearchContractOrAccount] = useState('');
  const [filterType, setFilterType] = useState('Tất cả hợp đồng');

  // HDTD Form Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputContractNumber, setInputContractNumber] = useState('');
  const [inputContractType, setInputContractType] = useState(0); // 0: HMTD, 1: TermLoan
  const [inputCreditLimit, setInputCreditLimit] = useState('');

  // KUNN Form Inputs
  const [kunnContractId, setKunnContractId] = useState<number | ''>('');
  const [kunnAmount, setKunnAmount] = useState('');
  const [kunnReceiptDate, setKunnReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [kunnDueDate, setKunnDueDate] = useState('');
  const [kunnPurpose, setKunnPurpose] = useState('');
  const [kunnSearch, setKunnSearch] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCus, resCon] = await Promise.all([
        fetchCustomersAPI(),
        fetchContractsAPI(),
      ]);
      setCustomers(resCus);
      setContracts(resCon);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách HĐTD: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const cifMatch = !searchCif.trim() || (c.customer?.CifKh && c.customer.CifKh.toLowerCase().includes(searchCif.toLowerCase()));
    const nameMatch = !searchName.trim() || (c.customer?.FullName && c.customer.FullName.toLowerCase().includes(searchName.toLowerCase()));
    const numMatch = !searchContractOrAccount.trim() ||
      (c.ContractNumber && c.ContractNumber.toLowerCase().includes(searchContractOrAccount.toLowerCase())) ||
      (c.customer?.AccountNumber && c.customer.AccountNumber.toLowerCase().includes(searchContractOrAccount.toLowerCase()));

    const typeMatch = filterType === 'Tất cả hợp đồng' ||
      (filterType === 'Hạn Mức Tín Dụng' && c.ContractType === 0) ||
      (filterType === 'Cho Vay Từng Lần' && c.ContractType === 1);

    return cifMatch && nameMatch && numMatch && typeMatch;
  });

  // Derive KUNN list from contracts that have LoanPurpose or HdtdDueDate filled
  const kunnList: KunnRecord[] = contracts
    .filter(c => (c as any).LoanPurpose || (c as any).HdtdDueDate)
    .map(c => ({
      id: `KUNN-${c.Id}`,
      contractId: c.Id,
      contractNumber: c.ContractNumber,
      customerName: c.customer?.FullName || '',
      customerCif: c.customer?.CifKh || '',
      loanAmount: c.ContractAmount || 0,
      receiptDate: (c as any).HdtdDueDate ? new Date((c as any).HdtdDueDate).toLocaleDateString('vi-VN') : '',
      dueDate: '',
      purpose: (c as any).LoanPurpose || '',
    }));

  const filteredKunn = kunnList.filter(k => {
    if (!kunnSearch.trim()) return true;
    const s = kunnSearch.toLowerCase();
    return k.contractNumber.toLowerCase().includes(s) ||
      k.customerName.toLowerCase().includes(s) ||
      k.customerCif.toLowerCase().includes(s) ||
      k.purpose.toLowerCase().includes(s);
  });

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId || !inputContractNumber.trim()) {
      showNotify('error', 'Khách hàng và Số hợp đồng tín dụng là bắt buộc!');
      return;
    }

    const limit = parseFloat(inputCreditLimit.replace(/\D/g, '')) || 0;

    const payload: Partial<LoanContract> = {
      Id: selectedContract?.Id,
      CustomerId: Number(inputCustomerId),
      ContractNumber: inputContractNumber.trim(),
      ContractType: Number(inputContractType),
      ContractAmount: limit,
      DebtGroup: 1
    };

    try {
      await saveContractAPI(payload);
      showNotify('success', 'Đã lưu hợp đồng tín dụng thành công!');
      clearForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu hợp đồng: ${err.message}`);
    }
  };

  const handleSaveKunn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kunnContractId || !kunnAmount) {
      showNotify('error', 'Hợp đồng và Số tiền nhận nợ là bắt buộc!');
      return;
    }

    const amount = parseFloat(kunnAmount.replace(/\D/g, '')) || 0;
    const targetContract = contracts.find(c => c.Id === Number(kunnContractId));
    if (!targetContract) {
      showNotify('error', 'Không tìm thấy hợp đồng!');
      return;
    }

    const payload: Partial<LoanContract> = {
      Id: targetContract.Id,
      CustomerId: targetContract.CustomerId,
      ContractNumber: targetContract.ContractNumber,
      ContractType: targetContract.ContractType,
      ContractAmount: amount,
      DebtGroup: targetContract.DebtGroup,
      LoanPurpose: kunnPurpose || undefined,
      HdtdDueDate: kunnReceiptDate || undefined,
    } as any;

    try {
      await saveContractAPI(payload);
      showNotify('success', 'Đã lưu Giấy Nhận Nợ (KUNN) thành công!');
      clearKunnForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu KUNN: ${err.message}`);
    }
  };

  const clearForm = () => {
    setSelectedContract(null);
    setInputCustomerId('');
    setInputContractNumber('');
    setInputContractType(0);
    setInputCreditLimit('');
  };

  const clearKunnForm = () => {
    setKunnContractId('');
    setKunnAmount('');
    setKunnReceiptDate(new Date().toISOString().split('T')[0]);
    setKunnDueDate('');
    setKunnPurpose('');
  };

  const formatMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

  const subTabClass = (tab: 'hdtd' | 'kunn') =>
    `px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
      activeSubTab === tab
        ? 'bg-sky-600 text-white shadow'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sub-tabs: HĐTD / KUNN */}
      <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl w-fit">
        <button className={subTabClass('hdtd')} onClick={() => setActiveSubTab('hdtd')}>
          <span className="flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Hợp Đồng Tín Dụng (HĐTD)</span>
          </span>
        </button>
        <button className={subTabClass('kunn')} onClick={() => setActiveSubTab('kunn')}>
          <span className="flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Giấy Nhận Nợ (KUNN)</span>
          </span>
        </button>
      </div>

      {/* ========== HĐTD TAB ========== */}
      {activeSubTab === 'hdtd' && (
        <>
          {/* Search bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                TRA CỨU HỢP ĐỒNG TÍN DỤNG
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Tất cả hợp đồng">Tất cả hợp đồng</option>
                <option value="Hạn Mức Tín Dụng">Hạn Mức Tín Dụng (HMTD)</option>
                <option value="Cho Vay Từng Lần">Cho Vay Từng Lần (Term Loan)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Mã CIF KH..." value={searchCif}
                onChange={(e) => setSearchCif(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
              <input type="text" placeholder="Họ tên KH..." value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
              <input type="text" placeholder="Số HĐTD / STK vay..." value={searchContractOrAccount}
                onChange={(e) => setSearchContractOrAccount(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: List */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">DANH SÁCH HỢP ĐỒNG ({filteredContracts.length})</span>
                <span className="text-[11px] text-slate-500">Bấm vào dòng để chọn hợp đồng</span>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3 whitespace-nowrap">SỐ HĐTD</th>
                      <th className="p-3 whitespace-nowrap">KHÁCH HÀNG VAY</th>
                      <th className="p-3 whitespace-nowrap">LOẠI HĐ</th>
                      <th className="p-3 whitespace-nowrap text-right">DƯ NỢ CẤP (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr><td colSpan={4} className="text-center p-8 text-slate-500">Đang tải dữ liệu HĐTD...</td></tr>
                    ) : filteredContracts.length === 0 ? (
                      <tr><td colSpan={4} className="text-center p-8 text-slate-500">Không tìm thấy hợp đồng tín dụng nào.</td></tr>
                    ) : (
                      filteredContracts.map((con) => {
                        const isSelected = selectedContract?.Id === con.Id;
                        return (
                          <tr key={con.Id}
                            onClick={() => {
                              if (selectedContract?.Id === con.Id) clearForm();
                              else {
                                setSelectedContract(con);
                                setInputCustomerId(con.CustomerId);
                                setInputContractNumber(con.ContractNumber);
                                setInputContractType(con.ContractType);
                                setInputCreditLimit(con.ContractAmount ? formatMoneyInput(con.ContractAmount.toString()) : '');
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold' : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">{con.ContractNumber}</td>
                            <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                              {con.customer?.FullName || 'Khách hàng chưa rõ'} ({con.customer?.CifKh || ''})
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                con.ContractType === 0 ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                              }`}>
                                {con.ContractType === 0 ? 'HMTD' : 'Từng lần'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-emerald-400 text-right whitespace-nowrap">
                              {formatMoney(con.ContractAmount || 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Create/Edit Form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>{selectedContract ? 'CẬP NHẬT HỢP ĐỒNG TÍN DỤNG' : 'TẠO MỚI HỢP ĐỒNG TÍN DỤNG'}</span>
                </h3>
                <button onClick={clearForm} className="text-xs text-sky-400 hover:underline font-semibold">+ Tạo mới</button>
              </div>

              <form onSubmit={handleSaveContract} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Khách hàng vay *</label>
                  <select required value={inputCustomerId}
                    onChange={(e) => setInputCustomerId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500">
                    <option value="">-- Chọn Khách hàng vay --</option>
                    {customers.map((c) => (
                      <option key={c.Id} value={c.Id}>👤 {c.FullName} ({c.CifKh})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Số hợp đồng *</label>
                    <input type="text" required value={inputContractNumber}
                      onChange={(e) => setInputContractNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Loại hợp đồng *</label>
                    <select value={inputContractType}
                      onChange={(e) => setInputContractType(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold focus:outline-none focus:border-sky-500">
                      <option value={0}>Hạn Mức Tín Dụng (HMTD)</option>
                      <option value={1}>Cho Vay Từng Lần (Term Loan)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Số tiền cấp HĐTD (VNĐ) *</label>
                  <input type="text" required placeholder="Ví dụ: 960.000.000"
                    value={inputCreditLimit}
                    onChange={(e) => setInputCreditLimit(formatMoneyInput(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-sky-500" />
                </div>

                <button type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20">
                  {selectedContract ? 'CẬP NHẬT HỢP ĐỒNG' : 'LƯU HỢP ĐỒNG TÍN DỤNG'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ========== KUNN TAB ========== */}
      {activeSubTab === 'kunn' && (
        <>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>TRA CỨU GIẤY NHẬN NỢ (KUNN)</span>
              </div>
            </div>
            <input type="text" placeholder="Tìm theo số HĐTD, tên KH, CIF, mục đích vay..."
              value={kunnSearch}
              onChange={(e) => setKunnSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: KUNN list */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">DANH SÁCH GIẤY NHẬN NỢ ({filteredKunn.length})</span>
                <span className="text-[11px] text-slate-500">Giấy nhận nợ liên kết với HĐTD</span>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3 whitespace-nowrap">SỐ KUNN / HĐTD</th>
                      <th className="p-3 whitespace-nowrap">KHÁCH HÀNG</th>
                      <th className="p-3 whitespace-nowrap">MỤC ĐÍCH VAY</th>
                      <th className="p-3 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr><td colSpan={4} className="text-center p-8 text-slate-500">Đang tải dữ liệu...</td></tr>
                    ) : filteredKunn.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-10 text-slate-500">
                          <div className="flex flex-col items-center space-y-3">
                            <Receipt className="w-10 h-10 text-slate-700" />
                            <p>Chưa có Giấy Nhận Nợ nào.</p>
                            <p className="text-[11px] text-slate-600">Tạo KUNN từ form bên phải.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredKunn.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/40 cursor-pointer transition-colors">
                          <td className="p-3 font-mono text-amber-400 font-bold whitespace-nowrap">{k.contractNumber}</td>
                          <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                            {k.customerName} ({k.customerCif})
                          </td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate">{k.purpose || '—'}</td>
                          <td className="p-3 font-bold text-emerald-400 text-right whitespace-nowrap">
                            {formatMoney(k.loanAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Create KUNN Form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>TẠO GIẤY NHẬN NỢ (KUNN)</span>
                </h3>
              </div>

              <form onSubmit={handleSaveKunn} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Chọn Hợp Đồng Tín Dụng *</label>
                  <select required value={kunnContractId}
                    onChange={(e) => setKunnContractId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-amber-500">
                    <option value="">-- Chọn HĐTD --</option>
                    {contracts.map((c) => (
                      <option key={c.Id} value={c.Id}>
                        {c.ContractNumber} — {c.customer?.FullName} ({c.customer?.CifKh})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Số tiền nhận nợ (VNĐ) *</label>
                  <input type="text" required placeholder="Ví dụ: 500.000.000"
                    value={kunnAmount}
                    onChange={(e) => setKunnAmount(formatMoneyInput(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Ngày giải ngân</label>
                    <input type="date" value={kunnReceiptDate}
                      onChange={(e) => setKunnReceiptDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Ngày đến hạn KUNN</label>
                    <input type="date" value={kunnDueDate}
                      onChange={(e) => setKunnDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Mục đích sử dụng vốn</label>
                  <textarea rows={3}
                    placeholder="Mô tả mục đích vay vốn..."
                    value={kunnPurpose}
                    onChange={(e) => setKunnPurpose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 resize-none" />
                </div>

                <button type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-amber-600/20">
                  LƯU GIẤY NHẬN NỢ (KUNN)
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
