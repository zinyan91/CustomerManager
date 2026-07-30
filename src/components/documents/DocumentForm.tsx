import React from 'react';
import { DateInput } from '../DateInput';
import type { ThemeStyles } from '../../lib/themeStyles';
import type { TemplateType } from './TemplateSelector';
import { Plus, Trash2 } from 'lucide-react';

export interface SaleItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

interface DocumentFormProps {
  styles: ThemeStyles;
  selectedTemplate: TemplateType;

  // Lease MB Form State
  mbContractDate: string; setMbContractDate: (v: string) => void;
  mbPartyAName: string; setMbPartyAName: (v: string) => void;
  mbPartyACccd: string; setMbPartyACccd: (v: string) => void;
  mbPartyACccdDate: string; setMbPartyACccdDate: (v: string) => void;
  mbPartyAAddress: string; setMbPartyAAddress: (v: string) => void;
  mbPartyBName: string; setMbPartyBName: (v: string) => void;
  mbPartyBCccd: string; setMbPartyBCccd: (v: string) => void;
  mbPartyBCccdDate: string; setMbPartyBCccdDate: (v: string) => void;
  mbPartyBAddress: string; setMbPartyBAddress: (v: string) => void;
  mbLocation: string; setMbLocation: (v: string) => void;
  mbStartDate: string; setMbStartDate: (v: string) => void;
  mbEndDate: string; setMbEndDate: (v: string) => void;
  mbMonthlyPrice: string; setMbMonthlyPrice: (v: string) => void;
  mbDepositAmount: string; setMbDepositAmount: (v: string) => void;

  // Construction Form State
  constContractDate: string; setConstContractDate: (v: string) => void;
  constPartyAName: string; setConstPartyAName: (v: string) => void;
  constPartyACccd: string; setConstPartyACccd: (v: string) => void;
  constPartyAAddress: string; setConstPartyAAddress: (v: string) => void;
  constPartyBName: string; setConstPartyBName: (v: string) => void;
  constPartyBCccd: string; setConstPartyBCccd: (v: string) => void;
  constSiteAddress: string; setConstSiteAddress: (v: string) => void;
  constStartDate: string; setConstStartDate: (v: string) => void;
  constEndDate: string; setConstEndDate: (v: string) => void;
  constTotalPrice: string; setConstTotalPrice: (v: string) => void;
  constDepositStage1: string; setConstDepositStage1: (v: string) => void;
  constStage2Amount: string; setConstStage2Amount: (v: string) => void;

  // Sale Contract Form State
  saleContractDate: string; setSaleContractDate: (v: string) => void;
  saleBuyerName: string; setSaleBuyerName: (v: string) => void;
  saleBuyerAddress: string; setSaleBuyerAddress: (v: string) => void;
  saleSellerName: string; setSaleSellerName: (v: string) => void;
  saleSellerCccd: string; setSaleSellerCccd: (v: string) => void;
  saleSellerCccdDate: string; setSaleSellerCccdDate: (v: string) => void;
  saleStartDate: string; setSaleStartDate: (v: string) => void;
  saleEndDate: string; setSaleEndDate: (v: string) => void;
  salePaymentStage1: string; setSalePaymentStage1: (v: string) => void;
  saleItems: SaleItem[]; setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  handleAddSaleItem: () => void;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  styles,
  selectedTemplate,

  mbContractDate, setMbContractDate,
  mbPartyAName, setMbPartyAName,
  mbPartyACccd, setMbPartyACccd,
  mbPartyACccdDate, setMbPartyACccdDate,
  mbPartyAAddress, setMbPartyAAddress,
  mbPartyBName, setMbPartyBName,
  mbPartyBCccd, setMbPartyBCccd,
  mbPartyBCccdDate, setMbPartyBCccdDate,
  mbPartyBAddress, setMbPartyBAddress,
  mbLocation, setMbLocation,
  mbStartDate, setMbStartDate,
  mbEndDate, setMbEndDate,
  mbMonthlyPrice, setMbMonthlyPrice,
  mbDepositAmount, setMbDepositAmount,

  constContractDate, setConstContractDate,
  constPartyAName, setConstPartyAName,
  constPartyACccd, setConstPartyACccd,
  constPartyAAddress, setConstPartyAAddress,
  constPartyBName, setConstPartyBName,
  constPartyBCccd, setConstPartyBCccd,
  constSiteAddress, setConstSiteAddress,
  constStartDate, setConstStartDate,
  constEndDate, setConstEndDate,
  constTotalPrice, setConstTotalPrice,
  constDepositStage1, setConstDepositStage1,
  constStage2Amount, setConstStage2Amount,

