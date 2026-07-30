import React, { useEffect, useState } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI } from '../../lib/api';
import { formatMoneyInput, fmtDate } from '../../lib/utils';
import type { Collateral, Customer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Building2, CheckCircle, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export const CollateralView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

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
  const [inputLtvPercent, setInputLtvPercent] = useState('80');
  const [inputAppraisalDate, setInputAppraisalDate] = useState('');
  const [inputAppraisalTenorMonths, setInputAppraisalTenorMonths] = useState<number>(12);
  const [inputAppraisalExpiryDate, setInputAppraisalExpiryDate] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Auto-calculate Appraisal Expiry Date
  useEffect(() => {
    if (inputAppraisalDate && inputAppraisalTenorMonths) {
      try {
        const parts = inputAppraisalDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month + Number(inputAppraisalTenorMonths), day);
          if (!isNaN(d.getTime())) {
            setInputAppraisalExpiryDate(d.toISOString().split('T')[0]);
          }
        }
      } catch {}
    }
  }, [inputAppraisalDate, inputAppraisalTenorMonths]);

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

  const handleAssetTypeChange = (type: string) => {
    setInputAssetType(type);
    if (type === 'Loại 1') setInputLtvPercent('80');
    else if (type === 'Loại 2') setInputLtvPercent('70');
    else if (type === 'Loại 3') setInputLtvPercent('60');
    else if (type === 'Loại 4') setInputLtvPercent('55');
    else if (type === 'Hạn chế') setInputLtvPercent('50');
  };

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
    setInputLtvPercent(col.LtvPercent ? col.LtvPercent.toString() : '80');
    setInputAppraisalDate(col.AppraisalDate ? col.AppraisalDate.split('T')[0] : '');
    setInputAppraisalTenorMonths(col.AppraisalTenorMonths || 12);
    setInputAppraisalExpiryDate(col.AppraisalExpiryDate ? col.AppraisalExpiryDate.split('T')[0] : '');
    // Auto-expand form when selecting a record
    setFormCollapsed(false);
  };

  const clearForm = () => {
    setSelectedCollateral(null);
    setInputCustomerId('');
    setInputAssetCode('');
    setInputAssetType('Loại 1');
    setInputAddress('');
    setInputAppraisedValue('');
    setInputLtvPercent('80');
    setInputAppraisalDate('');
    setInputAppraisalTenorMonths(12);
    setInputAppraisalExpiryDate('');
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
      LtvPercent: ltv,
      AppraisalDate: inputAppraisalDate || null,
      AppraisalTenorMonths: inputAppraisalTenorMonths || 12,
      AppraisalExpiryDate: inputAppraisalExpiryDate || null,
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

  const readonlyInputStyle = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed font-semibold'
    : 'bg-slate-950/80 border-slate-800 text-slate-300 cursor-not-allowed font-semibold';

  const tableHeaderStyle = isLight
    ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
    : 'bg-slate-950 text-slate-400 border-slate-800 font-bold';

  return (
    <div className="space-y-3 text-xs transition-colors duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── TOP SECTION: Search + Form ── */}
      <div className={`${containerCardBg} rounded-2xl border`}>
        {/* Search Header */}
        <div className={`p-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>TRA CỨU & DANH MỤC TÀI SẢN BẢO ĐẢM (TSĐB)</span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <div className={`border px-3 py-1 rounded-lg ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                Số TSĐB: <span className="text-sky-600 dark:text-sky-400 font-bold">{filteredCollaterals.length}</span>
              </div>
              <div className={`border px-3 py-1 rounded-lg ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                Tổng giá trị: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(totalAppraisedVal)}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Mã CIF KH..."
              value={searchCif}
              onChange={(e) => setSearchCif(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs transition-colors border ${inputStyle}`}
            />
            <input
              type="text"
              placeholder="Họ tên KH CSH (sắp xếp A-Z)..."
              value={searchOwnerName}
              onChange={(e) => setSearchOwnerName(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs transition-colors border ${inputStyle}`}
            />
            <input
              type="text"
              placeholder="Mã TS chứng thư..."
              value={searchAssetCode}
              onChange={(e) => setSearchAssetCode(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs transition-colors border ${inputStyle}`}
            />
          </div>
        </div>

        {/* Collapsible Form Header */}
        <div
          className={`flex items-center justify-between px-4 py-2 cursor-pointer select-none ${isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-slate-950/50 hover:bg-slate-800/50'} transition-colors`}
          onClick={() => setFormCollapsed(v => !v)}
        >
          <h3 className="text-xs font-bold flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            <span>{selectedCollateral ? `✏️ CẬP NHẬT TSĐB — ${selectedCollateral.AssetCode || 'Chưa có mã'}` : '➕ KÊ KHAI TSĐB MỚI'}</span>
          </h3>
          <div className="flex items-center space-x-3">
            {selectedCollateral && (
              <button
                onClick={(e) => { e.stopPropagation(); clearForm(); }}
                className="text-xs text-sky-500 hover:underline font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Tạo mới</span>
              </button>
            )}
            {formCollapsed
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronUp className="w-4 h-4 text-slate-400" />
            }
          </div>
        </div>

        {/* Collapsible Form Body */}
        {!formCollapsed && (
          <div className={`px-4 pb-4 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
            <form onSubmit={handleSaveCollateral}>
              {/* Row 1: KH + Asset Code + Asset Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block font-medium mb-1">Chọn Khách hàng chủ sở hữu *</label>
                  <select
                    required
                    value={inputCustomerId}
                    onChange={(e) => setInputCustomerId(Number(e.target.value))}
                    className={`w-full rounded-xl p-2 font-bold transition-colors border ${inputStyle}`}
                  >
                    <option value="">-- Chọn Khách hàng (A-Z) --</option>
                    {customers.map((c) => (
                      <option key={c.Id} value={c.Id}>
                        👤 {c.FullName} (CIF: {c.CifKh})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Mã TS (Chứng thư định giá)</label>
                  <input
                    type="text"
                    placeholder="91651.2024..."
                    value={inputAssetCode}
                    onChange={(e) => setInputAssetCode(e.target.value)}
                    className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Xếp loại tài sản *</label>
                  <select
                    value={inputAssetType}
                    onChange={(e) => handleAssetTypeChange(e.target.value)}
                    className={`w-full rounded-xl p-2 font-bold border ${inputStyle}`}
                  >
                    <option value="Loại 1">Loại 1 (LTV 80%)</option>
                    <option value="Loại 2">Loại 2 (LTV 70%)</option>
                    <option value="Loại 3">Loại 3 (LTV 60%)</option>
                    <option value="Loại 4">Loại 4 (LTV 55%)</option>
                    <option value="Hạn chế">Hạn chế (LTV 50% / Trình ban)</option>
                    <option value="Ngoại lệ">Ngoại lệ (LTV Tùy chỉnh)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Appraised Value + LTV + Date + Tenor + Expiry */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="block font-medium mb-1">Giá trị định giá (VNĐ) *</label>
                  <input
                    type="text"
                    required
                    placeholder="1.370.000.000"
                    value={inputAppraisedValue}
                    onChange={(e) => setInputAppraisedValue(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">LTV (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    readOnly={inputAssetType !== 'Ngoại lệ'}
                    value={inputLtvPercent}
                    onChange={(e) => setInputLtvPercent(e.target.value)}
                    className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle} ${
                      inputAssetType !== 'Ngoại lệ' ? 'bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-90' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày định giá TS</label>
                  <input
                    type="date"
                    value={inputAppraisalDate}
                    onChange={(e) => setInputAppraisalDate(e.target.value)}
                    className={`w-full rounded-xl p-2 font-semibold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Thời hạn định giá</label>
                  <div className="flex items-center space-x-1 h-[34px]">
                    {[6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setInputAppraisalTenorMonths(m)}
                        className={`flex-1 h-full text-xs rounded-xl font-bold border transition-colors ${
                          inputAppraisalTenorMonths === m
                            ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                            : isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {m}T
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày hết hạn định giá</label>
                  <input
                    type="date"
                    readOnly
                    value={inputAppraisalExpiryDate}
                    className={`w-full rounded-xl p-2 font-bold font-mono text-sky-600 dark:text-sky-400 border ${readonlyInputStyle}`}
                  />
                </div>
              </div>

              {/* Row 3: Address + CIF readout + Submit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Địa chỉ chi tiết TSBĐ</label>
                  <textarea
                    rows={2}
                    placeholder="Số nhà, thửa đất, tờ bản đồ, địa chỉ xã/huyện/tỉnh..."
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    className={`w-full rounded-xl p-2 resize-none border ${inputStyle}`}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {selectedCustomerObj && (
                    <div className={`p-2 rounded-xl border text-[11px] ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="text-slate-400 mb-0.5">KH chủ sở hữu:</div>
                      <div className="font-bold text-sky-600 dark:text-sky-400 truncate">{selectedCustomerObj.FullName}</div>
                      <div className="font-mono font-bold text-slate-500 dark:text-slate-300">{selectedCustomerObj.CifKh}</div>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-md shadow-sky-600/20"
                  >
                    {selectedCollateral ? '💾 CẬP NHẬT TSĐB' : '➕ LƯU TSĐB MỚI'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── BOTTOM SECTION: Full-width Collateral Table ── */}
      <div className={`${containerCardBg} rounded-2xl overflow-hidden border flex flex-col`}
        style={{ height: formCollapsed ? 'calc(100vh - 185px)' : 'calc(100vh - 390px)' }}
      >
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
          <span className="text-xs font-bold">DANH SÁCH TSĐB (SẮP XẾP A - Z: {filteredCollaterals.length})</span>
          <span className="text-[11px] text-slate-400">Bấm vào dòng để chọn/chỉnh sửa</span>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${tableHeaderStyle}`}>
              <tr>
                <th className="p-3 whitespace-nowrap">KH CHỦ SỞ HỮU</th>
                <th className="p-3 whitespace-nowrap">MÃ CIF</th>
                <th className="p-3 whitespace-nowrap">MÃ TS / ĐỊA CHỈ</th>
                <th className="p-3 whitespace-nowrap">XẾP LOẠI & LTV</th>
                <th className="p-3 whitespace-nowrap text-right">GIÁ TRỊ ĐỊNH GIÁ</th>
                <th className="p-3 whitespace-nowrap text-center">HẾT HẠN ĐỊNH GIÁ</th>
                <th className="p-3 whitespace-nowrap text-center">HẠN CÒN LẠI (TRẠNG THÁI)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-400">Đang tải dữ liệu TSĐB...</td></tr>
              ) : filteredCollaterals.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-400">Không tìm thấy tài sản bảo đảm nào.</td></tr>
              ) : (
                filteredCollaterals.map((col) => {
                  const isSelected = selectedCollateral?.Id === col.Id;

                  // Days remaining until appraisal expiry
                  let daysLeft: number | null = null;
                  const expDateStr = col.AppraisalExpiryDate ? col.AppraisalExpiryDate.split('T')[0] : '';
                  if (expDateStr) {
                    const parts = expDateStr.split('-');
                    if (parts.length === 3) {
                      const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      expDate.setHours(0, 0, 0, 0);
                      daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    }
                  }

                  let badgeStyle = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                  let statusText = '—';
                  if (daysLeft !== null) {
                    if (daysLeft >= 16) {
                      badgeStyle = 'bg-emerald-50 text-emerald-600 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
                      statusText = `🟢 An toàn (Còn ${daysLeft} ngày)`;
                    } else if (daysLeft >= 1) {
                      badgeStyle = 'bg-amber-50 text-amber-600 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 font-bold';
                      statusText = `🟡 Cần chú ý (Còn ${daysLeft} ngày)`;
                    } else {
                      badgeStyle = 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse';
                      statusText = `🔴 Đã hết hạn (${Math.abs(daysLeft)} ngày quá hạn)`;
                    }
                  }

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
                      <td className="p-3 max-w-xs truncate" title={col.Address || col.AssetCode || ''}>
                        <div className="font-mono text-slate-700 dark:text-slate-200 font-bold">{col.AssetCode || 'TSBĐ'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{col.Address || 'Chưa khai báo'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-sky-950 border-sky-800 text-sky-400'
                        }`}>
                          {col.AssetType || 'Loại 1'} ({col.LtvPercent || 80}%)
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                        {formatMoney(col.AppraisedValue || col.Value || 0)}
                      </td>
                      <td className="p-3 text-center font-bold font-mono whitespace-nowrap">
                        {expDateStr ? fmtDate(expDateStr) : 'N/A'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] inline-block ${badgeStyle}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
