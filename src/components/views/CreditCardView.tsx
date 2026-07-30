import React, { useEffect, useState } from 'react';
import { fetchCreditCardsAPI, fetchCustomersAPI, saveCreditCardAPI } from '../../lib/api';
import { formatMoneyInput } from '../../lib/utils';
import type { CreditCard as CreditCardType, Customer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export const CreditCardView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputClassification, setInputClassification] = useState('Quan hệ tín dụng');
  const [inputCardNumber, setInputCardNumber] = useState('');
  const [inputLimit, setInputLimit] = useState('');

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
      const [resCus, resCard] = await Promise.all([
        fetchCustomersAPI(),
        fetchCreditCardsAPI(),
      ]);

      setCustomers(resCus);
      setCards(resCard);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách Thẻ tín dụng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId) {
      showNotify('error', 'Vui lòng chọn Khách hàng mở thẻ!');
      return;
    }

    const limitVal = parseFloat(inputLimit.replace(/\D/g, '')) || 0;
    if (limitVal <= 0) {
      showNotify('error', 'Hạn mức thẻ phải lớn hơn 0!');
      return;
    }

    const payload: Partial<CreditCardType> = {
      CustomerId: Number(inputCustomerId),
      IssuanceType: inputClassification,
      CardNumber: inputCardNumber.trim() || null,
      CreditLimit: limitVal,
      Limit: limitVal,
    };

    try {
      await saveCreditCardAPI(payload);
      showNotify('success', 'Đã lưu thông tin Thẻ Tín Dụng thành công!');

      setInputCustomerId('');
      setInputClassification('Quan hệ tín dụng');
      setInputCardNumber('');
      setInputLimit('');

      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ thẻ: ${err.message}`);
    }
  };

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

      {/* Header */}
      <div className={`${containerCardBg} p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2">
          <CreditCard className="w-4 h-4" />
          <span>QUẢN LÝ PHÁT HÀNH THẺ TÍN DỤNG</span>
        </div>
        <div className={`border px-3 py-1.5 rounded-lg text-xs font-semibold ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}>
          Tổng Hạn Mức Thẻ: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(cards.reduce((a, b) => a + (b.CreditLimit || b.Limit || 0), 0))}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Table view */}
        <div className={`${containerCardBg} lg:col-span-7 rounded-2xl overflow-hidden border flex flex-col min-h-[350px] md:h-[calc(100vh-215px)]`}>
          <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
            <span className="text-xs font-bold">DANH SÁCH THẺ TÍN DỤNG ({cards.length})</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 ${tableHeaderStyle}`}>
                <tr>
                  <th className="p-3 whitespace-nowrap">SỐ THẺ</th>
                  <th className="p-3 whitespace-nowrap">KHÁCH HÀNG</th>
                  <th className="p-3 whitespace-nowrap">DIỆN MỞ THẺ</th>
                  <th className="p-3 whitespace-nowrap text-right">HẠN MỨC CẤP (VNĐ)</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {loading ? (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-400">Đang tải dữ liệu thẻ...</td></tr>
                ) : cards.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-400">Chưa có thẻ tín dụng nào được cấp.</td></tr>
                ) : (
                  cards.map((card) => (
                    <tr key={card.Id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                      <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">{card.CardNumber || 'THẺ_PHÁT_HÀNH'}</td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        {card.customer?.FullName || 'KH'} ({card.customer?.CifKh || ''})
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {card.IssuanceType || 'Quan hệ tín dụng'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                        {formatMoney(card.CreditLimit || card.Limit || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Card Form */}
        <div className={`${containerCardBg} lg:col-span-5 rounded-2xl p-5 border overflow-y-auto max-h-[calc(100vh-215px)] space-y-4`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-sky-500" />
              <span>CẤP THẺ TÍN DỤNG MỚI</span>
            </h3>
          </div>

          <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1">Khách hàng mở thẻ *</label>
              <select
                required
                value={inputCustomerId}
                onChange={(e) => setInputCustomerId(Number(e.target.value))}
                className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
              >
                <option value="">-- Chọn Khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.Id} value={c.Id}>👤 {c.FullName} ({c.CifKh})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Diện phân loại mở thẻ *</label>
              <select
                value={inputClassification}
                onChange={(e) => setInputClassification(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
              >
                <option value="Quan hệ tín dụng">Quan hệ tín dụng (Liên kết TSĐB)</option>
                <option value="Cầm cố sổ tiết kiệm">Cầm cố sổ tiết kiệm (STK)</option>
                <option value="Tín chấp theo lương">Tín chấp theo lương / Thu nhập</option>
                <option value="Tín chấp CBNV">Tín chấp CBNV / Đặc thù</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Số thẻ (Mask/4 số cuối)</label>
                <input
                  type="text"
                  placeholder="4532...1892"
                  value={inputCardNumber}
                  onChange={(e) => setInputCardNumber(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Hạn mức thẻ (VNĐ) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 50.000.000"
                  value={inputLimit}
                  onChange={(e) => setInputLimit(formatMoneyInput(e.target.value))}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm ${inputStyle}`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-md shadow-sky-600/20"
            >
              CẤP THẺ TÍN DỤNG
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
