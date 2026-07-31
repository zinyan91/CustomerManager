import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchCreditCardsAPI, fetchCustomersAPI, saveCreditCardAPI, deleteCreditCardAPI,
  fetchCollateralsByCustomerAPI, fetchCollateralsAPI
} from '../../lib/api';
import { formatMoneyInput, fmtMoney, formatAssetType } from '../../lib/utils';
import type { CreditCard as CreditCardType, Customer, Collateral } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { CreditCard, CheckCircle, AlertCircle, Plus, ChevronUp, ChevronDown, Trash2, Edit3, ShieldCheck, Search } from 'lucide-react';

export const CreditCardView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCollaterals, setAllCollaterals] = useState<Collateral[]>([]);
  const [customerCollaterals, setCustomerCollaterals] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state & form collapse
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inputs
  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputClassification, setInputClassification] = useState('Quan hệ tín dụng (Liên kết TSĐB)');
  const [inputCollateralId, setInputCollateralId] = useState<number | ''>('');
  const [inputCardNumber, setInputCardNumber] = useState('');
  const [inputLimit, setInputLimit] = useState('');
  const [inputNote, setInputNote] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch collaterals when customer selection changes
  useEffect(() => {
    if (inputCustomerId) {
      fetchCollateralsByCustomerAPI(Number(inputCustomerId))
        .then(cols => setCustomerCollaterals(cols))
        .catch(() => setCustomerCollaterals([]));
    } else {
      setCustomerCollaterals([]);
      setInputCollateralId('');
    }
  }, [inputCustomerId]);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCus, resCard, resCol] = await Promise.all([
        fetchCustomersAPI(),
        fetchCreditCardsAPI(),
        fetchCollateralsAPI()
      ]);

      setCustomers(resCus);
      setCards(resCard);
      setAllCollaterals(resCol);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách Thẻ tín dụng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveLtv = (c: Collateral) => {
    if (c.LtvPercent !== undefined && c.LtvPercent !== null && c.LtvPercent > 0) return c.LtvPercent;
    const type = c.AssetType || '';
    if (type.includes('Loại 1')) return 80;
    if (type.includes('Loại 2')) return 70;
    if (type.includes('Loại 3')) return 60;
    if (type.includes('Loại 4')) return 55;
    if (type.includes('Sổ tiết kiệm')) return 100;
    return 70;
  };

  const selectedCollateralObj = useMemo(() => {
    if (!inputCollateralId) return null;
    return customerCollaterals.find(c => c.Id === Number(inputCollateralId)) || null;
  }, [inputCollateralId, customerCollaterals]);

  const selectedCollateralMaxLimit = useMemo(() => {
    if (!selectedCollateralObj) return 0;
    const val = selectedCollateralObj.AppraisedValue || selectedCollateralObj.Value || 0;
    const ltv = getEffectiveLtv(selectedCollateralObj);
    return Math.round(val * ltv / 100);
  }, [selectedCollateralObj]);

  const handleSelectCardForEdit = (card: CreditCardType) => {
    setSelectedCard(card);
    setFormCollapsed(false);
    setInputCustomerId(card.CustomerId);
    setInputClassification(card.IssuanceType || 'Quan hệ tín dụng (Liên kết TSĐB)');
    setInputCardNumber(card.CardNumber || '');
    const limit = card.CreditLimit || card.Limit || 0;
    setInputLimit(limit ? limit.toLocaleString('vi-VN') : '');
    setInputNote(card.Note || '');
    if (card.CollateralId) {
      setInputCollateralId(card.CollateralId);
    } else if (card.Note && card.Note.includes('[CollateralId:')) {
      const match = card.Note.match(/\[CollateralId:(\d+)\]/);
      if (match && match[1]) {
        setInputCollateralId(Number(match[1]));
      }
    } else {
      setInputCollateralId('');
    }
  };

  const handleResetForm = () => {
    setSelectedCard(null);
    setInputCustomerId('');
    setInputClassification('Quan hệ tín dụng (Liên kết TSĐB)');
    setInputCollateralId('');
    setInputCardNumber('');
    setInputLimit('');
    setInputNote('');
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

    const rawCardNo = inputCardNumber.trim();
    const finalCardNo = rawCardNo.length > 0
      ? rawCardNo
      : `4532••••${Math.floor(1000 + Math.random() * 9000)}`;

    const payload: Partial<CreditCardType> = {
      Id: selectedCard ? selectedCard.Id : undefined,
      CustomerId: Number(inputCustomerId),
      IssuanceType: inputClassification,
      CollateralId: inputCollateralId ? Number(inputCollateralId) : null,
      CardNumber: finalCardNo,
      CreditLimit: limitVal,
      Limit: limitVal,
      Note: inputNote.trim() || null,
    };

    try {
      await saveCreditCardAPI(payload);
      showNotify('success', selectedCard ? '✓ Cập nhật Thẻ Tín Dụng thành công!' : '✓ Đã cấp Thẻ Tín Dụng mới thành công!');
      handleResetForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ thẻ: ${err.message}`);
    }
  };

  const handleDeleteCard = async (card: CreditCardType) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA Thẻ tín dụng "${card.CardNumber || 'này'}" của KH ${card.customer?.FullName || ''}?`)) {
      return;
    }
    try {
      await deleteCreditCardAPI(card.Id);
      showNotify('success', 'Đã xóa Thẻ tín dụng thành công!');
      if (selectedCard?.Id === card.Id) {
        handleResetForm();
      }
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi xóa thẻ: ${err.message}`);
    }
  };

  const filteredCards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return cards;
    return cards.filter(c =>
      (c.CardNumber || '').toLowerCase().includes(q) ||
      (c.customer?.FullName || '').toLowerCase().includes(q) ||
      (c.customer?.CifKh || '').toLowerCase().includes(q) ||
      (c.IssuanceType || '').toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

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

  const totalLimitSum = cards.reduce((a, b) => a + (b.CreditLimit || b.Limit || 0), 0);
  const totalLinkedCards = cards.filter(c => c.CollateralId || c.IssuanceType?.includes('Liên kết') || c.Note?.includes('CollateralId')).length;

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

      {/* Header & Stats Bar */}
      <div className={`${containerCardBg} p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>QUẢN LÝ PHÁT HÀNH THẺ TÍN DỤNG</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`border px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            Tổng Thẻ Cấp: <span className="text-sky-600 dark:text-sky-400 font-bold">{cards.length} Thẻ</span>
          </div>

          <div className={`border px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-950/40 border-purple-900 text-purple-300'
          }`}>
            Liên Kết TSBĐ: <span className="font-bold">{totalLinkedCards} Thẻ</span>
          </div>

          <div className={`border px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
          }`}>
            Tổng Hạn Mức Cấp: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fmtMoney(totalLimitSum)}</span>
          </div>
        </div>
      </div>

      {/* ── FORM ĐĂNG KÝ / CẬP NHẬT THẺ TÍN DỤNG (ĐẶT TRÊN CÙNG) ── */}
      <div className={`${containerCardBg} rounded-2xl p-5 space-y-4 border shadow-xl`}>
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <h3 className="font-bold flex items-center space-x-2 text-xs uppercase tracking-wider text-sky-500">
            <CreditCard className="w-4 h-4" />
            <span>{selectedCard ? `CẬP NHẬT THẺ TÍN DỤNG #${selectedCard.CardNumber || selectedCard.Id}` : 'CẤP THẺ TÍN DỤNG MỚI'}</span>
          </h3>
          <div className="flex items-center space-x-2">
            {selectedCard && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold mr-2 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cấp Thẻ Mới</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFormCollapsed(f => !f)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {formCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!formCollapsed && (
          <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Khách hàng mở thẻ *</label>
                <select
                  required
                  value={inputCustomerId}
                  onChange={(e) => setInputCustomerId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="">-- Chọn Khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c.Id} value={c.Id}>👤 {c.FullName} ({c.CifKh})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Diện phân loại mở thẻ *</label>
                <select
                  value={inputClassification}
                  onChange={(e) => setInputClassification(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="Quan hệ tín dụng (Liên kết TSĐB)">Quan hệ tín dụng (Liên kết TSĐB)</option>
                  <option value="Cầm cố sổ tiết kiệm (STK)">Cầm cố sổ tiết kiệm (STK)</option>
                  <option value="Tín chấp theo lương / Thu nhập">Tín chấp theo lương / Thu nhập</option>
                  <option value="Tín chấp CBNV / Đặc thù">Tín chấp CBNV / Đặc thù</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-purple-600 dark:text-purple-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>TSBĐ Liên Kết (Chọn TSBĐ của KH)</span>
                </label>
                <select
                  value={inputCollateralId}
                  onChange={(e) => setInputCollateralId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full rounded-xl p-2.5 font-bold text-purple-600 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 ${inputStyle}`}
                >
                  <option value="">-- Không liên kết / Chọn TSBĐ --</option>
                  {customerCollaterals.length === 0 ? (
                    <option value="" disabled>KH này chưa có TSBĐ nào</option>
                  ) : (
                    customerCollaterals.map(col => {
                      const val = col.AppraisedValue || col.Value || 0;
                      const ltv = getEffectiveLtv(col);
                      const maxL = Math.round(val * ltv / 100);
                      return (
                        <option key={col.Id} value={col.Id}>
                          🏠 [Mã: {col.AssetCode || `ID#${col.Id}`}] {formatAssetType(col.AssetType)} — {fmtMoney(val)} (LTV {ltv}% = Max: {fmtMoney(maxL)})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {/* Badge Thông tin TSBĐ Liên Kết nếu có chọn */}
            {selectedCollateralObj && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <span>Mã/Địa chỉ TSBĐ: <strong className="font-bold text-slate-900 dark:text-slate-100">{selectedCollateralObj.AssetCode || '—'} ({selectedCollateralObj.Address || ''})</strong></span>
                  <span>Giá trị định giá: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{fmtMoney(selectedCollateralObj.AppraisedValue || selectedCollateralObj.Value)}</strong></span>
                  <span>LTV Tối đa: <strong className="font-mono text-sky-600 dark:text-sky-400">{getEffectiveLtv(selectedCollateralObj)}%</strong></span>
                  <span>Hạn mức tối đa được cấp: <strong className="font-mono text-purple-600 dark:text-purple-300">{fmtMoney(selectedCollateralMaxLimit)}</strong></span>
                </div>
                {selectedCollateralMaxLimit > 0 && (
                  <button
                    type="button"
                    onClick={() => setInputLimit(selectedCollateralMaxLimit.toLocaleString('vi-VN'))}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm transition-colors"
                  >
                    ⚡ Áp dụng Hạn mức tối đa này
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Số thẻ (Mask / 4 số cuối - Tự sinh nếu để trống)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 4532...1892"
                  value={inputCardNumber}
                  onChange={(e) => setInputCardNumber(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Hạn mức thẻ (VNĐ) *</label>
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

            <div className="flex flex-wrap items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/20 flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>{selectedCard ? 'CẬP NHẬT THÔNG TIN THẺ' : 'CẤP THẺ TÍN DỤNG MỚI'}</span>
              </button>

              {selectedCard && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 px-4 rounded-xl transition-colors"
                >
                  HỦY BỎ
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── BẢNG DANH SÁCH THẺ TÍN DỤNG (ĐẶT BÊN DƯỚI KHUNG NHẬP) ── */}
      <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'}`}>
          <span className="text-xs font-bold flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-sky-500" />
            <span>DANH SÁCH THẺ TÍN DỤNG ĐÃ CẤP ({filteredCards.length} THẺ)</span>
          </span>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Tên KH, CIF, Số thẻ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border ${inputStyle}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${tableHeaderStyle}`}>
              <tr>
                <th className="p-3 whitespace-nowrap">SỐ THẺ (MASK)</th>
                <th className="p-3 whitespace-nowrap">KHÁCH HÀNG / CIF</th>
                <th className="p-3 whitespace-nowrap">DIỆN MỞ THẺ</th>
                <th className="p-3 whitespace-nowrap text-purple-600 dark:text-purple-400">TSBĐ LIÊN KẾT</th>
                <th className="p-3 whitespace-nowrap text-right">HẠN MỨC CẤP (VNĐ)</th>
                <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-400">Đang tải dữ liệu thẻ tín dụng...</td></tr>
              ) : filteredCards.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-400">Chưa có thẻ tín dụng nào khớp với tìm kiếm.</td></tr>
              ) : (
                filteredCards.map((card) => {
                  const isSelected = selectedCard?.Id === card.Id;
                  const linkedCol = allCollaterals.find(c => c.Id === card.CollateralId) ||
                    (card.Note?.includes('[CollateralId:') ? allCollaterals.find(c => c.Id === Number(card.Note?.match(/\[CollateralId:(\d+)\]/)?.[1])) : null);

                  return (
                    <tr
                      key={card.Id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/50 border-l-4 border-l-sky-500 font-semibold'
                          : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">
                        {card.CardNumber || '4532••••8888'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{card.customer?.FullName || 'KH'}</div>
                        <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400">CIF: {card.customer?.CifKh || '—'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          {card.IssuanceType || 'Quan hệ tín dụng'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {linkedCol ? (
                          <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                            🏠 [Mã: {linkedCol.AssetCode || `ID#${linkedCol.Id}`}] {formatAssetType(linkedCol.AssetType)}
                            <div className="text-[10px] text-slate-400 font-mono">Định giá: {fmtMoney(linkedCol.AppraisedValue || linkedCol.Value)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right text-sm whitespace-nowrap">
                        {fmtMoney(card.CreditLimit || card.Limit || 0)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSelectCardForEdit(card)}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 transition-colors"
                            title="Sửa thẻ này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors"
                            title="Xóa thẻ này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
