import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';
import type { UiClasses } from '../../../lib/uiClasses';
import type { TemplateType } from '../TemplateSelector';
import type { PaymentStageItem } from '../DocumentForm';

export interface PaymentRequestFormProps {
  styles: UiClasses;
  selectedTemplate: TemplateType;
  constContractDate: string;
  setConstContractDate: (v: string) => void;
  constPartyAName: string;
  setConstPartyAName: (v: string) => void;
  saleContractDate: string;
  setSaleContractDate: (v: string) => void;
  saleBuyerName: string;
  setSaleBuyerName: (v: string) => void;
  payMethodType?: 'cash' | 'transfer';
  setPayMethodType?: (v: 'cash' | 'transfer') => void;
  payCashName?: string;
  setPayCashName?: (v: string) => void;
  payCashCccd?: string;
  setPayCashCccd?: (v: string) => void;
  payCashCccdDate?: string;
  setPayCashCccdDate?: (v: string) => void;
  payCashCccdPlace?: string;
  setPayCashCccdPlace?: (v: string) => void;
  payBankOwner?: string;
  setPayBankOwner?: (v: string) => void;
  payBankAccNo?: string;
  setPayBankAccNo?: (v: string) => void;
  payBankName?: string;
  setPayBankName?: (v: string) => void;
  payBankBranch?: string;
  setPayBankBranch?: (v: string) => void;
  payStages?: PaymentStageItem[];
  setPayStages?: React.Dispatch<React.SetStateAction<PaymentStageItem[]>>;
  handleAddPayStage?: () => void;
}

