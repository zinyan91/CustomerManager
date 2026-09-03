import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';
import { fmtDate } from '../../../lib/utils';
import type { UiClasses } from '../../../lib/uiClasses';
import type { TemplateType } from '../TemplateSelector';
import type { PaymentStageItem } from '../DocumentForm';

export interface PaymentRequestFormProps {
  styles: UiClasses;
  selectedTemplate: TemplateType;
  constContractDate: string;
  setConstContractDate?: (v: string) => void;
  constPartyAName: string;
  setConstPartyAName: (v: string) => void;
  saleContractDate: string;
  setSaleContractDate?: (v: string) => void;
  saleBuyerName: string;
  setSaleBuyerName: (v: string) => void;
  recipientTitle?: 'Ông' | 'Bà';
  setRecipientTitle?: (v: 'Ông' | 'Bà') => void;
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
  constPartyAName,
  setConstPartyAName,
  saleContractDate,
  saleBuyerName,
  setSaleBuyerName,
  recipientTitle = 'Ông',
  setRecipientTitle,
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
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b pb-2 border-line/60">
        <div className="font-bold text-accent uppercase tracking-wider text-xs">
          THÔNG TIN GIẤY ĐỀ NGHỊ THANH TOÁN ({isSale ? 'HĐ MUA BÁN HÀNG HÓA' : 'HĐ THI CÔNG NHÀ Ở'})
        </div>
      </div>

      <div className="space-y-2.5 pb-4 border-b border-line/40">
        <div className="font-bold text-accent text-xs uppercase tracking-wider flex items-center justify-between pb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            <span>NGƯỜI NHẬN ĐỀ NGHỊ THANH TOÁN</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-normal normal-case">
            Căn cứ HĐ ký ngày: <strong className="text-foreground">{fmtDate(isSale ? saleContractDate : constContractDate)}</strong>
          </span>
        </div>
        <div>
          <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Kính gửi</label>
          <div className="flex gap-1.5">
            <select
              value={recipientTitle}
              onChange={e => setRecipientTitle && setRecipientTitle(e.target.value as 'Ông' | 'Bà')}
              className={`w-20 shrink-0 rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
            >
              <option value="Ông">Ông</option>
              <option value="Bà">Bà</option>
            </select>
            <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-4 border-b border-line/40">
        <div className="font-bold text-warn text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warn"></span>
          <span>THÔNG TIN BÊN ĐỀ NGHỊ THANH TOÁN</span>
        </div>

        <div className="flex items-center space-x-6 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer font-bold select-none">
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
          <label className="flex items-center space-x-2 cursor-pointer font-bold select-none">
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
          <div className="space-y-2 pt-2 border-t border-warn/30">
            <div className="text-[11px] text-warn italic">
              💡 Thông tin tiền mặt hiển thị trên biểu mẫu: Họ tên, Số CCCD, Ngày cấp, Nơi cấp.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên người nhận tiền mặt</label>
                <input type="text" value={payCashName || ''} onChange={e => setPayCashName && setPayCashName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Số CCCD</label>
                <input type="text" value={payCashCccd || ''} onChange={e => setPayCashCccd && setPayCashCccd(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày cấp CCCD</label>
                <input type="text" value={payCashCccdDate || ''} onChange={e => setPayCashCccdDate && setPayCashCccdDate(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Nơi cấp CCCD</label>
                <select value={payCashCccdPlace || ''} onChange={e => setPayCashCccdPlace && setPayCashCccdPlace(e.target.value)} className={`w-full rounded-xl p-2.5 font-semibold ${styles.inputStyle}`}>
                  {CCCD_ISSUE_PLACES.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-2 border-t border-warn/30">
            <div className="text-[11px] text-warn italic">
              💡 Thông tin chuyển khoản hiển thị trên biểu mẫu: Họ tên chủ tài khoản, Số tài khoản, Ngân hàng, Chi nhánh.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên Chủ tài khoản</label>
                <input type="text" value={payBankOwner || ''} onChange={e => setPayBankOwner && setPayBankOwner(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Số tài khoản (STK)</label>
                <input type="text" value={payBankAccNo || ''} onChange={e => setPayBankAccNo && setPayBankAccNo(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngân hàng</label>
                <select value={payBankName || ''} onChange={e => setPayBankName && setPayBankName(e.target.value)} className={`w-full rounded-xl p-2.5 font-semibold ${styles.inputStyle}`}>
                  {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Chi nhánh Ngân hàng</label>
                <input type="text" value={payBankBranch || ''} onChange={e => setPayBankBranch && setPayBankBranch(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden border-line/70 bg-surface/60 shadow-2xs">
        <div className="p-3 bg-surface border-b border-line/70 font-bold flex items-center justify-between">
          <span className="text-xs uppercase text-accent font-bold">DANH SÁCH CÁC ĐỢT THANH TOÁN (THANH TOÁN NHIỀU ĐỢT)</span>
          <button
            type="button"
            onClick={handleAddPayStage}
            className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm đợt thanh toán</span>
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint">
              <tr>
                <th className="px-2.5 py-2 w-10 text-center">STT</th>
                <th className="px-2.5 py-2">TÊN ĐỢT THANH TOÁN</th>
                <th className="px-2.5 py-2 w-48">TRẠNG THÁI</th>
                <th className="px-2.5 py-2 text-right w-36">SỐ TIỀN (VNĐ)</th>
                <th className="px-2.5 py-2">GHI CHÚ</th>
                <th className="px-2.5 py-2 text-center w-10">XÓA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {(payStages || []).map((stage, idx) => (
                <tr key={stage.id} className="hover:bg-panel-muted/40 transition-colors">
                  <td className="px-2.5 py-2 text-center font-bold text-ink-muted">{idx + 1}</td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      value={stage.stageName}
                      onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].stageName = e.target.value; setPayStages(next);
                      }}
                      className={`w-full rounded-lg p-1.5 ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <select
                      value={stage.status}
                      onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].status = e.target.value as any; setPayStages(next);
                      }}
                      className={`w-full rounded-lg p-1.5 font-bold ${styles.inputStyle}`}
                    >
                      <option value="paid">Đã thanh toán đợt này</option>
                      <option value="current">Đề nghị thanh toán đợt này</option>
                      <option value="future">Chờ thanh toán sau</option>
                    </select>
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <input
                      type="text"
                      value={stage.amount}
                      onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const digits = e.target.value.replace(/\D/g, '');
                        const next = [...payStages]; next[idx].amount = digits ? Number(digits).toLocaleString('vi-VN') : ''; setPayStages(next);
                      }}
                      className={`w-32 rounded-lg p-1.5 text-right font-mono font-bold text-accent ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      value={stage.note || ''}
                      onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].note = e.target.value; setPayStages(next);
                      }}
                      className={`w-full rounded-lg p-1.5 ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!setPayStages || !payStages) return;
                        setPayStages(payStages.filter(s => s.id !== stage.id));
                      }}
                      className="p-1 rounded-lg text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                    >
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