  saleContractDate, setSaleContractDate,
  saleBuyerName, setSaleBuyerName,
  saleBuyerAddress, setSaleBuyerAddress,
  saleSellerName, setSaleSellerName,
  saleSellerCccd, setSaleSellerCccd,
  saleSellerCccdDate, setSaleSellerCccdDate,
  saleStartDate, setSaleStartDate,
  saleEndDate, setSaleEndDate,
  salePaymentStage1, setSalePaymentStage1,
  saleItems, setSaleItems,
  handleAddSaleItem,
}) => {
  if (selectedTemplate === 'lease_mb' || selectedTemplate === 'lease_house') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-4 border space-y-3 text-xs`}>
        <div className="font-bold text-sky-500 uppercase tracking-wider">THÔNG TIN HỢP ĐỒNG THUÊ MẶT BẰNG / NHÀ Ở</div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký hợp đồng</label>
            <DateInput value={mbContractDate} onChange={setMbContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Bên A (Cho thuê)</label>
            <input type="text" value={mbPartyAName} onChange={e => setMbPartyAName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên A</label>
            <input type="text" value={mbPartyACccd} onChange={e => setMbPartyACccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD Bên A</label>
            <input type="text" value={mbPartyACccdDate} onChange={e => setMbPartyACccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên A</label>
            <input type="text" value={mbPartyAAddress} onChange={e => setMbPartyAAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên B</label>
            <input type="text" value={mbPartyBAddress} onChange={e => setMbPartyBAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Bên B (Bên thuê)</label>
            <input type="text" value={mbPartyBName} onChange={e => setMbPartyBName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên B</label>
            <input type="text" value={mbPartyBCccd} onChange={e => setMbPartyBCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD Bên B</label>
            <input type="text" value={mbPartyBCccdDate} onChange={e => setMbPartyBCccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
        </div>

        <div>
          <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ mặt bằng cho thuê</label>
          <input type="text" value={mbLocation} onChange={e => setMbLocation(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày bắt đầu thuê</label>
            <DateInput value={mbStartDate} onChange={setMbStartDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày kết thúc thuê</label>
            <DateInput value={mbEndDate} onChange={setMbEndDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Giá thuê tháng (VNĐ)</label>
            <input type="text" value={mbMonthlyPrice} onChange={e => setMbMonthlyPrice(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Tiền đặt cọc (VNĐ)</label>
            <input type="text" value={mbDepositAmount} onChange={e => setMbDepositAmount(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
          </div>
        </div>
      </div>
    );
  }

  if (selectedTemplate === 'construction') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-4 border space-y-3 text-xs`}>
        <div className="font-bold text-sky-500 uppercase tracking-wider">THÔNG TIN HỢP ĐỒNG THI CÔNG NHÀ Ở</div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký hợp đồng</label>
            <DateInput value={constContractDate} onChange={setConstContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Chủ đầu tư (Bên A)</label>
            <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên A</label>
            <input type="text" value={constPartyACccd} onChange={e => setConstPartyACccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Nhà thầu thi công (Bên B)</label>
            <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên B</label>
            <input type="text" value={constPartyBCccd} onChange={e => setConstPartyBCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên A</label>
            <input type="text" value={constPartyAAddress} onChange={e => setConstPartyAAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa điểm công trình</label>
            <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày khởi công</label>
            <DateInput value={constStartDate} onChange={setConstStartDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày bàn giao</label>
            <DateInput value={constEndDate} onChange={setConstEndDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Tổng giá trị HĐ (VNĐ)</label>
            <input type="text" value={constTotalPrice} onChange={e => setConstTotalPrice(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Đặt cọc Đợt 1 (VNĐ)</label>
            <input type="text" value={constDepositStage1} onChange={e => setConstDepositStage1(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Thanh toán Đợt 2 (VNĐ)</label>
            <input type="text" value={constStage2Amount} onChange={e => setConstStage2Amount(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-purple-600 dark:text-purple-400 ${styles.inputStyle}`} />
          </div>
        </div>
      </div>
    );
  }

  if (selectedTemplate === 'sale_contract') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-4 border space-y-4 text-xs`}>
        <div className="font-bold text-sky-500 uppercase tracking-wider">THÔNG TIN HỢP ĐỒNG MUA BÁN HÀNG HÓA & DANH MỤC SẢN PHẨM</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký hợp đồng</label>
            <DateInput value={saleContractDate} onChange={setSaleContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Bên mua (Bên A)</label>
            <input type="text" value={saleBuyerName} onChange={e => setSaleBuyerName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Bên bán (Bên B)</label>
            <input type="text" value={saleSellerName} onChange={e => setSaleSellerName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên B</label>
            <input type="text" value={saleSellerCccd} onChange={e => setSaleSellerCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD Bên B</label>
            <input type="text" value={saleSellerCccdDate} onChange={e => setSaleSellerCccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên A</label>
            <input type="text" value={saleBuyerAddress} onChange={e => setSaleBuyerAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
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
            <input type="text" value={salePaymentStage1} onChange={e => setSalePaymentStage1(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-900 font-bold flex items-center justify-between">
            <span>DANH MỤC MẶT HÀNG MUA BÁN ({saleItems.length} SẢN PHẨM)</span>
            <button type="button" onClick={handleAddSaleItem} className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-lg text-xs">
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
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                    <td className="p-2 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                      {(item.quantity * item.price).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setSaleItems(saleItems.filter(i => i.id !== item.id))} className="text-rose-500 hover:text-rose-700">
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
  }

  return null;
};
