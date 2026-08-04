import React, { useEffect, useState } from 'react';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI } from '../../lib/api';
import type { Customer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Search, Plus, Download, Upload, Eye, Trash2, X, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';

export const CustomerListView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchNationalId, setSearchNationalId] = useState('');

  const [inputCif, setInputCif] = useState('');
  const [inputFullName, setInputFullName] = useState('');
  const [inputNationalId, setInputNationalId] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputAddress, setInputAddress] = useState('');
  const [inputAccountNumber, setInputAccountNumber] = useState('');
  const [inputMaritalStatus, setInputMaritalStatus] = useState('Độc thân');

  const [inputCifKhlq, setInputCifKhlq] = useState('');
  const [inputKhlqRelationship, setInputKhlqRelationship] = useState('Không có KHLQ');
  const [inputSpouseName, setInputSpouseName] = useState('');
  const [inputSpouseNationalId, setInputSpouseNationalId] = useState('');
  const [inputSpousePhone, setInputSpousePhone] = useState('');
  const [inputSpouseAccountNumber, setInputSpouseAccountNumber] = useState('');
  const [inputKhlqAddress, setInputKhlqAddress] = useState('');

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
    setInputKhlqRelationship(cus.KhlqRelationship || (cus.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có KHLQ'));
    setInputSpouseName(cus.SpouseName || '');
    setInputSpouseNationalId(cus.SpouseNationalId || '');
    setInputSpousePhone(cus.SpousePhone || '');
    setInputSpouseAccountNumber(cus.SpouseAccountNumber || '');
    setInputKhlqAddress(cus.KhlqAddress || '');
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
    setInputKhlqRelationship('Không có KHLQ');
    setInputSpouseName('');
    setInputSpouseNationalId('');
    setInputSpousePhone('');
    setInputSpouseAccountNumber('');
    setInputKhlqAddress('');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCif.trim() || !inputFullName.trim()) {
      showNotify('error', 'Mã CIF và Họ tên khách hàng là bắt buộc!');
      return;
    }

    if (inputMaritalStatus === 'Đã kết hôn' && inputKhlqRelationship === 'Vợ / Chồng' && !inputSpouseName.trim()) {
      showNotify('error', 'Trạng thái "Đã kết hôn" yêu cầu nhập Họ tên Vợ / Chồng!');
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
      KhlqRelationship: inputKhlqRelationship || null,
      SpouseName: inputSpouseName.trim() || null,
      SpouseNationalId: inputSpouseNationalId.trim() || null,
      SpousePhone: inputSpousePhone.trim() || null,
      SpouseAccountNumber: inputSpouseAccountNumber.trim() || null,
      KhlqAddress: inputKhlqAddress.trim() || null,
    };

    try {
      await saveCustomerAPI(payload);
      showNotify('success', selectedCustomer ? 'Đã cập nhật hồ sơ KH!' : 'Đã lưu KH mới thành công!');
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ KH: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá Khách hàng "${selectedCustomer.FullName}" (CIF: ${selectedCustomer.CifKh})?`)) {
      return;
    }
    try {
      await deleteCustomerAPI(selectedCustomer.Id);
      showNotify('success', 'Đã xoá khách hàng thành công!');
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi xoá khách hàng: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (customers.length === 0) {
      showNotify('error', 'Không có dữ liệu để xuất CSV!');
      return;
    }
    const headers = ['CifKh', 'FullName', 'NationalId', 'Phone', 'Email', 'Address', 'AccountNumber', 'MaritalStatus', 'CifKhlq', 'KhlqRelationship', 'SpouseName', 'SpouseNationalId', 'SpousePhone', 'SpouseAccountNumber', 'KhlqAddress'];
    const rows = customers.map(c => [
      c.CifKh || '',
      `"${c.FullName || ''}"`,
      c.NationalId || '',
      c.Phone || '',
      c.Email || '',
      `"${c.Address || ''}"`,
      c.AccountNumber || '',
      c.MaritalStatus || '',
      c.CifKhlq || '',
      c.KhlqRelationship || '',
      `"${c.SpouseName || ''}"`,
      c.SpouseNationalId || '',
      c.SpousePhone || '',
      c.SpouseAccountNumber || '',
      `"${c.KhlqAddress || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_khach_hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) return;
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0] && cols[1]) {
            await saveCustomerAPI({
              CifKh: cols[0],
              FullName: cols[1],
              NationalId: cols[2] || null,
              Phone: cols[3] || null,
              Email: cols[4] || null,
              Address: cols[5] || null,
              AccountNumber: cols[6] || null,
              MaritalStatus: cols[7] || 'Độc thân',
              CifKhlq: cols[8] || null,
              KhlqRelationship: cols[9] || null,
              SpouseName: cols[10] || null,
              SpouseNationalId: cols[11] || null,
              SpousePhone: cols[12] || null,
              SpouseAccountNumber: cols[13] || null,
              KhlqAddress: cols[14] || null,
            });
            count++;
          }
        }
        showNotify('success', `Đã nhập thành công ${count} khách hàng từ file CSV!`);
        fetchCustomers();
      } catch (err: any) {
        showNotify('error', `Lỗi đọc file CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const containerCardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl';

  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500';

  const tableHeaderStyle = isLight
    ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
    : 'bg-slate-950 text-slate-400 border-slate-800 font-bold';

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'
          }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className={`${containerCardBg} p-4 rounded-2xl border space-y-3`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider">
          TRA CỨU & QUẢN LÝ DANH SÁCH KHÁCH HÀNG
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Họ tên Khách hàng..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Số CCCD KH..."
            value={searchNationalId}
            onChange={(e) => setSearchNationalId(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <button
            onClick={fetchCustomers}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>TÌM KIẾM</span>
          </button>

          <div className="flex items-center space-x-2">
            <label className={`flex-1 border font-medium text-xs py-2 px-2 rounded-xl flex items-center justify-center space-x-1 cursor-pointer transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}>
              <Upload className="w-3.5 h-3.5 text-sky-500" />
              <span>NHẬP CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>

            <button
              onClick={handleExportCSV}
              className={`flex-1 border font-medium text-xs py-2 px-2 rounded-xl flex items-center justify-center space-x-1 transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>XUẤT CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${containerCardBg} lg:col-span-7 rounded-2xl overflow-hidden border flex flex-col h-[calc(100vh-215px)]`}>
          <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
            <span className="text-xs font-bold">
              DANH SÁCH KHÁCH HÀNG ({customers.length})
            </span>
            <span className="text-[11px] text-slate-400">Bấm vào dòng để chọn/chỉnh sửa</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className={tableHeaderStyle}>
                <tr>
                  <th className="p-3 whitespace-nowrap">MÃ CIF</th>
                  <th className="p-3 whitespace-nowrap">HỌ VÀ TÊN KH</th>
                  <th className="p-3 whitespace-nowrap">CIF KHLQ</th>
                  <th className="p-3 whitespace-nowrap">KHLQ / NGƯỜI BẢO LÃNH</th>
                  <th className="p-3 whitespace-nowrap">MỐI QUAN HỆ</th>
                  <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">Đang tải dữ liệu khách hàng...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">Không tìm thấy khách hàng nào.</td>
                  </tr>
                ) : (
                  customers.map((cus) => {
                    const isSelected = selectedCustomer?.Id === cus.Id;
                    const khlqName = cus.SpouseName || 'Chưa khai báo';
                    const relation = cus.KhlqRelationship || (cus.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có');
                    return (
                      <tr
                        key={cus.Id}
                        onClick={() => handleSelectCustomer(cus)}
                        className={`cursor-pointer transition-colors ${isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold'
                            : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                          }`}
                      >
                        <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">{cus.CifKh}</td>
                        <td className="p-3 font-bold whitespace-nowrap">{cus.FullName}</td>
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{cus.CifKhlq || '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          {cus.SpouseName ? (
                            <span className="font-medium text-slate-700 dark:text-slate-200">{khlqName}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${relation === 'Vợ / Chồng' ? 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400' :
                              relation === 'Người bảo lãnh' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' :
                                relation === 'Bên bảo đảm (Chủ TSĐB)' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' :
                                  'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                            }`}>
                            {relation}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailCustomer(cus);
                              setIsModalOpen(true);
                            }}
                            className="bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center space-x-1"
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

        <div className={`${containerCardBg} lg:col-span-5 rounded-2xl p-5 border overflow-y-auto max-h-[calc(100vh-215px)] shadow-xl space-y-4`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-sky-500" />
              <span>{selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'THÊM KHÁCH HÀNG MỚI'}</span>
            </h3>
            <button onClick={clearForm} className="text-xs text-sky-500 hover:underline font-semibold flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Mã CIF KH *</label>
                <input
                  type="text"
                  required
                  placeholder="005299617..."
                  value={inputCif}
                  onChange={(e) => setInputCif(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số CCCD / CMND</label>
                <input
                  type="text"
                  placeholder="07009100..."
                  value={inputNationalId}
                  onChange={(e) => setInputNationalId(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold ${inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Họ và Tên Khách hàng *</label>
              <input
                type="text"
                required
                placeholder="ĐỊNH TIÊN HOÀNG..."
                value={inputFullName}
                onChange={(e) => setInputFullName(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-bold text-sm ${inputStyle}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0909123456..."
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className={`w-full rounded-xl p-2.5 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số tài khoản (STK) KH</label>
                <input
                  type="text"
                  placeholder="190333..."
                  value={inputAccountNumber}
                  onChange={(e) => setInputAccountNumber(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Địa chỉ liên lạc</label>
              <input
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className={`w-full rounded-xl p-2.5 ${inputStyle}`}
              />
            </div>

            <div className={`rounded-xl p-4 space-y-3 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
              <div className="text-xs font-bold text-sky-500 uppercase border-b pb-2 flex items-center justify-between">
                <span>THÔNG TIN HÔN NHÂN & KHÁCH HÀNG LIÊN QUAN / BẢO LÃNH</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tình trạng hôn nhân *</label>
                  <select
                    value={inputMaritalStatus}
                    onChange={(e) => setInputMaritalStatus(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-medium ${inputStyle}`}
                  >
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                    <option value="Ly hôn">Ly hôn</option>
                    <option value="Góa">Góa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Mối quan hệ KHLQ / Bảo lãnh *</label>
                  <select
                    value={inputKhlqRelationship}
                    onChange={(e) => setInputKhlqRelationship(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                  >
                    <option value="Vợ / Chồng">Vợ / Chồng</option>
                    <option value="Người bảo lãnh">Người bảo lãnh thanh toán</option>
                    <option value="Bên bảo đảm (Chủ TSĐB)">Bên bảo đảm (Chủ TSĐB)</option>
                    <option value="Bố / Mẹ">Bố / Mẹ</option>
                    <option value="Con cái">Con cái</option>
                    <option value="Đại diện pháp luật">Đại diện pháp luật / Chủ DN</option>
                    <option value="Khác">Khác / Người liên quan</option>
                    <option value="Không có KHLQ">Không có KHLQ</option>
                  </select>
                </div>
              </div>

              {inputKhlqRelationship !== 'Không có KHLQ' && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Mã CIF KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="005236684..."
                        value={inputCifKhlq}
                        onChange={(e) => setInputCifKhlq(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-mono font-bold ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Họ tên KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Họ tên Vợ/Chồng hoặc Người bảo lãnh..."
                        value={inputSpouseName}
                        onChange={(e) => setInputSpouseName(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Số CCCD KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số CCCD..."
                        value={inputSpouseNationalId}
                        onChange={(e) => setInputSpouseNationalId(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">SĐT KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="SĐT..."
                        value={inputSpousePhone}
                        onChange={(e) => setInputSpousePhone(e.target.value)}
                        className={`w-full rounded-xl p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">STK KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số tài khoản..."
                        value={inputSpouseAccountNumber}
                        onChange={(e) => setInputSpouseAccountNumber(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Địa chỉ KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Địa chỉ..."
                        value={inputKhlqAddress}
                        onChange={(e) => setInputKhlqAddress(e.target.value)}
                        className={`w-full rounded-xl p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-md shadow-sky-600/20"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'LƯU HỒ SƠ KHÁCH HÀNG MỚI'}
              </button>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold text-xs py-3 px-4 rounded-xl transition-colors flex items-center space-x-1"
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
          <div className={`${containerCardBg} w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className="text-base font-bold text-sky-500">
                  HỒ SƠ CHI TIẾT: {detailCustomer.FullName}
                </h3>
                <p className="text-xs text-slate-400">Mã CIF: {detailCustomer.CifKh}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-sky-500 uppercase">1. Thông Tin Pháp Lý & Liên Lạc KH</h4>
              <div className={`border rounded-xl p-4 grid grid-cols-2 gap-3 text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div><span className="text-slate-400">Họ và tên:</span> <span className="font-bold text-sky-600 dark:text-sky-400">{detailCustomer.FullName}</span></div>
                <div><span className="text-slate-400">Số CCCD:</span> <span className="font-bold font-mono">{detailCustomer.NationalId || 'Chưa khai báo'}</span></div>
                <div><span className="text-slate-400">Số tài khoản (STK):</span> <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{detailCustomer.AccountNumber || 'Chưa khai báo'}</span></div>
                <div><span className="text-slate-400">Số điện thoại:</span> <span className="font-bold">{detailCustomer.Phone || 'Chưa khai báo'}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Địa chỉ:</span> <span>{detailCustomer.Address || 'Chưa khai báo'}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-sky-500 uppercase">2. Thông Tin Hôn Nhân & KHLQ / Người Bảo Lãnh</h4>
              <div className={`border rounded-xl p-4 grid grid-cols-2 gap-3 text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div><span className="text-slate-400">Tình trạng hôn nhân:</span> <span className="font-bold">{detailCustomer.MaritalStatus}</span></div>
                <div><span className="text-slate-400">Mối quan hệ KHLQ:</span> <span className="font-bold text-sky-600 dark:text-sky-400">{detailCustomer.KhlqRelationship || (detailCustomer.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có')}</span></div>
                <div><span className="text-slate-400">Mã CIF KHLQ:</span> <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{detailCustomer.CifKhlq || '—'}</span></div>
                <div><span className="text-slate-400">Họ tên KHLQ / Bảo lãnh:</span> <span className="font-bold">{detailCustomer.SpouseName || '—'}</span></div>
                <div><span className="text-slate-400">STK KHLQ / Bảo lãnh:</span> <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{detailCustomer.SpouseAccountNumber || '—'}</span></div>
                <div><span className="text-slate-400">CCCD KHLQ / Bảo lãnh:</span> <span className="font-mono">{detailCustomer.SpouseNationalId || '—'}</span></div>
                <div><span className="text-slate-400">SĐT KHLQ / Bảo lãnh:</span> <span>{detailCustomer.SpousePhone || '—'}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Địa chỉ KHLQ / Bảo lãnh:</span> <span>{detailCustomer.KhlqAddress || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
