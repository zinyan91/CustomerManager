import React, { useEffect, useState, useMemo } from 'react';
import { UI } from '../../lib/uiClasses';
import {
  fetchCreditCardsAPI, fetchCustomersAPI, saveCreditCardAPI, deleteCreditCardAPI,
  fetchCollateralsByCustomerAPI, fetchCollateralsAPI
} from '../../lib/api';
import { formatMoneyInput, fmtMoney, parseMoneyInput } from '../../lib/utils';
import { getEffectiveLtv, assetClassLabel, CARD_STK_LTV_PERCENT, collateralValue, maxLoanFromCollateral } from '../../lib/collateralMath';
import { checkCardLimit, cardGrantedLimit, type CardLimitCheck } from '../../lib/creditLimit';
import { fetchContractsByCustomerAPI } from '../../lib/api';
import type { CreditCard as CreditCardType, Customer, Collateral, LoanContract as LoanContractType } from '../../types';
import { CreditCard, AlertCircle, Plus, ChevronUp, ChevronDown, Trash2, Edit3, ShieldCheck, Search } from 'lucide-react';
import { Toast } from '../Toast';
import { AdaptiveTable } from '../AdaptiveTable';

const LY_DO_CHAN: Record<string, (k: CardLimitCheck) => string> = {
  none: () => '',
  no_collateral: () => '',
  appraisal_unusable: () =>
    'Định giá tài sản đã hết hiệu lực nên không dùng để cấp hạn mức được. Định giá lại trước khi mở thẻ.',
  product_cap_exceeded: k =>
    `Thẻ bảo đảm bằng sổ tiết kiệm chỉ được cấp tối đa ${CARD_STK_LTV_PERCENT}% mệnh giá, tức ${fmtMoney(k.productCap || 0)}. Hạn mức đề nghị vượt ${fmtMoney(k.excessAmount)}.`,
  cluster_exceeded: k =>
    `Khả năng bảo đảm của cụm tài sản là ${fmtMoney(k.clusterCapacity)}, đã sử dụng ${fmtMoney(k.clusterUsed)} cho các khoản vay và thẻ khác. Hạn mức khả dụng còn ${fmtMoney(k.maxAllowed)}, hạn mức đề nghị vượt ${fmtMoney(k.excessAmount)}.`,
};

