import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { CreditCard as CreditCardType, Customer } from '../../types';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export const CreditCardView: React.FC = () => {
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputClassification, setInputClassification] = useState('Quan hệ tín dụng');
  const [inputCardNumber, setInputCardNumber] = useState('');
  const [inputLimit, setInputLimit] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');

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
        supabase.from('Customers').select('*').order('full_name'),
        supabase.from('CreditCards').select('*, customer:Customers(*)').order('id', { ascending: false }),
      ]);

      if (resCus.data) setCustomers(resCus.data);
      if (resCard.data) setCards(resCard.data);
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

    const limit = parseFloat(inputLimit.replace(/\D/g, '')) || 0;

    const payload = {
      customer_id: Number(inputCustomerId),
      card_type_classification: inputClassification,
      card_number: inputCardNumber.trim() || null,
      credit_limit: limit,
      outstanding_balance: 0,
      remarks: inputRemarks.trim() || null,
    };

    try {
      const { error } = await supabase.from('CreditCards').insert([payload]);
      if (error) throw error;
      showNotify('success', 'Đã cấp thẻ tín dụng thành công!');
      setInputCustomerId('');
      setInputCardNumber('');
      setInputLimit('');
      setInputRemarks('');
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu thẻ tín dụng: ${err.message}`);
    }
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

      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
            PHÂN HỆ QUẢN LÝ THẺ TÍN DỤNG
          </h2>
          <p className="text-xs text-slate-400">Cấp & theo dõi Thẻ tín dụng theo diện Cầm cố STK, Quan hệ tín dụng, Tín chấp lương</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
          Tổng Hạn Mức Thẻ: {formatMoney(cards.reduce((a, b) => a + (b.credit_limit || 0), 0))}
        </div>
      </div>

      {/* Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left DataGrid */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-215px)]">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">DANH SÁCH THẺ TÍN DỤNG ({cards.length})</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3 whitespace-nowrap">SỐ THẺ</th>
                  <th className="p-3 whitespace-nowrap">KHÁCH HÀNG</th>
                  <th className="p-3 whitespace-nowrap">DIỆN MỞ THẺ</th>
                  <th className="p-3 whitespace-nowrap text-right">HẠN MỨC CẤP (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-500">Đang tải dữ liệu thẻ...</td></tr>
                ) : cards.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-500">Chưa có thẻ tín dụng nào được cấp.</td></tr>
                ) : (
                  cards.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-sky-400 font-bold whitespace-nowrap">{card.card_number || 'THẺ_PHÁT_HÀNH'}</td>
                      <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                        {card.customer?.full_name || 'KH'} ({card.customer?.cif_kh || ''})
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {card.card_type_classification}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400 text-right whitespace-nowrap">
                        {formatMoney(card.credit_limit || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-215px)]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>CẤP THẺ TÍN DỤNG MỚI</span>
            </h3>
          </div>

          <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-400 mb-1">Khách hàng mở thẻ *</label>
              <select
                required
                value={inputCustomerId}
                onChange={(e) => setInputCustomerId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn Khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>👤 {c.full_name} ({c.cif_kh})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Diện phân loại mở thẻ *</label>
              <select
                value={inputClassification}
                onChange={(e) => setInputClassification(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold focus:outline-none focus:border-sky-500"
              >
                <option value="Quan hệ tín dụng">Quan hệ tín dụng (Liên kết TSĐB)</option>
                <option value="Cầm cố sổ tiết kiệm">Cầm cố sổ tiết kiệm (STK)</option>
                <option value="Tín chấp theo lương">Tín chấp theo lương / Thu nhập</option>
                <option value="Tín chấp CBNV">Tín chấp CBNV / Đặc thù</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Số thẻ (Mask/4 số cuối)</label>
                <input
                  type="text"
                  placeholder="4532...1892"
                  value={inputCardNumber}
                  onChange={(e) => setInputCardNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Hạn mức thẻ (VNĐ) *</label>
                <input
                  type="text"
                  required
                  placeholder="50,000,000"
                  value={inputLimit}
                  onChange={(e) => setInputLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-bold text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20"
            >
              CẤP THẺ TÍN DỤNG
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
