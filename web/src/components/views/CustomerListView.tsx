import React, { useEffect, useState } from 'react';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI } from '../../lib/api';
import type { Customer } from '../../types';
import { Search, Plus, Download, Upload, Eye, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';

export const CustomerListView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search Filters
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchNationalId, setSearchNationalId] = useState('');

  // Form Inputs (Income fields removed per user request)
  const [inputCif, setInputCif] = useState('');
  const [inputFullName, setInputFullName] = useState('');
  const [inputNationalId, setInputNationalId] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputAddress, setInputAddress] = useState('');
  const [inputAccountNumber, setInputAccountNumber] = useState('');
  const [inputMaritalStatus, setInputMaritalStatus] = useState('Độc thân');
  const [inputCifKhlq, setInputCifKhlq] = useState('');
  const [inputSpouseName, setInputSpouseName] = useState('');
  const [inputSpouseNationalId, setInputSpouseNationalId] = useState('');
  const [inputSpousePhone, setInputSpousePhone] = useState('');
  const [inputSpouseAccountNumber, setInputSpouseAccountNumber] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomersAPI({
        cif: searchCif,
        name: searchName,
        nationalId: searchNationalId
      });
      data.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setCustomers(data);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách khách hàng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (cus: Customer) => {
    if (selectedCustomer?.Id === cus.Id) {
      clearForm();
      return;
    }
    setSelectedCustomer(cus);
    setInputCif(cus.CifKh || '');
    setInputFullName(cus.FullName || '');
    setInputNationalId(cus.NationalId || '');
    setInputPhone(cus.Phone || '');
    setInputEmail(cus.Email || '');
    setInputAddress(cus.Address || '');
    setInputAccountNumber(cus.AccountNumber || '');
    setInputMaritalStatus(cus.MaritalStatus || 'Độc thân');
    setInputCifKhlq(cus.CifKhlq || '');
    setInputSpouseName(cus.SpouseName || '');
    setInputSpouseNationalId(cus.SpouseNationalId || '');
    setInputSpousePhone(cus.SpousePhone || '');
    setInputSpouseAccountNumber(cus.SpouseAccountNumber || '');
  };

  const clearForm = () => {
    setSelectedCustomer(null);
    setInputCif('');
    setInputFullName('');
    setInputNationalId('');
    setInputPhone('');
    setInputEmail('');
    setInputAddress('');
    setInputAccountNumber('');
    setInputMaritalStatus('Độc thân');
    setInputCifKhlq('');
    setInputSpouseName('');
    setInputSpouseNationalId('');
    setInputSpousePhone('');
    setInputSpouseAccountNumber('');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCif.trim() || !inputFullName.trim()) {
      showNotify('error', 'Mã CIF và Họ tên khách hàng là bắt buộc!');
      return;
    }

    if (inputMaritalStatus === 'Đã kết hôn' && !inputSpouseName.trim()) {
      showNotify('error', 'Trạng thái "Đã kết hôn" yêu cầu nhập Họ và tên Vợ / Chồng!');
      return;
    }

    const payload: Partial<Customer> = {
      Id: selectedCustomer?.Id,
      CifKh: inputCif.trim(),
      FullName: inputFullName.trim(),
      NationalId: inputNationalId.trim() || null,
      Phone: inputPhone.trim() || null,
      Email: inputEmail.trim() || null,
      Address: inputAddress.trim() || null,
      AccountNumber: inputAccountNumber.trim() || null,
      MaritalStatus: inputMaritalStatus,
      CifKhlq: inputCifKhlq.trim() || null,
      SpouseName: inputMaritalStatus === 'Đã kết hôn' ? inputSpouseName.trim() || null : null,
      SpouseNationalId: inputMaritalStatus === 'Đã kết hôn' ? inputSpouseNationalId.trim() || null : null,
      SpousePhone: inputMaritalStatus === 'Đã kết hôn' ? inputSpousePhone.trim() || null : null,
      SpouseAccountNumber: inputMaritalStatus === 'Đã kết hôn' ? inputSpouseAccountNumber.trim() || null : null,
    };

    try {
      await saveCustomerAPI(payload);
      showNotify('success', `Đã lưu hồ sơ khách hàng '${payload.FullName}' thành công!`);
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!confirm(`Bạn có chắc chắn muốn xoá khách hàng '${selectedCustomer.FullName}' (CIF: ${selectedCustomer.CifKh})?`)) return;

    try {
      await deleteCustomerAPI(selectedCustomer.Id);
      showNotify('success', 'Đã xoá khách hàng thành công!');
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi xoá KH: ${err.message}`);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 3) continue;

        const cif = parts[0].trim().replace(/^"|"$/g, '');
        const cifLq = parts[1]?.trim().replace(/^"|"$/g, '') || null;
        const name = parts[2]?.trim().replace(/^"|"$/g, '') || '';
        const marital = parts[3]?.trim().replace(/^"|"$/g, '') || 'Độc thân';
        const spouse = parts[4]?.trim().replace(/^"|"$/g, '') || null;
        const stk = parts[5]?.trim().replace(/^"|"$/g, '') || null;
        const stkSpouse = parts[6]?.trim().replace(/^"|"$/g, '') || null;

        if (!cif && !name) continue;

        try {
          await saveCustomerAPI({
            CifKh: cif || `CIF_AUTO_${Date.now()}_${i}`,
            CifKhlq: cifLq,
            FullName: name || 'Khách hàng mới',
            MaritalStatus: marital,
            SpouseName: spouse,
            AccountNumber: stk,
            SpouseAccountNumber: stkSpouse
          });
          count++;
        } catch {
          // ignore
        }
      }

      showNotify('success', `Đã nhập thành công ${count} khách hàng vào CSDL Supabase!`);
      fetchCustomers();
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const header = 'cif_kh,cif_khlq,full_name,marital_status,spouse_name,account_number,spouse_account_number\n';
    const rows = customers.map(c => 
      `"${c.CifKh || ''}","${c.CifKhlq || ''}","${c.FullName || ''}","${c.MaritalStatus || ''}","${c.SpouseName || ''}","${c.AccountNumber || ''}","${c.SpouseAccountNumber || ''}"`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DanhSachKhachHang_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showNotify('success', `Đã xuất ${customers.length} hồ sơ khách hàng ra tệp CSV!`);
  };

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

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">
          TRA CỨU VÀ QUẢN LÝ DỮ LIỆU KHÁCH HÀNG
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Họ và tên KH..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Số CCCD KH..."
            value={searchNationalId}
            onChange={(e) => setSearchNationalId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={fetchCustomers}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>TÌM KIẾM</span>
          </button>
          
          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>NHẬP CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>XUẤT CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-215px)]">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              DANH SÁCH KHÁCH HÀNG ({customers.length})
            </span>
            <span className="text-[11px] text-slate-500">Bấm vào dòng để chọn/chỉnh sửa</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3 whitespace-nowrap">MÃ CIF</th>
                  <th className="p-3 whitespace-nowrap">HỌ VÀ TÊN KH</th>
                  <th className="p-3 whitespace-nowrap">CIF KHLQ</th>
                  <th className="p-3 whitespace-nowrap">KHLQ (VỢ/CHỒNG)</th>
                  <th className="p-3 whitespace-nowrap">HÔN NHÂN</th>
                  <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">Đang tải dữ liệu Supabase...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">Không tìm thấy khách hàng nào.</td>
                  </tr>
                ) : (
                  customers.map((cus) => {
                    const isSelected = selectedCustomer?.Id === cus.Id;
                    return (
                      <tr
                        key={cus.Id}
                        onClick={() => handleSelectCustomer(cus)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">{cus.CifKh}</td>
                        <td className="p-3 font-bold text-slate-100 whitespace-nowrap">{cus.FullName}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">{cus.CifKhlq || '-'}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">
                          {cus.MaritalStatus === 'Đã kết hôn' ? cus.SpouseName || 'Chưa khai báo' : '-'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            cus.MaritalStatus === 'Đã kết hôn' ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {cus.MaritalStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailCustomer(cus);
                              setIsModalOpen(true);
                            }}
                            className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-215px)]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>{selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'THÊM MỚI HỒ SƠ KHÁCH HÀNG'}</span>
            </h3>
            <button
              onClick={clearForm}
              className="text-xs text-sky-400 hover:underline font-semibold"
            >
              + Tạo mới
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Mã CIF *</label>
                <input
                  type="text"
                  required
                  value={inputCif}
                  onChange={(e) => setInputCif(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số CCCD</label>
                <input
                  type="text"
                  value={inputNationalId}
                  onChange={(e) => setInputNationalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Họ tên khách hàng *</label>
              <input
                type="text"
                required
                value={inputFullName}
                onChange={(e) => setInputFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số tài khoản (STK) KH</label>
                <input
                  type="text"
                  value={inputAccountNumber}
                  onChange={(e) => setInputAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Địa chỉ liên lạc</label>
              <input
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-sky-400 uppercase border-b border-slate-800 pb-2">
                THÔNG TIN HÔN NHÂN & KHLQ
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Tình trạng hôn nhân *</label>
                  <select
                    value={inputMaritalStatus}
                    onChange={(e) => setInputMaritalStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                    <option value="Ly hôn">Ly hôn</option>
                    <option value="Góa">Góa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Mã CIF KHLQ</label>
                  <input
                    type="text"
                    value={inputCifKhlq}
                    onChange={(e) => setInputCifKhlq(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {inputMaritalStatus === 'Đã kết hôn' && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Họ tên Vợ / Chồng (KHLQ) *</label>
                    <input
                      type="text"
                      required
                      value={inputSpouseName}
                      onChange={(e) => setInputSpouseName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-400 mb-1">Số CCCD Vợ/Chồng</label>
                      <input
                        type="text"
                        value={inputSpouseNationalId}
                        onChange={(e) => setInputSpouseNationalId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-400 mb-1">SĐT Vợ/Chồng</label>
                      <input
                        type="text"
                        value={inputSpousePhone}
                        onChange={(e) => setInputSpousePhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">STK Vợ/Chồng</label>
                    <input
                      type="text"
                      value={inputSpouseAccountNumber}
                      onChange={(e) => setInputSpouseAccountNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ' : 'LƯU HỒ SƠ KHÁCH HÀNG'}
              </button>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs py-3 px-4 rounded-xl transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>XOÁ KH</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {isModalOpen && detailCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-sky-400">
                  HỒ SƠ CHI TIẾT: {detailCustomer.FullName}
                </h3>
                <p className="text-xs text-slate-400">Mã CIF: {detailCustomer.CifKh}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-sky-400 uppercase">1. Thông Tin Pháp Lý & Liên Lạc KH</h4>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Họ và tên:</span> <span className="font-bold text-slate-100">{detailCustomer.FullName}</span></div>
                <div><span className="text-slate-400">Số CCCD:</span> <span className="font-bold text-slate-200">{detailCustomer.NationalId || 'Chưa khai báo'}</span></div>
                <div><span className="text-slate-400">Số tài khoản (STK):</span> <span className="font-bold text-sky-400">{detailCustomer.AccountNumber || 'Chưa khai báo'}</span></div>
                <div><span className="text-slate-400">Số điện thoại:</span> <span className="font-bold text-slate-200">{detailCustomer.Phone || 'Chưa khai báo'}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Địa chỉ:</span> <span className="text-slate-200">{detailCustomer.Address || 'Chưa khai báo'}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-sky-400 uppercase">2. Thông Tin Hôn Nhân & KHLQ (Vợ/Chồng)</h4>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Tình trạng hôn nhân:</span> <span className="font-bold text-slate-100">{detailCustomer.MaritalStatus}</span></div>
                <div><span className="text-slate-400">Mã CIF KHLQ:</span> <span className="font-bold text-sky-400">{detailCustomer.CifKhlq || '-'}</span></div>
                <div><span className="text-slate-400">Họ tên Vợ/Chồng:</span> <span className="font-bold text-slate-100">{detailCustomer.SpouseName || '-'}</span></div>
                <div><span className="text-slate-400">STK Vợ/Chồng:</span> <span className="font-bold text-sky-400">{detailCustomer.SpouseAccountNumber || '-'}</span></div>
                <div><span className="text-slate-400">CCCD Vợ/Chồng:</span> <span className="text-slate-200">{detailCustomer.SpouseNationalId || '-'}</span></div>
                <div><span className="text-slate-400">SĐT Vợ/Chồng:</span> <span className="text-slate-200">{detailCustomer.SpousePhone || '-'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
