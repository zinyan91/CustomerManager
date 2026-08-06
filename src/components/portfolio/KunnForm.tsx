import React from 'react';
import {
  FileText, X, AlertTriangle, Building2, DollarSign, ShieldCheck, Plus, Save, Trash2,
} from 'lucide-react';
import { fmtDate, fmtMoney, formatMoneyInput } from '../../lib/utils';
import { addMonthsToDate, parseKunnTenorMonths } from '../../lib/loanMath';
import { PRINCIPAL_REPAY_OPTIONS, INTEREST_REPAY_OPTIONS } from '../../lib/loanProductRules';
import type { LimitGroupStatus } from '../../lib/creditLimit';
import type { KunnIssue } from '../../lib/creditContract';
import type {
  LoanContract, CreditContract, Customer, Collateral, RateAdjustmentHistoryItem,
} from '../../types';
import { DateInput } from '../DateInput';

interface KunnFormProps {
  containerCardBg: string;
  sectionBoxBg: string;
  inputStyle: string;
  readonlyInputStyle: string;
  labelStyle: string;
  tableHeaderStyle: string;

  selectedContract: LoanContract | null;
  foundCustomer: Customer | null;
  setShowForm: (v: boolean) => void;

  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  handleSaveContract: (e: React.FormEvent, forceInsert?: boolean) => void;
  handleDeleteContract: (e: React.MouseEvent, contractId: number, contractNumber: string) => void;
  loading: boolean;

  creditContracts: CreditContract[];
  selectableCreditContracts: CreditContract[];
  applyCreditContractToForm: (cc: CreditContract, keepKunnNumber?: boolean) => void;
  formCreditContract: CreditContract | null;

  formKunnNumber: string;
  setFormKunnNumber: (v: string) => void;

  formLimitStatus: LimitGroupStatus | undefined;
  kunnIssues: KunnIssue[];
  formGrantedLimit: number;
  totalExistingKunnBalance: number;
  availableBeforeThisKunn: number;
  remainingHmtdLimit: number;

  formLoanAmount: string;
  setFormLoanAmount: (v: string) => void;

  interestRateMode: 'pref' | 'base';
  setInterestRateMode: (v: 'pref' | 'base') => void;
  ratePreferential: string;
  setRatePreferential: (v: string) => void;
  ratePreferentialMonths: string;
  setRatePreferentialMonths: (v: string) => void;
  rateBase: string;
  setRateBase: (v: string) => void;
  rateMargin: string;
  setRateMargin: (v: string) => void;
  postPrefRate: number;
  normalRate: number;
  surchargeVal: number;
  currentActiveRateDisplay: number;
  rateConditionSurcharge: string;
  setRateConditionSurcharge: (v: string) => void;
  rateFloor: string;
  setRateFloor: (v: string) => void;

  rateHistory: RateAdjustmentHistoryItem[];
  setRateHistory: (v: RateAdjustmentHistoryItem[]) => void;
  newAdjDate: string;
  setNewAdjDate: (v: string) => void;
  newAdjBaseRate: string;
  setNewAdjBaseRate: (v: string) => void;
  newAdjMargin: string;
  setNewAdjMargin: (v: string) => void;
  newAdjPenalty: string;
  setNewAdjPenalty: (v: string) => void;
  newAdjReason: string;
  setNewAdjReason: (v: string) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;

  graceOptions: number[];
  selectedCollaterals: Collateral[];
  maxAllowedLoanLtv: number;
}