export const CreditCardView: React.FC = () => {

  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCollaterals, setAllCollaterals] = useState<Collateral[]>([]);
  const [customerCollaterals, setCustomerCollaterals] = useState<Collateral[]>([]);
  const [customerContracts, setCustomerContracts] = useState<LoanContractType[]>([]);
  const [exceptionAck, setExceptionAck] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (inputCustomerId) {
      fetchCollateralsByCustomerAPI(Number(inputCustomerId))
        .then(cols => setCustomerCollaterals(cols))
        .catch(() => setCustomerCollaterals([]));
      fetchContractsByCustomerAPI(Number(inputCustomerId))
        .then(cons => setCustomerContracts(cons))
        .catch(() => setCustomerContracts([]));
    } else {
      setCustomerCollaterals([]);
      setCustomerContracts([]);
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

  const selectedCollateralObj = useMemo(() => {
    if (!inputCollateralId) return null;
    return customerCollaterals.find(c => c.Id === Number(inputCollateralId)) || null;
  }, [inputCollateralId, customerCollaterals]);

  const limitCheck = useMemo(
    () => checkCardLimit(
      parseMoneyInput(inputLimit),
      selectedCollateralObj,
      customerContracts,
      cards.filter(c => c.CustomerId === Number(inputCustomerId) && c.Id !== selectedCard?.Id),
      customerCollaterals,
    ),
    [inputLimit, selectedCollateralObj, customerContracts, customerCollaterals, cards, inputCustomerId, selectedCard]
  );

  const selectedCollateralMaxLimit = limitCheck.maxAllowed;

  const handleSelectCardForEdit = (card: CreditCardType) => {
    setSelectedCard(card);
    setFormCollapsed(false);
    setInputCustomerId(card.CustomerId);
    setInputClassification(card.IssuanceType || 'Quan hệ tín dụng (Liên kết TSĐB)');
    setInputCardNumber(card.CardNumber || '');
    const limit = cardGrantedLimit(card);
    setInputLimit(limit ? limit.toLocaleString('vi-VN') : '');
    setInputNote(card.Note || '');
    setExceptionAck(!!card.IsLtvException);
    setExceptionReason(card.LtvExceptionReason || '');
    setInputCollateralId(card.CollateralId || '');
  };

  const handleResetForm = () => {
    setSelectedCard(null);
    setInputCustomerId('');
    setInputClassification('Quan hệ tín dụng (Liên kết TSĐB)');
    setInputCollateralId('');
    setInputCardNumber('');
    setInputLimit('');
    setInputNote('');
    setExceptionAck(false);
    setExceptionReason('');
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId) {
      showNotify('error', 'Vui lòng chọn Khách hàng mở thẻ!');
      return;
    }

    const limitVal = parseMoneyInput(inputLimit);
    if (limitVal <= 0) {
      showNotify('error', 'Hạn mức thẻ phải lớn hơn 0!');
      return;
    }

    if (limitCheck.exceeded && !exceptionAck) {
      showNotify('error', LY_DO_CHAN[limitCheck.blocker](limitCheck));
      return;
    }
    if (limitCheck.exceeded && exceptionAck && exceptionReason.trim().length === 0) {
      showNotify('error', 'Khai lý do cấp vượt trần trước khi lưu.');
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
      IsLtvException: limitCheck.exceeded && exceptionAck,
      LtvExceptionReason: limitCheck.exceeded && exceptionAck ? exceptionReason.trim() : null,
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

  const containerCardBg = UI.containerCardBg;

  const inputStyle = UI.inputStyle;

  const totalLimitSum = cards.reduce((a, b) => a + cardGrantedLimit(b), 0);
  const totalLinkedCards = cards.filter(c => c.CollateralId || c.IssuanceType?.includes('Liên kết') || c.Note?.includes('CollateralId')).length;

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <div className={`${containerCardBg} p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4`}>
        <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>QUẢN LÝ PHÁT HÀNH THẺ TÍN DỤNG</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`border px-3 py-1.5 rounded-md text-xs font-semibold ${
            'bg-panel-muted border-line text-ink-muted'
          }`}>
            Tổng Thẻ Cấp: <span className="text-accent font-bold">{cards.length} Thẻ</span>
          </div>

          <div className={`border px-3 py-1.5 rounded-md text-xs font-semibold ${
            'bg-accent-soft border-accent/30 text-accent'
          }`}>
            Liên Kết TSBĐ: <span className="font-bold">{totalLinkedCards} Thẻ</span>
          </div>

          <div className={`border px-3 py-1.5 rounded-md text-xs font-semibold ${
            'bg-pos-soft border-pos/30 text-pos'
          }`}>
            Tổng Hạn Mức Cấp: <span className="text-pos font-bold">{fmtMoney(totalLimitSum)}</span>
          </div>
        </div>
      </div>

      <div className={`${containerCardBg} rounded-lg p-5 space-y-4 border`}>
        <div className={`flex items-center justify-between pb-3 border-b ${'border-line'}`}>
          <h3 className="font-bold flex items-center space-x-2 text-xs tracking-tight text-accent">
            <CreditCard className="w-4 h-4" />
            <span>{selectedCard ? `CẬP NHẬT THẺ TÍN DỤNG #${selectedCard.CardNumber || selectedCard.Id}` : 'CẤP THẺ TÍN DỤNG MỚI'}</span>
          </h3>
          <div className="flex items-center space-x-2">
            {selectedCard && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-accent hover:underline font-semibold mr-2 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cấp Thẻ Mới</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFormCollapsed(f => !f)}
              className="text-ink-faint hover:text-ink transition-colors p-1"
            >
              {formCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!formCollapsed && (
          <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-ink-muted">Khách hàng mở thẻ *</label>
                <select
                  required
                  value={inputCustomerId}
                  onChange={(e) => setInputCustomerId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full rounded-md p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="">-- Chọn Khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c.Id} value={c.Id}>👤 {c.FullName} ({c.CifKh})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-ink-muted">Diện phân loại mở thẻ *</label>
                <select
                  value={inputClassification}
                  onChange={(e) => setInputClassification(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="Quan hệ tín dụng (Liên kết TSĐB)">Quan hệ tín dụng (Liên kết TSĐB)</option>
                  <option value="Cầm cố sổ tiết kiệm (STK)">Cầm cố sổ tiết kiệm (STK)</option>
                  <option value="Tín chấp theo lương / Thu nhập">Tín chấp theo lương / Thu nhập</option>
                  <option value="Tín chấp CBNV / Đặc thù">Tín chấp CBNV / Đặc thù</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-accent flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>TSBĐ Liên Kết (Chọn TSBĐ của KH)</span>
                </label>
                <select
                  value={inputCollateralId}
                  onChange={(e) => setInputCollateralId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full rounded-md p-2.5 font-bold text-accent  bg-accent-soft  border-accent/30 ${inputStyle}`}
                >
                  <option value="">-- Không liên kết / Chọn TSBĐ --</option>
                  {customerCollaterals.length === 0 ? (
                    <option value="" disabled>KH này chưa có TSBĐ nào</option>
                  ) : (
                    customerCollaterals.map(col => {
                      const val = collateralValue(col);
                      const ltv = getEffectiveLtv(col);
                      const maxL = Math.round(maxLoanFromCollateral(col));
                      return (
                        <option key={col.Id} value={col.Id}>
                          🏠 [Mã: {col.AssetCode || `ID#${col.Id}`}] {assetClassLabel(col.AssetType)} — {fmtMoney(val)} (LTV {ltv}% · khả năng bảo đảm {fmtMoney(maxL)})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {selectedCollateralObj && (
              <div className="p-3 rounded-md bg-accent-soft  border border-accent/30  flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <span>Mã/Địa chỉ TSBĐ: <strong className="font-bold text-ink">{selectedCollateralObj.AssetCode || '—'} ({selectedCollateralObj.Address || ''})</strong></span>
                  <span>Giá trị định giá: <strong className="font-mono text-pos">{fmtMoney(collateralValue(selectedCollateralObj))}</strong></span>
                  <span>LTV Tối đa: <strong className="font-mono text-accent">{getEffectiveLtv(selectedCollateralObj)}%</strong></span>
                  <span>Khả năng bảo đảm của cụm: <strong className="font-mono text-ink">{fmtMoney(limitCheck.clusterCapacity)}</strong></span>
                  <span>Đã sử dụng: <strong className="font-mono text-ink">{fmtMoney(limitCheck.clusterUsed)}</strong></span>
                  {limitCheck.productCap !== null && (
                    <span>Trần thẻ trên sổ tiết kiệm ({CARD_STK_LTV_PERCENT}%): <strong className="font-mono text-ink">{fmtMoney(limitCheck.productCap)}</strong></span>
                  )}
                  <span>Hạn mức khả dụng: <strong className="font-mono text-accent">{fmtMoney(selectedCollateralMaxLimit)}</strong></span>
                </div>
                {selectedCollateralMaxLimit > 0 && (
                  <button
                    type="button"
                    onClick={() => setInputLimit(selectedCollateralMaxLimit.toLocaleString('vi-VN'))}
                    className="px-3 py-1 rounded-lg bg-accent hover:bg-accent text-accent-ink font-bold text-[11px] transition-colors"
                  >
                    Áp dụng hạn mức khả dụng
                  </button>
                )}
              </div>
            )}

            {limitCheck.exceeded && (
              <div className="p-3 rounded-md bg-neg-soft border border-neg/40 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-neg shrink-0 mt-px" />
                  <span className="text-ink">{LY_DO_CHAN[limitCheck.blocker](limitCheck)}</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exceptionAck}
                    onChange={e => setExceptionAck(e.target.checked)}
                    className="w-3.5 h-3.5 accent-neg cursor-pointer"
                  />
                  <span className="font-semibold text-neg">Cấp vượt trần theo ngoại lệ đã được phê duyệt</span>
                </label>

                {exceptionAck && (
                  <input
                    type="text"
                    value={exceptionReason}
                    onChange={e => setExceptionReason(e.target.value)}
                    placeholder="Số văn bản phê duyệt và lý do"
                    className={`w-full p-2 rounded-md border text-xs ${UI.inputStyle}`}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-ink-muted">
                  Số thẻ (Mask / 4 số cuối - Tự sinh nếu để trống)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 4532...1892"
                  value={inputCardNumber}
                  onChange={(e) => setInputCardNumber(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-accent ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-ink-muted">Hạn mức thẻ (VNĐ) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 50.000.000"
                  value={inputLimit}
                  onChange={(e) => setInputLimit(formatMoneyInput(e.target.value))}
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-pos text-sm ${inputStyle}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-3 px-4 rounded-md transition-colors  flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>{selectedCard ? 'CẬP NHẬT THÔNG TIN THẺ' : 'CẤP THẺ TÍN DỤNG MỚI'}</span>
              </button>

              {selectedCard && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-panel-muted hover:bg-panel-muted text-ink-muted font-bold text-xs py-3 px-4 rounded-md transition-colors"
                >
                  HỦY BỎ
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className={`${containerCardBg} rounded-lg overflow-hidden border`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${'bg-panel-muted border-line'}`}>
          <span className="text-xs font-bold flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <span>DANH SÁCH THẺ TÍN DỤNG ĐÃ CẤP ({filteredCards.length} THẺ)</span>
          </span>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm theo Tên KH, CIF, Số thẻ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${inputStyle}`}
            />
          </div>
        </div>

        <AdaptiveTable
              rows={loading ? [] : filteredCards}
              rowKey={c => c.Id}
              isSelected={c => selectedCard?.Id === c.Id}
              emptyText={loading ? 'Đang tải dữ liệu thẻ tín dụng...' : 'Chưa có thẻ tín dụng nào khớp với tìm kiếm.'}
              cardTitle={c => c.customer?.FullName || 'KH'}
              cardSubtitle={c => c.CardNumber || '4532••••8888'}
              actions={c => (
                <>
                  <button type="button" onClick={() => handleSelectCardForEdit(c)}
                    className="p-1.5 rounded-lg bg-accent-soft text-accent border border-accent/30 transition-colors"
                    title="Sửa thẻ này">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDeleteCard(c)}
                    className="p-1.5 rounded-lg bg-neg-soft text-neg border border-neg/30 transition-colors"
                    title="Xóa thẻ này">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              columns={[
          { key: 'soThe', label: 'Số thẻ (mask)', priority: 3,
                  render: c => <span className="font-mono text-accent font-bold">{c.CardNumber || '4532••••8888'}</span> },
          { key: 'kh', label: 'Khách hàng / CIF', priority: 3, render: c => (
                  <>
                    <div className="font-bold text-ink">{c.customer?.FullName || 'KH'}</div>
                    <div className="text-[10px] font-mono text-accent">CIF: {c.customer?.CifKh || '—'}</div>
                  </>
                ) },
          { key: 'dien', label: 'Diện mở thẻ', priority: 1, render: c => (
                  <span className="bg-accent-soft text-accent border border-accent/30 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                    {c.IssuanceType || 'Quan hệ tín dụng'}
                  </span>
                ) },
          { key: 'tsbd', label: 'TSBĐ liên kết', priority: 2, render: c => {
                  const col = allCollaterals.find(x => x.Id === c.CollateralId) || null;
                  return col ? (
                    <div className="text-[11px] font-semibold text-accent">
                      🏠 [Mã: {col.AssetCode || `ID#${col.Id}`}] {assetClassLabel(col.AssetType)}
                      <div className="text-[10px] text-ink-faint font-mono">Định giá: {fmtMoney(collateralValue(col))}</div>
                    </div>
                  ) : <span className="text-ink-faint font-normal">—</span>;
                } },
          { key: 'hanMuc', label: 'Hạn mức cấp', priority: 1, align: 'right',
                  render: c => <span className="font-mono font-bold text-pos">{fmtMoney(cardGrantedLimit(c))}</span> },
        ]}
            />
      </div>
    </div>
  );
};
