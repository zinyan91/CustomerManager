import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';
import type { UiClasses } from '../../../lib/uiClasses';
import type { SaleItem } from '../DocumentForm';

export interface SaleFormProps {
  styles: UiClasses;
  saleContractDate: string;
  setSaleContractDate: (v: string) => void;
  saleBuyerName: string;
  setSaleBuyerName: (v: string) => void;
  saleBuyerAddress: string;
  setSaleBuyerAddress: (v: string) => void;
  saleSellerName: string;
  setSaleSellerName: (v: string) => void;
  saleSellerCccd: string;
  setSaleSellerCccd: (v: string) => void;
  saleSellerCccdDate: string;
  setSaleSellerCccdDate: (v: string) => void;
  saleSellerCccdPlace: string;
  setSaleSellerCccdPlace: (v: string) => void;
  salePayMethod: 'cash' | 'transfer';
  setSalePayMethod: (v: 'cash' | 'transfer') => void;
  saleBankOwner: string;
  setSaleBankOwner: (v: string) => void;
  saleBankAccNo: string;
  setSaleBankAccNo: (v: string) => void;
  saleBankName: string;
  setSaleBankName: (v: string) => void;
  saleBankBranch: string;
  setSaleBankBranch: (v: string) => void;
  saleStartDate: string;
  setSaleStartDate: (v: string) => void;
  saleEndDate: string;
  setSaleEndDate: (v: string) => void;
  salePaymentStage1: string;
  setSalePaymentStage1: (v: string) => void;
  saleItems: SaleItem[];
  setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  handleAddSaleItem: () => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  styles,
  saleContractDate,
  setSaleContractDate,
  saleBuyerName,
  setSaleBuyerName,
  saleBuyerAddress,
  setSaleBuyerAddress,
  saleSellerName,
  setSaleSellerName,
  saleSellerCccd,
  setSaleSellerCccd,
  saleSellerCccdDate,
  setSaleSellerCccdDate,
  saleSellerCccdPlace,
  setSaleSellerCccdPlace,
  salePayMethod,
  setSalePayMethod,
  saleBankOwner,
  setSaleBankOwner,
  saleBankAccNo,
  setSaleBankAccNo,
  saleBankName,
  setSaleBankName,
  saleBankBranch,
  setSaleBankBranch,
  saleStartDate,
  setSaleStartDate,
  saleEndDate,
  setSaleEndDate,
  salePaymentStage1,
  setSalePaymentStage1,
  saleItems,
  setSaleItems,
  handleAddSaleItem,
}) => {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-line">
          <div className="font-bold text-accent uppercase tracking-wider text-sm">
            THÔNG TIN HỢP ĐỒNG MUA BÁN HÀNG HÓA & DANH MỤC SẢN PHẨM
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-accent text-xs uppercase border-b pb-1 border-line">BÊN MUA (BÊN A)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Bên Mua</label>
              <input type="text" value={saleBuyerName} onChange={e => setSaleBuyerName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên A</label>
              <input type="text" value={saleBuyerAddress} onChange={e => setSaleBuyerAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-pos text-xs uppercase border-b pb-1 border-line">BÊN BÁN (BÊN B)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Bên Bán</label>
              <input type="text" value={saleSellerName} onChange={e => setSaleSellerName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên B</label>
              <input type="text" value={saleSellerCccd} onChange={e => setSaleSellerCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD</label>
              <input type="text" value={saleSellerCccdDate} onChange={e => setSaleSellerCccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Nơi cấp CCCD</label>
            <select value={saleSellerCccdPlace} onChange={e => setSaleSellerCccdPlace(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`}>
              {CCCD_ISSUE_PLACES.map(pl => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          </div>

          <div className="pt-2 border-t border-line space-y-2.5">
            <div className="font-bold text-warn text-[11px] uppercase">HÌNH THỨC NHẬN THANH TOÁN CỦA BÊN BÁN</div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={salePayMethod === 'cash'}
                  onChange={() => setSalePayMethod('cash')}
                />
                <span>💵 Tiền mặt</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={salePayMethod === 'transfer'}
                  onChange={() => setSalePayMethod('transfer')}
                />
                <span>🏦 Chuyển khoản</span>
              </label>
            </div>

            {salePayMethod === 'transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên chủ tài khoản</label>
                  <input type="text" value={saleBankOwner} onChange={e => setSaleBankOwner(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Số tài khoản (STK)</label>
                  <input type="text" value={saleBankAccNo} onChange={e => setSaleBankAccNo(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-accent ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Ngân hàng</label>
                  <select value={saleBankName} onChange={e => setSaleBankName(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`}>
                    {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Chi nhánh</label>
                  <input type="text" value={saleBankBranch} onChange={e => setSaleBankBranch(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-warn text-xs uppercase border-b pb-1 border-line">THỜI GIAN & TIẾN ĐỘ THANH TOÁN</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký HĐ</label>
              <DateInput value={saleContractDate} onChange={setSaleContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày giao hàng</label>
              <DateInput value={saleStartDate} onChange={setSaleStartDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày thanh toán hết</label>
              <DateInput value={saleEndDate} onChange={setSaleEndDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Đặt cọc Đợt 1 (VNĐ)</label>
              <input type="text" value={salePaymentStage1} onChange={e => setSalePaymentStage1(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-pos ${styles.inputStyle}`} />
            </div>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden border-line">
          <div className="p-2.5 bg-panel-muted font-bold flex items-center justify-between">
            <span>DANH MỤC MẶT HÀNG MUA BÁN ({saleItems.length} SẢN PHẨM)</span>
            <button type="button" onClick={handleAddSaleItem} className="flex items-center space-x-1 bg-accent hover:opacity-90 text-accent-ink px-3 py-1 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mặt hàng</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="p-2">STT</th>
                  <th className="p-2">TÊN MẶT HÀNG</th>
                  <th className="p-2 text-center">ĐVT</th>
                  <th className="p-2 text-center">SL</th>
                  <th className="p-2 text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="p-2 text-right">THÀNH TIỀN (VNĐ)</th>
                  <th className="p-2 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {saleItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <input type="text" value={item.name} onChange={e => {
                        const next = [...saleItems]; next[idx].name = e.target.value; setSaleItems(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="text" value={item.unit} onChange={e => {
                        const next = [...saleItems]; next[idx].unit = e.target.value; setSaleItems(next);
                      }} className={`w-20 rounded-lg p-1 text-center ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="number" min={1} value={item.quantity} onChange={e => {
                        const next = [...saleItems]; next[idx].quantity = Number(e.target.value) || 1; setSaleItems(next);
                      }} className={`w-16 rounded-lg p-1 text-center font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-right">
                      <input type="number" min={0} value={item.price} onChange={e => {
                        const next = [...saleItems]; next[idx].price = Number(e.target.value) || 0; setSaleItems(next);
                      }} className={`w-28 rounded-lg p-1 text-right font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-accent">
                      {(item.quantity * item.price).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setSaleItems(saleItems.filter(i => i.id !== item.id))} className="text-neg hover:text-neg">
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