export const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  styles,
  selectedTemplate,
  constContractDate,
  setConstContractDate,
  constPartyAName,
  setConstPartyAName,
  saleContractDate,
  setSaleContractDate,
  saleBuyerName,
  setSaleBuyerName,
  payMethodType,
  setPayMethodType,
  payCashName,
  setPayCashName,
  payCashCccd,
  setPayCashCccd,
  payCashCccdDate,
  setPayCashCccdDate,
  payCashCccdPlace,
  setPayCashCccdPlace,
  payBankOwner,
  setPayBankOwner,
  payBankAccNo,
  setPayBankAccNo,
  payBankName,
  setPayBankName,
  payBankBranch,
  setPayBankBranch,
  payStages,
  setPayStages,
  handleAddPayStage,
}) => {
    const isSale = selectedTemplate === 'payment_request_sale';
    const recipientName = isSale ? saleBuyerName : constPartyAName;
    const setRecipientName = isSale ? setSaleBuyerName : setConstPartyAName;

    return (
      <div className={`${styles.containerCardBg} rounded-lg p-5 border space-y-4 text-xs`}>
        <div className="flex items-center justify-between border-b pb-2 border-line">
          <div className="font-bold text-accent uppercase tracking-wider text-sm">
            THÔNG TIN GIẤY ĐỀ NGHỊ THANH TOÁN ({isSale ? 'HĐ MUA BÁN HÀNG HÓA' : 'HĐ THI CÔNG NHÀ Ở'})
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-accent text-xs uppercase border-b pb-1 border-line">NGƯỜI NHẬN ĐỀ NGHỊ & HỢP ĐỒNG CĂN CỨ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Kính gửi (Người nhận thanh toán)</label>
              <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký Hợp Đồng căn cứ</label>
              <DateInput
                value={isSale ? saleContractDate : constContractDate}
                onChange={isSale ? setSaleContractDate : setConstContractDate}
                className={`w-full rounded-md p-2 ${styles.inputStyle}`}
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-warn/30  bg-warn-soft  space-y-3">
          <div className="font-bold text-warn text-xs uppercase border-b pb-1 border-warn/30  flex items-center justify-between">
            <span>THÔNG TIN BÊN BÁN / BÊN ĐỀ NGHỊ THANH TOÁN (2 PHƯƠNG THỨC)</span>
          </div>

          <div className="flex items-center space-x-6 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input
                type="radio"
                name="payMethodType"
                value="cash"
                checked={payMethodType === 'cash'}
                onChange={() => setPayMethodType && setPayMethodType('cash')}
                className="w-4 h-4 text-accent"
              />
              <span>💵 1. Thanh toán Tiền Mặt</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input
                type="radio"
                name="payMethodType"
                value="transfer"
                checked={payMethodType === 'transfer'}
                onChange={() => setPayMethodType && setPayMethodType('transfer')}
                className="w-4 h-4 text-accent"
              />
              <span>🏦 2. Thanh toán Chuyển Khoản</span>
            </label>
          </div>

          {payMethodType === 'cash' ? (
            <div className="space-y-2 pt-2 border-t border-warn/30 ">
              <div className="text-[11px] text-warn italic">
                💡 Thông tin tiền mặt hiển thị trên biểu mẫu (mỗi thông tin 1 dòng): Họ tên, CCCD số, Ngày cấp, Nơi cấp.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên người nhận tiền mặt</label>
                  <input type="text" value={payCashName || ''} onChange={e => setPayCashName && setPayCashName(e.target.value)} className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD</label>
                  <input type="text" value={payCashCccd || ''} onChange={e => setPayCashCccd && setPayCashCccd(e.target.value)} className={`w-full rounded-md p-2 font-mono ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD</label>
                  <input type="text" value={payCashCccdDate || ''} onChange={e => setPayCashCccdDate && setPayCashCccdDate(e.target.value)} className={`w-full rounded-md p-2 font-mono ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Nơi cấp CCCD</label>
                  <select value={payCashCccdPlace || ''} onChange={e => setPayCashCccdPlace && setPayCashCccdPlace(e.target.value)} className={`w-full rounded-md p-2 ${styles.inputStyle}`}>
                    {CCCD_ISSUE_PLACES.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-warn/30 ">
              <div className="text-[11px] text-warn italic">
                💡 Thông tin chuyển khoản hiển thị trên biểu mẫu (mỗi thông tin 1 dòng): Họ tên chủ tài khoản, Số tài khoản, Ngân hàng, Chi nhánh.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Chủ tài khoản</label>
                  <input type="text" value={payBankOwner || ''} onChange={e => setPayBankOwner && setPayBankOwner(e.target.value)} className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Số tài khoản (STK)</label>
                  <input type="text" value={payBankAccNo || ''} onChange={e => setPayBankAccNo && setPayBankAccNo(e.target.value)} className={`w-full rounded-md p-2 font-mono font-bold text-accent ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Ngân hàng</label>
                  <select value={payBankName || ''} onChange={e => setPayBankName && setPayBankName(e.target.value)} className={`w-full rounded-md p-2 ${styles.inputStyle}`}>
                    {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Chi nhánh Ngân hàng</label>
                  <input type="text" value={payBankBranch || ''} onChange={e => setPayBankBranch && setPayBankBranch(e.target.value)} className={`w-full rounded-md p-2 ${styles.inputStyle}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-md overflow-hidden border-line">
          <div className="p-2.5 bg-panel-muted font-bold flex items-center justify-between">
            <span>DANH SÁCH CÁC ĐỢT THANH TOÁN (THANH TOÁN NHIỀU ĐỢT)</span>
            <button type="button" onClick={handleAddPayStage} className="flex items-center space-x-1 bg-accent hover:opacity-90 text-accent-ink px-3 py-1 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm đợt thanh toán</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">STT</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">TÊN ĐỢT THANH TOÁN</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">TRẠNG THÁI</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">SỐ TIỀN (VNĐ)</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">GHI CHÚ</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(payStages || []).map((stage, idx) => (
                  <tr key={stage.id}>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-bold">{idx + 1}</td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)]">
                      <input type="text" value={stage.stageName} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].stageName = e.target.value; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)]">
                      <select value={stage.status} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].status = e.target.value as any; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 font-bold ${styles.inputStyle}`}>
                        <option value="paid">Đã thanh toán đợt này</option>
                        <option value="current">Đề nghị thanh toán đợt này</option>
                        <option value="future">Chờ thanh toán sau</option>
                      </select>
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-right">
                      <input type="text" value={stage.amount} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const digits = e.target.value.replace(/\D/g, '');
                        const next = [...payStages]; next[idx].amount = digits ? Number(digits).toLocaleString('vi-VN') : ''; setPayStages(next);
                      }} className={`w-28 rounded-lg p-1 text-right font-mono font-bold ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)]">
                      <input type="text" value={stage.note || ''} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].note = e.target.value; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                      <button type="button" onClick={() => {
                        if (!setPayStages || !payStages) return;
                        setPayStages(payStages.filter(s => s.id !== stage.id));
                      }} className="text-neg hover:text-neg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
};