export const KunnForm: React.FC<KunnFormProps> = ({
  containerCardBg, sectionBoxBg, inputStyle, readonlyInputStyle, labelStyle, tableHeaderStyle,
  selectedContract, foundCustomer, setShowForm,
  form, setForm, handleSaveContract, handleDeleteContract, loading,
  creditContracts, selectableCreditContracts, applyCreditContractToForm, formCreditContract,
  formKunnNumber, setFormKunnNumber,
  formLimitStatus, kunnIssues, formGrantedLimit, totalExistingKunnBalance, availableBeforeThisKunn, remainingHmtdLimit,
  formLoanAmount, setFormLoanAmount,
  interestRateMode, setInterestRateMode,
  ratePreferential, setRatePreferential, ratePreferentialMonths, setRatePreferentialMonths,
  rateBase, setRateBase, rateMargin, setRateMargin,
  postPrefRate, normalRate, surchargeVal, currentActiveRateDisplay,
  rateConditionSurcharge, setRateConditionSurcharge, rateFloor, setRateFloor,
  rateHistory, setRateHistory,
  newAdjDate, setNewAdjDate, newAdjBaseRate, setNewAdjBaseRate, newAdjMargin, setNewAdjMargin,
  newAdjPenalty, setNewAdjPenalty, newAdjReason, setNewAdjReason, showNotify,
  graceOptions, selectedCollaterals, maxAllowedLoanLtv,
}) => {
  return (
    <div className={`${containerCardBg} rounded-2xl p-5 space-y-5 border shadow-xl`}>
      <div className={`flex items-center justify-between pb-3 border-b ${'border-line'}`}>
        <h3 className="font-bold flex items-center space-x-2 text-sm">
          <FileText className="w-4 h-4 text-accent" />
          <span>{selectedContract ? `THÔNG TIN GIẤY NHẬN NỢ: ${selectedContract.ContractNumber}` : 'GIẢI NGÂN KUNN MỚI'}</span>
        </h3>
        <button onClick={() => setShowForm(false)} className="text-ink-faint hover:text-ink-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSaveContract} className="space-y-6">
        <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
          <div className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>HỢP ĐỒNG TÍN DỤNG CHA & PHÂN LOẠI NỢ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Hợp đồng tín dụng (HĐTD) *</label>
              <select
                value={form.CreditContractId ?? ''}
                onChange={e => {
                  const id = parseInt(e.target.value, 10);
                  const cc = creditContracts.find(x => x.Id === id);
                  if (cc) applyCreditContractToForm(cc, !!selectedContract);
                }}
                className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-accent ${inputStyle}`}>
                <option value="">— Chọn HĐTD —</option>
                {selectableCreditContracts.map(cc => (
                  <option key={cc.Id} value={cc.Id}>{cc.HdtdNumber}</option>
                ))}
              </select>
              {creditContracts.length === 0 && (
                <div className="mt-1 text-[10px] font-semibold text-neg">
                  Khách hàng chưa có HĐTD. Tạo ở tab Hợp Đồng Tín Dụng trước.
                </div>
              )}
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Số KUNN (GNN) *</label>
              <input type="text" value={formKunnNumber}
                onChange={e => setFormKunnNumber(e.target.value)}
                placeholder="2002/HDTD/9634078/GNN-01"
                className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-pos ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Phân loại Nhóm nợ</label>
              <select value={form.DebtGroup ?? 1}
                onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
                className={`w-full rounded-xl p-2.5 text-xs font-bold ${inputStyle}`}>
                {[1, 2, 3, 4, 5].map(g => (
                  <option key={g} value={g}>
                    Nhóm {g} ({g === 1 ? 'Nợ đủ tiêu chuẩn <10 ngày' : g === 2 ? 'Nợ cần chú ý 10-90 ngày' : g === 3 ? 'Nợ dưới tiêu chuẩn 91-180 ngày' : g === 4 ? 'Nợ nghi ngờ 181-360 ngày' : 'Nợ có khả năng mất vốn >360 ngày'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formCreditContract && (
            <div className={`rounded-xl p-3 border text-[11px] ${'bg-panel border-line'
              }`}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono">
                <span className="text-ink-faint">{foundCustomer?.FullName} · CIF {foundCustomer?.CifKh}</span>
                <span>Phương thức: <strong>{formCreditContract.LoanMethod || '—'}</strong></span>
                <span>Mức cấp: <strong className="text-accent">{fmtMoney(formCreditContract.ContractAmount)}</strong></span>
                <span>Hiệu lực đến: <strong className={formLimitStatus?.expired ? 'text-neg' : ''}>
                  {fmtDate(formCreditContract.ContractEndDate)}
                </strong></span>
                {formCreditContract.LoanPurposeType && (
                  <span className="text-ink-faint">Mục đích: {formCreditContract.LoanPurposeType}</span>
                )}
              </div>
            </div>
          )}

          {kunnIssues.length > 0 && (
            <div className={`p-3 rounded-xl border text-[11px] font-semibold space-y-1 ${'bg-warn-soft border-warn/30 text-warn'
              }`}>
              <div className="flex items-center space-x-1.5 uppercase tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Đối chiếu với HĐTD {formCreditContract?.HdtdNumber}</span>
              </div>
              {kunnIssues.map((x, i) => <div key={i}>• {x.message}</div>)}
            </div>
          )}

          {form.LoanMethod === 'Hạn mức tín dụng' && (
            <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between text-xs font-semibold ${'bg-accent-soft border-accent/30 text-accent'
              }`}>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-accent" />
                <span>TÌNH TRẠNG HẠN MỨC TÍN DỤNG:</span>
              </div>
              <div className="flex items-center space-x-4 font-mono">
                <span>Tổng mức cấp: <strong className="text-accent">{fmtMoney(formGrantedLimit)}</strong></span>
                <span>• Dư nợ KUNN còn hiệu lực: <strong className="text-warn">{fmtMoney(totalExistingKunnBalance)}</strong></span>
                <span>• Khả năng giải ngân còn lại: <strong className={
                  formLimitStatus?.expired
                    ? 'text-neg line-through'
                    : 'text-pos'
                }>{fmtMoney(availableBeforeThisKunn)}</strong></span>
                {(formLimitStatus?.settledKunnCount ?? 0) > 0 && (
                  <span className="text-[10px] font-sans font-normal text-ink-faint">
                    (đã loại {formLimitStatus!.settledKunnCount} KUNN đã tất toán)
                  </span>
                )}
              </div>
              {formLimitStatus?.expired && (
                <div className="w-full mt-2 pt-2 border-t border-neg/30  text-[11px] font-bold text-neg">
                  ⚠️ HĐTD hết hiệu lực ngày {fmtDate(formLimitStatus.endDate)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
          <div className="text-[11px] font-bold text-pos uppercase tracking-wider flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>THÔNG TIN GIẤY NHẬN NỢ (KUNN) & GIẢI NGÂN LẦN NÀY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>
                {form.LoanMethod === 'Hạn mức tín dụng' ? 'Số tiền nhận nợ lần này (KUNN) *' : 'Số tiền giải ngân thực tế (KUNN) *'}
              </label>
              <input type="text" value={formLoanAmount}
                onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
                placeholder="650.000.000"
                className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-pos ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>
                {formLimitStatus?.revolving === false
                  ? 'Đã nhận nợ trên HĐTD này'
                  : 'Dư nợ HMTD hiện hữu (KUNN còn hiệu lực)'}
              </label>
              <input type="text" readOnly value={fmtMoney(totalExistingKunnBalance)}
                className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-warn ${readonlyInputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Hạn mức HMTD còn lại</label>
              <input type="text" readOnly value={fmtMoney(remainingHmtdLimit)}
                className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold ${remainingHmtdLimit >= 0 ? 'text-accent' : 'text-neg'
                  } ${readonlyInputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-line">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày giải ngân (bắt đầu KUNN)</label>
              <DateInput value={form.DisbursementDate || ''}
                onChange={disDate => {
                  const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
                  const kunnEnd = disDate && months > 0 ? addMonthsToDate(disDate, months) : form.KunnDueDate;
                  setForm(f => ({ ...f, DisbursementDate: disDate, KunnDueDate: kunnEnd || f.KunnDueDate }));
                }}
                className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Thời hạn KUNN</label>
              {form.LoanMethod === 'Hạn mức tín dụng' ? (
                <select
                  value={form.KunnTenor || '6 tháng'}
                  onChange={e => {
                    const val = e.target.value;
                    const months = parseKunnTenorMonths(val);
                    const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
                    setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
                  }}
                  className={`w-full rounded-xl p-2.5 text-xs font-bold text-accent ${inputStyle}`}
                >
                  {['0 tháng', '3 tháng', '5 tháng', '6 tháng', '9 tháng', '12 tháng'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form.KunnTenor || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const months = parseKunnTenorMonths(val);
                    const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
                    setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
                  }}
                  placeholder="5T / 12 tháng..."
                  className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
              )}
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>
                <span>Ngày kết thúc KUNN</span>
              </label>
              <DateInput readOnly value={form.KunnDueDate || ''}
                className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-accent border ${readonlyInputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày bắt đầu trả nợ</label>
              <DateInput value={form.RepaymentStartDate || ''}
                onChange={val => setForm(f => ({ ...f, RepaymentStartDate: val }))}
                className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-bold text-neg uppercase tracking-wider">
              CẤU TRÚC LÃI SUẤT
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="rateMode"
                  checked={interestRateMode === 'pref'}
                  onChange={() => setInterestRateMode('pref')}
                  className="w-3.5 h-3.5 text-neg "
                />
                <span>1. LS Ưu đãi & Sau ưu đãi</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="rateMode"
                  checked={interestRateMode === 'base'}
                  onChange={() => setInterestRateMode('base')}
                  className="w-3.5 h-3.5 text-neg "
                />
                <span>2. LS Thông thường (LSCS + Biên độ)</span>
              </label>
            </div>
          </div>

          {interestRateMode === 'pref' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Lãi suất ưu đãi (LSUD) %/năm</label>
                <input type="number" step="0.01" min={0} value={ratePreferential}
                  onChange={e => setRatePreferential(e.target.value)}
                  placeholder="7.5"
                  className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-neg ${inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Thời gian ưu đãi (tháng)</label>
                <input type="number" min={0} value={ratePreferentialMonths}
                  onChange={e => setRatePreferentialMonths(e.target.value)}
                  placeholder="6, 12..."
                  className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Biên độ cộng thêm %/năm</label>
                <input type="number" step="0.01" value={rateMargin}
                  onChange={e => setRateMargin(e.target.value)}
                  placeholder="3.5"
                  className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-warn ${inputStyle}`} />
              </div>
              <div className={`col-span-full space-y-2 p-3 rounded-xl border ${'bg-accent-soft border-accent/30'
                }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={labelStyle}>Lãi suất sau ưu đãi:</span>
                  <span className="font-mono font-bold text-warn text-sm">{postPrefRate.toFixed(2)} %/năm</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/30 ">
                  <span className="font-bold text-accent ">👉 LÃI SUẤT ÁP DỤNG (KÈM PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
                  <span className="font-mono font-bold text-neg text-sm">
                    {currentActiveRateDisplay.toFixed(2)} %/năm
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Lãi suất cơ sở (LSCS) %/năm</label>
                <input type="number" step="0.01" min={0} value={rateBase}
                  onChange={e => setRateBase(e.target.value)}
                  placeholder="8.5"
                  className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-neg ${inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Biên độ cộng thêm %/năm</label>
                <input type="number" step="0.01" value={rateMargin}
                  onChange={e => setRateMargin(e.target.value)}
                  placeholder="3.5"
                  className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-warn ${inputStyle}`} />
              </div>
              <div className={`col-span-full space-y-2 p-3 rounded-xl border ${'bg-accent-soft border-accent/30'
                }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={labelStyle}>Lãi suất thông thường chuẩn (LSCS + Biên độ):</span>
                  <span className="font-mono font-bold text-warn text-sm">{normalRate.toFixed(2)} %/năm</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/30 ">
                  <span className="font-bold text-accent ">👉 LÃI SUẤT ÁP DỤNG THỰC TẾ (LSCS + BIÊN ĐỘ + PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
                  <span className="font-mono font-bold text-neg text-sm">
                    {currentActiveRateDisplay.toFixed(2)} %/năm
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Phạt cộng thêm do vi phạm điều kiện (+%/năm)</label>
              <input type="number" step="0.1" min={0} value={rateConditionSurcharge}
                onChange={e => setRateConditionSurcharge(e.target.value)}
                placeholder="0.5 (%/năm)..."
                className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-neg ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Sàn lãi suất theo hợp đồng (%/năm)</label>
              <input type="number" step="0.01" min={0} value={rateFloor}
                onChange={e => setRateFloor(e.target.value)}
                placeholder="Bỏ trống nếu hợp đồng không quy định"
                className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold ${inputStyle}`} />
              <div className="mt-1 text-[11px] text-ink-faint">
                Chặn lãi thả nổi không tụt dưới mức này khi biên độ âm
              </div>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Điều kiện phê duyệt (CASA / BCTC)</label>
              <div className="text-xs p-2.5 rounded-xl border bg-warn-soft  border-warn/30  text-warn font-medium">
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-accent text-xs uppercase flex items-center space-x-1.5">
                <span>📈 LỊCH SỬ ĐIỀU CHỈNH LÃI SUẤT</span>
              </div>
              <span className="text-[11px] text-ink-faint font-mono">
                {rateHistory.length} đợt điều chỉnh đã lưu
              </span>
            </div>

            {rateHistory.length > 0 && (
              <div className="border rounded-xl overflow-hidden border-line">
                <table className="w-full text-left text-xs">
                  <thead className={tableHeaderStyle}>
                    <tr>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">NGÀY HẠN HIỆU LỰC</th>
                      <th className="p-2.5 text-right">LSCS (%)</th>
                      <th className="p-2.5 text-right">BIÊN ĐỘ (%)</th>
                      <th className="p-2.5 text-right">PHẠT (%)</th>
                      <th className="p-2.5 text-right">LÃI SUẤT ÁP DỤNG (%/NĂM)</th>
                      <th className="p-2.5">NỘI DUNG / LÝ DO ĐIỀU CHỈNH</th>
                      <th className="p-2.5 text-center">XÓA</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${'divide-line'}`}>
                    {rateHistory.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-panel-muted ">
                        <td className="p-2.5 font-bold text-center">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-accent">{fmtDate(item.effectiveDate)}</td>
                        <td className="p-2.5 text-right font-mono">{item.baseRatePercent ? `${item.baseRatePercent}%` : '—'}</td>
                        <td className="p-2.5 text-right font-mono">{item.marginPercent ? `+${item.marginPercent}%` : '—'}</td>
                        <td className="p-2.5 text-right font-mono text-neg font-bold">{item.penaltyPercent ? `+${item.penaltyPercent}%` : '0%'}</td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-neg text-sm">
                          {item.ratePercent.toFixed(2)} %/năm
                        </td>
                        <td className="p-2.5 text-ink-muted font-medium">{item.reason || 'Điều chỉnh LSCS'}</td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => setRateHistory(rateHistory.filter(h => h.id !== item.id))}
                            className="text-neg hover:text-neg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 rounded-xl border border-accent/30  bg-accent-soft  space-y-3">
              <div className="font-bold text-accent  text-xs">
                + THÊM ĐỢT ĐIỀU CHỈNH LÃI SUẤT MỚI (KHI NGÂN HÀNG THAY ĐỔI LSCS / THẢ NỔI):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Ngày hiệu lực *</label>
                  <DateInput value={newAdjDate} onChange={setNewAdjDate} className={`w-full rounded-xl p-2 ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>LSCS (%)</label>
                  <input type="number" step="0.01" value={newAdjBaseRate} onChange={e => setNewAdjBaseRate(e.target.value)} placeholder="9.2" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Biên độ (%)</label>
                  <input type="number" step="0.01" value={newAdjMargin} onChange={e => setNewAdjMargin(e.target.value)} placeholder="1.35" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Phạt vi phạm (%)</label>
                  <input type="number" step="0.1" value={newAdjPenalty} onChange={e => setNewAdjPenalty(e.target.value)} placeholder="0.5" className={`w-full rounded-xl p-2 font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Lý do / Nội dung</label>
                  <input type="text" value={newAdjReason} onChange={e => setNewAdjReason(e.target.value)} placeholder="Tăng LSCS T1/2027..." className={`w-full rounded-xl p-2 ${inputStyle}`} />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => {
                  if (!newAdjDate) {
                    showNotify('error', 'Vui lòng chọn Ngày áp dụng hiệu lực!');
                    return;
                  }
                  const b = parseFloat(newAdjBaseRate) || 0;
                  const numOr = (a: string, b: string) => {
                    const x = parseFloat(a);
                    if (!Number.isNaN(x)) return x;
                    const y = parseFloat(b);
                    return Number.isNaN(y) ? 0 : y;
                  };
                  const m = numOr(newAdjMargin, rateMargin);
                  const p = numOr(newAdjPenalty, rateConditionSurcharge);
                  const totalRate = b > 0 ? (b + m + p) : (parseFloat(newAdjBaseRate) || currentActiveRateDisplay);
                  if (totalRate <= 0) {
                    showNotify('error', 'Vui lòng nhập Lãi suất cơ sở hoặc Lãi suất áp dụng!');
                    return;
                  }
                  const newRecord: RateAdjustmentHistoryItem = {
                    id: Date.now().toString(),
                    effectiveDate: newAdjDate,
                    baseRatePercent: b > 0 ? b : undefined,
                    marginPercent: m > 0 ? m : undefined,
                    penaltyPercent: p > 0 ? p : undefined,
                    ratePercent: totalRate,
                    reason: newAdjReason.trim() || 'Điều chỉnh lãi suất kỳ hạn'
                  };
                  const next = [...rateHistory, newRecord].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
                  setRateHistory(next);
                  setNewAdjDate('');
                  setNewAdjBaseRate('');
                  setNewAdjMargin('');
                  setNewAdjPenalty('');
                  setNewAdjReason('');
                  showNotify('success', `Đã thêm đợt điều chỉnh LS ${totalRate.toFixed(2)}%/năm từ ngày ${fmtDate(newAdjDate)}`);
                }} className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm">
                  <span>+ Thêm đợt điều chỉnh LS này</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
          <div className="text-[11px] font-bold text-pos uppercase tracking-wider">
            PHƯƠNG THỨC TRẢ NỢ {form.LoanMethod === 'Hạn mức tín dụng' ? '' : '& ÂN HẠN'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Cách thức trả gốc</label>
              <select value={form.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}
                disabled={form.LoanMethod === 'Hạn mức tín dụng'}
                onChange={e => setForm(f => ({ ...f, PrincipalRepaymentMethod: e.target.value }))}
                className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
                {PRINCIPAL_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Cách thức trả lãi</label>
              <select value={form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế'}
                disabled={form.LoanMethod === 'Hạn mức tín dụng'}
                onChange={e => setForm(f => ({ ...f, InterestRepaymentMethod: e.target.value }))}
                className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
                {INTEREST_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {graceOptions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-line">
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Ân hạn gốc (tháng)</label>
                <select value={form.PrincipalGracePeriodMonths ?? 0}
                  onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                  className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`}>
                  <option value={0}>Không ân hạn</option>
                  {graceOptions.map(g => (
                    <option key={g} value={g}>{g} tháng</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${labelStyle}`}>Ân hạn lãi (tháng)</label>
                <input type="number" min={0} value={form.InterestGracePeriodMonths ?? 0}
                  onChange={e => setForm(f => ({ ...f, InterestGracePeriodMonths: parseInt(e.target.value) || 0 }))}
                  className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-xl p-3 border text-[11px] ${sectionBoxBg}`}>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-pos uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>TÀI SẢN BẢO ĐẢM</span>
          </div>
          {selectedCollaterals.length === 0 ? (
            <div className="text-ink-faint italic">
              HĐTD chưa gán TSBĐ. Gán ở tab Hợp Đồng Tín Dụng.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
              {selectedCollaterals.map(col => (
                <span key={col.Id}>
                  {col.AssetCode || `TS-${col.Id}`}
                  <span className="text-ink-faint"> · {fmtMoney(col.AppraisedValue || col.Value || 0)}</span>
                </span>
              ))}
              <span className="text-ink-faint">
                Khả năng bảo đảm tối đa: <strong className="text-pos">{fmtMoney(maxAllowedLoanLtv)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={form.IsSettled ?? false}
              onChange={e => setForm(f => ({ ...f, IsSettled: e.target.checked }))}
              className="w-4 h-4 rounded text-accent" />
            <span className={`font-medium ${'text-ink'}`}>Hợp đồng đã tất toán</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={form.IsRestructured ?? false}
              onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
              className="w-4 h-4 rounded text-accent" />
            <span className={`font-medium ${'text-ink'}`}>Hợp đồng đã tái cơ cấu nợ</span>
          </label>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={(e) => handleSaveContract(e, true)}
            disabled={loading}
            className="flex-1 bg-pos hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-xl transition-colors shadow-lg  text-xs flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Đang lưu...' : 'THÊM MỚI'}</span>
          </button>

          {selectedContract && (
            <>
              <button
                type="button"
                onClick={(e) => handleSaveContract(e, false)}
                disabled={loading}
                className="flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-xl transition-colors shadow-lg  text-xs flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Đang lưu...' : 'CẬP NHẬT KUNN NÀY'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteContract(e, selectedContract.Id, selectedContract.ContractNumber)}
                disabled={loading}
                className="bg-neg hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-xl transition-colors shadow-lg  text-xs flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>XOÁ KUNN</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
