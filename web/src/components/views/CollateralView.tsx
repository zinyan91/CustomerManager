import React, { useEffect, useState } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI } from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { Collateral, Customer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Building2, CheckCircle, AlertCircle, Plus } from 'lucide-react';

export const CollateralView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);

  // Search Filters
  const [searchCif, setSearchCif] = useState('');
  const [searchOwnerName, setSearchOwnerName] = useState('');
  const [searchAssetCode, setSearchAssetCode] = useState('');

  // Form Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputAssetCode, setInputAssetCode] = useState('');
  const [inputAssetType, setInputAssetType] = useState('Loại 1');
  const [inputAddress, setInputAddress] = useState('');
  const [inputAppraisedValue, setInputAppraisedValue] = useState('');
  const [inputLtvPercent, setInputLtvPercent] = useState('70');

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
      const [resCus, resCol] = await Promise.all([
        fetchCustomersAPI(),
        fetchCollateralsAPI(),
      ]);

      // Alphabetical A-Z sorting
      resCus.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      resCol.sort((a, b) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));

      setCustomers(resCus);
      setCollaterals(resCol);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách TSĐB: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCollaterals = collaterals
    .filter((col) => {
      const cifMatch = !searchCif.trim() || (col.customer?.CifKh && col.customer.CifKh.toLowerCase().includes(searchCif.toLowerCase()));
      const nameMatch = !searchOwnerName.trim() || (col.customer?.FullName && col.customer.FullName.toLowerCase().includes(searchOwnerName.toLowerCase()));
      const codeMatch = !searchAssetCode.trim() || (col.AssetCode && col.AssetCode.toLowerCase().includes(searchAssetCode.toLowerCase()));
      return cifMatch && nameMatch && codeMatch;
    })
    .sort((a, b) => (a.customer?.FullName || '').localeCompare(b.customer?.FullName || '', 'vi'));

  const totalAppraisedVal = filteredCollaterals.reduce((acc, c) => acc + (c.AppraisedValue || c.Value || 0), 0);

  const handleSelectCollateral = (col: Collateral) => {
    if (selectedCollateral?.Id === col.Id) {
      clearForm();
      return;
    }
    setSelectedCollateral(col);
    setInputCustomerId(col.CustomerId);
    setInputAssetCode(col.AssetCode || '');
    setInputAssetType(col.AssetType || 'Loại 1');
    setInputAddress(col.Address || '');
    setInputAppraisedValue((col.AppraisedValue || col.Value) ? formatMoneyInput((col.AppraisedValue || col.Value)!.toString()) : '');
    setInputLtvPercent(col.LtvPercent ? col.LtvPercent.toString() : '70');
  };

  const clearForm = () => {
    setSelectedCollateral(null);
    setInputCustomerId('');
    setInputAssetCode('');
    setInputAssetType('Loại 1');
    setInputAddress('');
    setInputAppraisedValue('');
    setInputLtvPercent('70');
  };

  const handleSaveCollateral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId) {
      showNotify('error', 'Khách hàng chủ sở hữu là bắt buộc!');
      return;
    }

    const val = parseFloat(inputAppraisedValue.replace(/\D/g, '')) || 0;
    if (val <= 0) {
      showNotify('error', 'Giá trị tài sản định giá phải lớn hơn 0!');
      return;
    }

    const ltv = parseFloat(inputLtvPercent) || 70;

    const payload: Partial<Collateral> = {
      Id: selectedCollateral?.Id,
      CustomerId: Number(inputCustomerId),
      AssetCode: inputAssetCode.trim() || null,
      AssetType: inputAssetType,
      Address: inputAddress.trim() || null,
      AppraisedValue: val,
      Value: val,
      LtvPercent: ltv, // Explicitly set to avoid NOT NULL violation
    };

    try {
      await saveCollateralAPI(payload);
      showNotify('success', 'Đã lưu thông tin TSĐB thành công!');
      clearForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ TSĐB: ${err.message}`);
    }
  };

  const selectedCustomerObj = customers.find(c => c.Id === Number(inputCustomerId));

  const formatMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

  // Dynamic Theme Classes
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
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Search Header */}
      <div className={`${containerCardBg} p-4 rounded-2xl border space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>TRA CỨU & DANH MỤC TÀI SẢN BẢO ĐẢM (TSĐB)</span>
          </div>
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <div className={`border px-3 py-1.5 rounded-lg ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
              Số TSĐB: <span className="text-sky-600 dark:text-sky-400 font-bold">{filteredCollaterals.length}</span>
            </div>
            <div className={`border px-3 py-1.5 rounded-lg ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
              Tổng giá trị: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(totalAppraisedVal)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Họ tên KH CSH (sắp xếp A-Z)..."
            value={searchOwnerName}
            onChange={(e) => setSearchOwnerName(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Mã TS chứng thư..."
            value={searchAssetCode}
            onChange={(e) => setSearchAssetCode(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Table view (lg:col-span-7) */}
        <div className={`${containerCardBg} lg:col-span-7 rounded-2xl overflow-hidden border flex flex-col h-[calc(100vh-215px)]`}>
          <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
            <span className="text-xs font-bold">DANH SÁCH TSĐB (SẮP XẾP A - Z: {filteredCollaterals.length})</span>
            <span className="text-[11px] text-slate-400">Bấm vào dòng để chọn/chỉnh sửa</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className={tableHeaderStyle}>
                <tr>
                  <th className="p-3 whitespace-nowrap">KH CHỦ SỞ HỮU</th>
                  <th className="p-3 whitespace-nowrap">MÃ CIF</th>
                  <th className="p-3 whitespace-nowrap">MÃ TS</th>
                  <th className="p-3 whitespace-nowrap">XẾP LOẠI</th>
                  <th className="p-3 whitespace-nowrap text-right">GIÁ TRỊ ĐỊNH GIÁ</th>
                  <th className="p-3 whitespace-nowrap">ĐỊA CHỈ TSBĐ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-slate-400">Đang tải dữ liệu TSĐB...</td></tr>
                ) : filteredCollaterals.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-slate-400">Không tìm thấy tài sản bảo đảm nào.</td></tr>
                ) : (
                  filteredCollaterals.map((col) => {
                    const isSelected = selectedCollateral?.Id === col.Id;
                    return (
                      <tr
                        key={col.Id}
                        onClick={() => handleSelectCollateral(col)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold'
                            : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3 font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {col.customer?.FullName || 'Khách hàng chưa rõ'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {col.customer?.CifKh || '—'}
                        </td>
                        <td className="p-3 font-mono text-slate-500 font-bold whitespace-nowrap">{col.AssetCode || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isLight ? 'bg-slate-100 border-slate-200 text-sky-600' : 'bg-slate-800 border-slate-700 text-sky-400'
                          }`}>
                            {col.AssetType || 'Loại 1'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                          {formatMoney(col.AppraisedValue || col.Value || 0)}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate" title={col.Address || ''}>{col.Address || 'Chưa khai báo'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Detail & Edit Form (lg:col-span-5) */}
        <div className={`${containerCardBg} lg:col-span-5 rounded-2xl p-5 border overflow-y-auto max-h-[calc(100vh-215px)] shadow-xl space-y-4`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              <span>{selectedCollateral ? 'CẬP NHẬT THÔNG TIN TSĐB' : 'KÊ KHAI TSĐB MỚI'}</span>
            </h3>
            <button onClick={clearForm} className="text-xs text-sky-500 hover:underline font-semibold flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <form onSubmit={handleSaveCollateral} className="space-y-4 text-xs">
            {/* Tách riêng Tên KH & Mã CIF trong Form */}
            <div>
              <label className="block font-medium mb-1">Chọn Khách hàng chủ sở hữu *</label>
              <select
                required
                value={inputCustomerId}
                onChange={(e) => setInputCustomerId(Number(e.target.value))}
                className={`w-full rounded-xl p-2.5 font-bold transition-colors ${inputStyle}`}
              >
                <option value="">-- Chọn Khách hàng (Sắp xếp A-Z) --</option>
                {customers.map((c) => (
                  <option key={c.Id} value={c.Id}>
                    👤 {c.FullName} (CIF: {c.CifKh})
                  </option>
                ))}
              </select>
            </div>

            {/* Readout séparé Tên KH & CIF */}
            {selectedCustomerObj && (
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Tên KH chủ sở hữu</label>
                  <div className="font-bold text-sky-600 dark:text-sky-400 text-xs">{selectedCustomerObj.FullName}</div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Mã CIF KH</label>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">{selectedCustomerObj.CifKh}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Mã TS (Chứng thư định giá)</label>
                <input
                  type="text"
                  placeholder="91651.2024..."
                  value={inputAssetCode}
                  onChange={(e) => setInputAssetCode(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Xếp loại tài sản *</label>
                <select
                  value={inputAssetType}
                  onChange={(e) => setInputAssetType(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="Loại 1">Loại 1 (BĐS Thổ cư)</option>
                  <option value="Loại 2">Loại 2 (BĐS Đất nông nghiệp)</option>
                  <option value="Loại 3">Loại 3 (Phương tiện vận tải)</option>
                  <option value="Loại 4">Loại 4 (Sổ tiết kiệm / GTCG)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Giá trị định giá (VNĐ) *</label>
                <input
                  type="text"
                  required
                  placeholder="1.370.000.000"
                  value={inputAppraisedValue}
                  onChange={(e) => setInputAppraisedValue(formatMoneyInput(e.target.value))}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">LTV cho phép (%)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={inputLtvPercent}
                  onChange={(e) => setInputLtvPercent(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 text-sm ${inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Địa chỉ chi tiết TSBĐ</label>
              <textarea
                rows={3}
                placeholder="Số nhà, thửa đất, tờ bản đồ, địa chỉ xã/huyện/tỉnh..."
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className={`w-full rounded-xl p-2.5 resize-none ${inputStyle}`}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-md shadow-sky-600/20"
            >
              {selectedCollateral ? 'CẬP NHẬT TÀI SẢN BẢO ĐẢM' : 'LƯU TÀI SẢN BẢO ĐẢM'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
