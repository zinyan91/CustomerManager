import React, { useEffect, useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI } from '../../lib/api';
import type { Customer } from '../../types';
import { Search, Plus, Download, Upload, Eye, Trash2, X, UserCheck } from 'lucide-react';
import { Toast } from '../Toast';

export const CustomerListView: React.FC = () => {

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

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;
  const tableHeaderStyle = UI.tableHeaderStyle;

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <div className={`${containerCardBg} p-4 rounded-lg border space-y-3`}>
        <div className="text-xs font-bold text-accent tracking-tight">
          TRA CỨU & QUẢN LÝ DANH SÁCH KHÁCH HÀNG
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Họ tên Khách hàng..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Số CCCD KH..."
            value={searchNationalId}
            onChange={(e) => setSearchNationalId(e.target.value)}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <button
            onClick={fetchCustomers}
            className="bg-accent hover:opacity-90 text-accent-ink font-semibold text-xs py-2 px-3 rounded-md flex items-center justify-center space-x-1.5 transition-opacity duration-150"
          >
            <Search className="w-3.5 h-3.5" />
            <span>TÌM KIẾM</span>
          </button>

          <div className="flex items-center space-x-2">
            <label className={`flex-1 border font-medium text-xs py-2 px-2 rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors ${'border-line text-ink-muted hover:border-accent hover:text-accent'
              }`}>
              <Upload className="w-3.5 h-3.5 text-ink-faint" />
              <span>NHẬP CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>

            <button
              onClick={handleExportCSV}
              className={`flex-1 border font-medium text-xs py-2 px-2 rounded-md flex items-center justify-center space-x-1 transition-colors ${'border-line text-ink-muted hover:border-accent hover:text-accent'
                }`}
            >
              <Download className="w-3.5 h-3.5 text-ink-faint" />
              <span>XUẤT CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${containerCardBg} lg:col-span-7 rounded-lg overflow-hidden border flex flex-col h-[calc(100vh-215px)]`}>
          <div className={`p-3 border-b flex items-center justify-between bg-panel border-line`}>
            <span className="text-xs font-bold">
              DANH SÁCH KHÁCH HÀNG ({customers.length})
            </span>
            <span className="text-[11px] text-ink-faint">Bấm vào dòng để chọn/chỉnh sửa</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className={tableHeaderStyle}>
                <tr>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">MÃ CIF</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">HỌ VÀ TÊN KH</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">CIF KHLQ</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">KHLQ / NGƯỜI BẢO LÃNH</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">MỐI QUAN HỆ</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className={"divide-y divide-line"}>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-ink-faint">Đang tải dữ liệu khách hàng...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-ink-faint">Không tìm thấy khách hàng nào.</td>
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
                        className={`cursor-pointer border-l-2 transition-colors duration-150 ${isSelected
                            ? 'border-accent bg-accent-soft font-semibold'
                            : 'border-transparent hover:bg-panel-muted'
                          }`}
                      >
                        <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono text-ink font-semibold whitespace-nowrap">{cus.CifKh}</td>
                        <td className="px-[var(--row-px)] py-[var(--row-py)] font-bold whitespace-nowrap">{cus.FullName}</td>
                        <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono text-ink-muted whitespace-nowrap">{cus.CifKhlq || '–'}</td>
                        <td className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">
                          {cus.SpouseName ? (
                            <span className="text-ink">{khlqName}</span>
                          ) : (
                            <span className="text-ink-faint">–</span>
                          )}
                        </td>
                        <td className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${relation === 'Vợ / Chồng' ? 'bg-accent-soft border-accent/30 text-accent' :
                              relation === 'Người bảo lãnh' ? 'bg-pos-soft border-pos/30 text-pos' :
                                relation === 'Bên bảo đảm (Chủ TSĐB)' ? 'bg-warn-soft border-warn/30 text-warn' :
                                  'bg-panel-muted border-line text-ink-muted'
                            }`}>
                            {relation}
                          </span>
                        </td>
                        <td className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailCustomer(cus);
                              setIsModalOpen(true);
                            }}
                            className="border border-line text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center space-x-1 transition-colors duration-150"
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

        <div className={`${containerCardBg} lg:col-span-5 rounded-lg p-5 border overflow-y-auto max-h-[calc(100vh-215px)] space-y-4`}>
          <div className={`flex items-center justify-between border-b pb-3 border-line`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-accent" />
              <span>{selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'THÊM KHÁCH HÀNG MỚI'}</span>
            </h3>
            <button onClick={clearForm} className="text-xs text-accent hover:underline font-semibold flex items-center space-x-1">
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
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số CCCD / CMND</label>
                <input
                  type="text"
                  placeholder="07009100..."
                  value={inputNationalId}
                  onChange={(e) => setInputNationalId(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-mono font-bold ${inputStyle}`}
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
                className={`w-full rounded-md p-2.5 font-bold text-sm ${inputStyle}`}
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
                  className={`w-full rounded-md p-2.5 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số tài khoản (STK) KH</label>
                <input
                  type="text"
                  placeholder="190333..."
                  value={inputAccountNumber}
                  onChange={(e) => setInputAccountNumber(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
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
                className={`w-full rounded-md p-2.5 ${inputStyle}`}
              />
            </div>

            <div className={`rounded-md p-4 space-y-3 border ${'bg-surface border-line'
              }`}>
              <div className="text-xs font-bold text-accent uppercase border-b border-line pb-2 flex items-center justify-between">
                <span>THÔNG TIN HÔN NHÂN & KHÁCH HÀNG LIÊN QUAN / BẢO LÃNH</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tình trạng hôn nhân *</label>
                  <select
                    value={inputMaritalStatus}
                    onChange={(e) => setInputMaritalStatus(e.target.value)}
                    className={`w-full rounded-md p-2.5 font-medium ${inputStyle}`}
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
                    className={`w-full rounded-md p-2.5 font-bold text-ink ${inputStyle}`}
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
                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Mã CIF KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="005236684..."
                        value={inputCifKhlq}
                        onChange={(e) => setInputCifKhlq(e.target.value)}
                        className={`w-full rounded-md p-2.5 font-mono font-bold ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Họ tên KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Họ tên Vợ/Chồng hoặc Người bảo lãnh..."
                        value={inputSpouseName}
                        onChange={(e) => setInputSpouseName(e.target.value)}
                        className={`w-full rounded-md p-2.5 font-bold ${inputStyle}`}
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
                        className={`w-full rounded-md p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">SĐT KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="SĐT..."
                        value={inputSpousePhone}
                        onChange={(e) => setInputSpousePhone(e.target.value)}
                        className={`w-full rounded-md p-2.5 ${inputStyle}`}
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
                        className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Địa chỉ KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Địa chỉ..."
                        value={inputKhlqAddress}
                        onChange={(e) => setInputKhlqAddress(e.target.value)}
                        className={`w-full rounded-md p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-3 px-4 rounded-md transition-opacity duration-150"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'LƯU HỒ SƠ KHÁCH HÀNG MỚI'}
              </button>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className="bg-neg hover:bg-neg-soft text-neg border border-neg/30 font-bold text-xs py-3 px-4 rounded-md transition-colors flex items-center space-x-1"
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
        <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${containerCardBg} w-full max-w-2xl rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b pb-3 border-line`}>
              <div>
                <h3 className="text-base font-bold text-accent">
                  HỒ SƠ CHI TIẾT: {detailCustomer.FullName}
                </h3>
                <p className="text-xs text-ink-faint">Mã CIF: {detailCustomer.CifKh}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-faint hover:text-ink rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-accent uppercase">1. Thông Tin Pháp Lý & Liên Lạc KH</h4>
              <div className={`border rounded-md p-4 grid grid-cols-2 gap-3 text-xs bg-surface border-line`}>
                <div><span className="text-ink-faint">Họ và tên:</span> <span className="font-bold text-ink">{detailCustomer.FullName}</span></div>
                <div><span className="text-ink-faint">Số CCCD:</span> <span className="font-bold font-mono">{detailCustomer.NationalId || 'Chưa khai báo'}</span></div>
                <div><span className="text-ink-faint">Số tài khoản (STK):</span> <span className="font-bold font-mono text-ink">{detailCustomer.AccountNumber || 'Chưa khai báo'}</span></div>
                <div><span className="text-ink-faint">Số điện thoại:</span> <span className="font-bold">{detailCustomer.Phone || 'Chưa khai báo'}</span></div>
                <div className="col-span-2"><span className="text-ink-faint">Địa chỉ:</span> <span>{detailCustomer.Address || 'Chưa khai báo'}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-accent uppercase">2. Thông Tin Hôn Nhân & KHLQ / Người Bảo Lãnh</h4>
              <div className={`border rounded-md p-4 grid grid-cols-2 gap-3 text-xs bg-surface border-line`}>
                <div><span className="text-ink-faint">Tình trạng hôn nhân:</span> <span className="font-bold">{detailCustomer.MaritalStatus}</span></div>
                <div><span className="text-ink-faint">Mối quan hệ KHLQ:</span> <span className="font-bold text-ink">{detailCustomer.KhlqRelationship || (detailCustomer.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có')}</span></div>
                <div><span className="text-ink-faint">Mã CIF KHLQ:</span> <span className="font-bold font-mono text-ink">{detailCustomer.CifKhlq || '—'}</span></div>
                <div><span className="text-ink-faint">Họ tên KHLQ / Bảo lãnh:</span> <span className="font-bold">{detailCustomer.SpouseName || '—'}</span></div>
                <div><span className="text-ink-faint">STK KHLQ / Bảo lãnh:</span> <span className="font-bold font-mono text-ink">{detailCustomer.SpouseAccountNumber || '—'}</span></div>
                <div><span className="text-ink-faint">CCCD KHLQ / Bảo lãnh:</span> <span className="font-mono">{detailCustomer.SpouseNationalId || '—'}</span></div>
                <div><span className="text-ink-faint">SĐT KHLQ / Bảo lãnh:</span> <span>{detailCustomer.SpousePhone || '—'}</span></div>
                <div className="col-span-2"><span className="text-ink-faint">Địa chỉ KHLQ / Bảo lãnh:</span> <span>{detailCustomer.KhlqAddress || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
