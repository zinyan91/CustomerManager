import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { LoanContract, Customer } from '../../types';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

export const LoanPortfolioView: React.FC = () => {
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);

  // Filters
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContractOrAccount, setSearchContractOrAccount] = useState('');
  const [filterType, setFilterType] = useState('Tất cả hợp đồng');

  // Form Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputContractNumber, setInputContractNumber] = useState('');
  const [inputContractType, setInputContractType] = useState(0); // 0: HMTD, 1: TermLoan
  const [inputCreditLimit, setInputCreditLimit] = useState('');
  const [inputInterestRate, setInputInterestRate] = useState('9.5');

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
        supabase.from('Customers').select('*').order('full_name'),
        supabase.from('LoanContracts').select('*, customer:Customers(*), collateral:Collaterals(*)').order('id', { ascending: false }),
      ]);

      if (resCus.data) setCustomers(resCus.data);
      if (resCon.data) setContracts(resCon.data);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách HĐTD: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const cifMatch = !searchCif.trim() || (c.customer?.cif_kh && c.customer.cif_kh.toLowerCase().includes(searchCif.toLowerCase()));
    const nameMatch = !searchName.trim() || (c.customer?.full_name && c.customer.full_name.toLowerCase().includes(searchName.toLowerCase()));
    const numMatch = !searchContractOrAccount.trim() || 
      c.contract_number.toLowerCase().includes(searchContractOrAccount.toLowerCase()) ||
      (c.customer?.account_number && c.customer.account_number.toLowerCase().includes(searchContractOrAccount.toLowerCase()));
    
    const typeMatch = filterType === 'Tất cả hợp đồng' || 
      (filterType === 'Hạn Mức Tín Dụng' && c.contract_type === 0) ||
      (filterType === 'Cho Vay Từng Lần' && c.contract_type === 1);

    return cifMatch && nameMatch && numMatch && typeMatch;
  });

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId || !inputContractNumber.trim()) {
      showNotify('error', 'Khách hàng và Số hợp đồng tín dụng là bắt buộc!');
      return;
    }

    const limit = parseFloat(inputCreditLimit.replace(/\D/g, '')) || 0;
    const rate = parseFloat(inputInterestRate) || 0;

    const payload = {
      customer_id: Number(inputCustomerId),
      contract_number: inputContractNumber.trim(),
      contract_type: Number(inputContractType),
      credit_limit: limit,
      disbursed_amount: limit,
      outstanding_balance: limit,
      interest_rate: rate / 100,
      max_debt_group: 1
    };

    try {
      if (selectedContract) {
        const { error } = await supabase.from('LoanContracts').update(payload).eq('id', selectedContract.id);
        if (error) throw error;
        showNotify('success', 'Đã cập nhật hợp đồng tín dụng thành công!');
      } else {
        const { error } = await supabase.from('LoanContracts').insert([payload]);
        if (error) throw error;
        showNotify('success', 'Đã khởi tạo hợp đồng tín dụng thành công!');
      }

      clearForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu hợp đồng: ${err.message}`);
    }
  };

  const clearForm = () => {
    setSelectedContract(null);
    setInputCustomerId('');
    setInputContractNumber('');
    setInputContractType(0);
    setInputCreditLimit('');
    setInputInterestRate('9.5');
  };

  const formatMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

  return (
    <div className="space-y-4">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            TRA CỨU HỢP ĐỒNG TÍN DỤNG & GIẤY NHẬN NỢ (KUNN)
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
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Họ tên KH..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Số HĐTD / STK vay..."
            value={searchContractOrAccount}
            onChange={(e) => setSearchContractOrAccount(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left DataGrid */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-215px)]">
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
                  <th className="p-3 whitespace-nowrap text-center">LÃI SUẤT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={5} className="text-center p-8 text-slate-500">Đang tải dữ liệu HĐTD...</td></tr>
                ) : filteredContracts.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-slate-500">Không tìm thấy hợp đồng tín dụng nào.</td></tr>
                ) : (
                  filteredContracts.map((con) => {
                    const isSelected = selectedContract?.id === con.id;
                    return (
                      <tr
                        key={con.id}
                        onClick={() => {
                          if (selectedContract?.id === con.id) clearForm();
                          else {
                            setSelectedContract(con);
                            setInputCustomerId(con.customer_id);
                            setInputContractNumber(con.contract_number);
                            setInputContractType(con.contract_type);
                            setInputCreditLimit(con.credit_limit ? con.credit_limit.toLocaleString('vi-VN') : '0');
                            setInputInterestRate((con.interest_rate * 100).toFixed(2));
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">{con.contract_number}</td>
                        <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                          {con.customer?.full_name || 'Khách hàng chưa rõ'} ({con.customer?.cif_kh || ''})
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            con.contract_type === 0 ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {con.contract_type === 0 ? 'HMTD' : 'Từng lần'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400 text-right whitespace-nowrap">
                          {formatMoney(con.credit_limit || 0)}
                        </td>
                        <td className="p-3 text-center text-slate-300 font-bold whitespace-nowrap">
                          {((con.interest_rate || 0) * 100).toFixed(2)}% / năm
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-215px)]">
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
              <select
                required
                value={inputCustomerId}
                onChange={(e) => setInputCustomerId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn Khách hàng vay --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>👤 {c.full_name} ({c.cif_kh})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số hợp đồng *</label>
                <input
                  type="text"
                  required
                  value={inputContractNumber}
                  onChange={(e) => setInputContractNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Loại hợp đồng *</label>
                <select
                  value={inputContractType}
                  onChange={(e) => setInputContractType(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold focus:outline-none focus:border-sky-500"
                >
                  <option value={0}>Hạn Mức Tín Dụng (HMTD)</option>
                  <option value={1}>Cho Vay Từng Lần (Term Loan)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số tiền cấp HĐTD (VNĐ) *</label>
                <input
                  type="text"
                  required
                  value={inputCreditLimit}
                  onChange={(e) => setInputCreditLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-bold text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Lãi suất (% / năm) *</label>
                <input
                  type="text"
                  required
                  value={inputInterestRate}
                  onChange={(e) => setInputInterestRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20"
            >
              {selectedContract ? 'CẬP NHẬT HỢP ĐỒNG' : 'LƯU HỢP ĐỒNG TÍN DỤNG'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
