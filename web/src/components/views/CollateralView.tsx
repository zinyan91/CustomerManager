import React, { useEffect, useState } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI } from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { Collateral, Customer } from '../../types';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';

export const CollateralView: React.FC = () => {
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

      setCustomers(resCus);
      setCollaterals(resCol);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách TSĐB: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCollaterals = collaterals.filter((col) => {
    const cifMatch = !searchCif.trim() || (col.customer?.CifKh && col.customer.CifKh.toLowerCase().includes(searchCif.toLowerCase()));
    const nameMatch = !searchOwnerName.trim() || (col.customer?.FullName && col.customer.FullName.toLowerCase().includes(searchOwnerName.toLowerCase()));
    const codeMatch = !searchAssetCode.trim() || (col.AssetCode && col.AssetCode.toLowerCase().includes(searchAssetCode.toLowerCase()));
    return cifMatch && nameMatch && codeMatch;
  });

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
  };

  const clearForm = () => {
    setSelectedCollateral(null);
    setInputCustomerId('');
    setInputAssetCode('');
    setInputAssetType('Loại 1');
    setInputAddress('');
    setInputAppraisedValue('');
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

    const payload: Partial<Collateral> = {
      Id: selectedCollateral?.Id,
      CustomerId: Number(inputCustomerId),
      AssetCode: inputAssetCode.trim() || null,
      AssetType: inputAssetType,
      Address: inputAddress.trim() || null,
      AppraisedValue: val,
      Value: val,
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

  const formatMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

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

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            TRA CỨU & DANH MỤC TÀI SẢN BẢO ĐẢM (TSĐB)
          </div>
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
              Số TSĐB: <span className="text-sky-400 font-bold">{filteredCollaterals.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
              Tổng giá trị: <span className="text-emerald-400 font-bold">{formatMoney(totalAppraisedVal)}</span>
            </div>
          </div>
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
            placeholder="Họ tên KH CSH..."
            value={searchOwnerName}
            onChange={(e) => setSearchOwnerName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Mã TS chứng thư..."
            value={searchAssetCode}
            onChange={(e) => setSearchAssetCode(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-215px)]">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">DANH SÁCH TSĐB ({filteredCollaterals.length})</span>
            <span className="text-[11px] text-slate-500">Bấm vào dòng để chọn/chỉnh sửa</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3 whitespace-nowrap">MÃ TS</th>
                  <th className="p-3 whitespace-nowrap">KH CHỦ SỞ HỮU</th>
                  <th className="p-3 whitespace-nowrap">XẾP LOẠI</th>
                  <th className="p-3 whitespace-nowrap text-right">GIÁ TRỊ ĐỊNH GIÁ (VNĐ)</th>
                  <th className="p-3 whitespace-nowrap">ĐỊA CHỈ TSBĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={5} className="text-center p-8 text-slate-500">Đang tải dữ liệu TSĐB...</td></tr>
                ) : filteredCollaterals.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-slate-500">Không tìm thấy tài sản bảo đảm nào.</td></tr>
                ) : (
                  filteredCollaterals.map((col) => {
                    const isSelected = selectedCollateral?.Id === col.Id;
                    return (
                      <tr
                        key={col.Id}
                        onClick={() => handleSelectCollateral(col)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-950/60 border-l-4 border-l-sky-500 font-semibold' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">{col.AssetCode || 'N/A'}</td>
                        <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                          {col.customer?.FullName || 'Khách hàng chưa rõ'} ({col.customer?.CifKh || ''})
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="bg-slate-800 border border-slate-700 text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {col.AssetType || 'Loại 1'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400 text-right whitespace-nowrap">
                          {formatMoney(col.AppraisedValue || col.Value || 0)}
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{col.Address || 'Chưa khai báo'}</td>
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
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>{selectedCollateral ? 'CẬP NHẬT THÔNG TIN TSĐB' : 'KÊ KHAI TSĐB MỚI'}</span>
            </h3>
            <button onClick={clearForm} className="text-xs text-sky-400 hover:underline font-semibold">+ Tạo mới</button>
          </div>

          <form onSubmit={handleSaveCollateral} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-400 mb-1">Khách hàng chủ sở hữu *</label>
              <select
                required
                value={inputCustomerId}
                onChange={(e) => setInputCustomerId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn Khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.Id} value={c.Id}>👤 {c.FullName} ({c.CifKh})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Mã TS (Chứng thư định giá)</label>
                <input
                  type="text"
                  value={inputAssetCode}
                  onChange={(e) => setInputAssetCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Xếp loại tài sản *</label>
                <select
                  value={inputAssetType}
                  onChange={(e) => setInputAssetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="Loại 1">Loại 1 (LTV 80%)</option>
                  <option value="Loại 2">Loại 2 (LTV 70%)</option>
                  <option value="Loại 3">Loại 3 (LTV 60%)</option>
                  <option value="Loại 4">Loại 4 (LTV 55%)</option>
                  <option value="Hạn chế">Hạn chế (LTV 0%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Giá trị định giá (VNĐ) *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: 960.000.000"
                value={inputAppraisedValue}
                onChange={(e) => setInputAppraisedValue(formatMoneyInput(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 text-base font-bold focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Địa chỉ chi tiết TSBĐ</label>
              <textarea
                rows={3}
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20"
            >
              {selectedCollateral ? 'CẬP NHẬT TÀI SẢN' : 'LƯU TÀI SẢN BẢO ĐẢM'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
