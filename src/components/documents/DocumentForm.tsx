import React from 'react';
import { DateInput } from '../DateInput';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../lib/documentOptions';
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

export interface ConstItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
}

export interface PaymentStageItem {
  id: string;
  stageName: string;
  amount: string;
  status: 'paid' | 'current' | 'future';
  note?: string;
}

interface DocumentFormProps {
  styles: ThemeStyles;
  selectedTemplate: TemplateType;

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
  lhFloors: string; setLhFloors: (v: string) => void;
  lhLandArea: string; setLhLandArea: (v: string) => void;
  lhHouseArea: string; setLhHouseArea: (v: string) => void;
  lhHandoverDate: string; setLhHandoverDate: (v: string) => void;
  lhPaymentDay: string; setLhPaymentDay: (v: string) => void;

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
  constWarrantyMonths: string; setConstWarrantyMonths: (v: string) => void;
  constItems: ConstItem[]; setConstItems: React.Dispatch<React.SetStateAction<ConstItem[]>>;
  handleAddConstItem: () => void;

  saleContractDate: string; setSaleContractDate: (v: string) => void;
  saleBuyerName: string; setSaleBuyerName: (v: string) => void;
  saleBuyerAddress: string; setSaleBuyerAddress: (v: string) => void;
  saleSellerName: string; setSaleSellerName: (v: string) => void;
  saleSellerCccd: string; setSaleSellerCccd: (v: string) => void;
  saleSellerCccdDate: string; setSaleSellerCccdDate: (v: string) => void;
  saleSellerCccdPlace: string; setSaleSellerCccdPlace: (v: string) => void;
  salePayMethod: 'cash' | 'transfer'; setSalePayMethod: (v: 'cash' | 'transfer') => void;
  saleBankOwner: string; setSaleBankOwner: (v: string) => void;
  saleBankAccNo: string; setSaleBankAccNo: (v: string) => void;
  saleBankName: string; setSaleBankName: (v: string) => void;
  saleBankBranch: string; setSaleBankBranch: (v: string) => void;
  saleStartDate: string; setSaleStartDate: (v: string) => void;
  saleEndDate: string; setSaleEndDate: (v: string) => void;
  salePaymentStage1: string; setSalePaymentStage1: (v: string) => void;
  saleItems: SaleItem[]; setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  handleAddSaleItem: () => void;

  payMethodType?: 'cash' | 'transfer';
  setPayMethodType?: (v: 'cash' | 'transfer') => void;
  payCashName?: string; setPayCashName?: (v: string) => void;
  payCashCccd?: string; setPayCashCccd?: (v: string) => void;
  payCashCccdDate?: string; setPayCashCccdDate?: (v: string) => void;
  payCashCccdPlace?: string; setPayCashCccdPlace?: (v: string) => void;
  payBankOwner?: string; setPayBankOwner?: (v: string) => void;
  payBankAccNo?: string; setPayBankAccNo?: (v: string) => void;
  payBankName?: string; setPayBankName?: (v: string) => void;
  payBankBranch?: string; setPayBankBranch?: (v: string) => void;
  payStages?: PaymentStageItem[];
  setPayStages?: React.Dispatch<React.SetStateAction<PaymentStageItem[]>>;
  handleAddPayStage?: () => void;
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
  lhFloors, setLhFloors,
  lhLandArea, setLhLandArea,
  lhHouseArea, setLhHouseArea,
  lhHandoverDate, setLhHandoverDate,
  lhPaymentDay, setLhPaymentDay,

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
  constWarrantyMonths, setConstWarrantyMonths,
  constItems, setConstItems,
  handleAddConstItem,

  saleContractDate, setSaleContractDate,
  saleBuyerName, setSaleBuyerName,
  saleBuyerAddress, setSaleBuyerAddress,
  saleSellerName, setSaleSellerName,
  saleSellerCccd, setSaleSellerCccd,
  saleSellerCccdDate, setSaleSellerCccdDate,
  saleSellerCccdPlace, setSaleSellerCccdPlace,
  salePayMethod, setSalePayMethod,
  saleBankOwner, setSaleBankOwner,
  saleBankAccNo, setSaleBankAccNo,
  saleBankName, setSaleBankName,
  saleBankBranch, setSaleBankBranch,
  saleStartDate, setSaleStartDate,
  saleEndDate, setSaleEndDate,
  salePaymentStage1, setSalePaymentStage1,
  saleItems, setSaleItems,
  handleAddSaleItem,

  payMethodType = 'cash', setPayMethodType,
  payCashName = '', setPayCashName,
  payCashCccd = '', setPayCashCccd,
  payCashCccdDate = '', setPayCashCccdDate,
  payCashCccdPlace = '', setPayCashCccdPlace,
  payBankOwner = '', setPayBankOwner,
  payBankAccNo = '', setPayBankAccNo,
  payBankName = '', setPayBankName,
  payBankBranch = '', setPayBankBranch,
  payStages = [], setPayStages,
  handleAddPayStage,
}) => {
  if (selectedTemplate === 'lease_mb' || selectedTemplate === 'lease_house') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm">
            THÔNG TIN HỢP ĐỒNG THUÊ MẶT BẰNG / NHÀ Ở
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN A (CHO THUÊ)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ và tên Bên A</label>
              <input type="text" value={mbPartyAName} onChange={e => setMbPartyAName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD</label>
              <input type="text" value={mbPartyACccd} onChange={e => setMbPartyACccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD</label>
              <input type="text" value={mbPartyACccdDate} onChange={e => setMbPartyACccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ thường trú Bên A</label>
            <input type="text" value={mbPartyAAddress} onChange={e => setMbPartyAAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-emerald-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN B (BÊN THUÊ)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ và tên Bên B</label>
              <input type="text" value={mbPartyBName} onChange={e => setMbPartyBName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD</label>
              <input type="text" value={mbPartyBCccd} onChange={e => setMbPartyBCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD</label>
              <input type="text" value={mbPartyBCccdDate} onChange={e => setMbPartyBCccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ thường trú Bên B</label>
            <input type="text" value={mbPartyBAddress} onChange={e => setMbPartyBAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-amber-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">THÔNG TIN MẶT BẰNG & GIÁ THUÊ</div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ mặt bằng cho thuê</label>
            <input type="text" value={mbLocation} onChange={e => setMbLocation(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký HĐ</label>
              <DateInput value={mbContractDate} onChange={setMbContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Thời gian thuê (Từ - Đến)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <DateInput value={mbStartDate} onChange={setMbStartDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
                <DateInput value={mbEndDate} onChange={setMbEndDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
              </div>
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Giá thuê / tháng (VNĐ)</label>
              <input type="text" value={mbMonthlyPrice} onChange={e => setMbMonthlyPrice(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Tiền đặt cọc (VNĐ)</label>
              <input type="text" value={mbDepositAmount} onChange={e => setMbDepositAmount(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
            </div>
          </div>
        </div>

        {selectedTemplate === 'lease_house' && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="font-bold text-purple-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">
              THÔNG TIN NHÀ Ở &amp; THANH TOÁN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className={`block mb-1 ${styles.labelStyle}`}>Số tầng</label>
                <input type="text" value={lhFloors} onChange={e => setLhFloors(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${styles.labelStyle}`}>Diện tích đất (m²)</label>
                <input type="text" value={lhLandArea} onChange={e => setLhLandArea(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${styles.labelStyle}`}>Diện tích nhà (m²)</label>
                <input type="text" value={lhHouseArea} onChange={e => setLhHouseArea(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${styles.labelStyle}`}>Ngày bàn giao nhà</label>
                <DateInput value={lhHandoverDate} onChange={setLhHandoverDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
              </div>
              <div>
                <label className={`block mb-1 ${styles.labelStyle}`}>Ngày thu tiền hàng tháng</label>
                <input type="text" value={lhPaymentDay} onChange={e => setLhPaymentDay(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedTemplate === 'construction') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm">
            THÔNG TIN HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN A (CHỦ ĐẦU TƯ)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Chủ Đầu Tư</label>
              <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD Bên A</label>
              <input type="text" value={constPartyACccd} onChange={e => setConstPartyACccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ Bên A</label>
            <input type="text" value={constPartyAAddress} onChange={e => setConstPartyAAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-emerald-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN B (NHÀ THẦU THI CÔNG)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Đại Diện Bên B</label>
              <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Số STK / CCCD Bên B</label>
              <input type="text" value={constPartyBCccd} onChange={e => setConstPartyBCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa điểm công trình thi công</label>
            <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-amber-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">THỜI GIAN THI CÔNG & TIẾN ĐỘ THANH TOÁN</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký HĐ</label>
              <DateInput value={constContractDate} onChange={setConstContractDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày khởi công</label>
              <DateInput value={constStartDate} onChange={setConstStartDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày hoàn thành</label>
              <DateInput value={constEndDate} onChange={setConstEndDate} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Tổng giá trị (VNĐ)</label>
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
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Thời gian bảo hành (tháng)</label>
              <input type="text" value={constWarrantyMonths} onChange={e => setConstWarrantyMonths(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTemplate === 'const_estimate') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm">
            BẢNG DỰ TOÁN HẠNG MỤC CÔNG VIỆC THI CÔNG
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">THÔNG TIN CÔNG TRÌNH</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Chủ Đầu Tư (Bên A)</label>
              <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Nhà Thầu Thi Công (Bên B)</label>
              <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa điểm thi công</label>
            <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-900 font-bold flex items-center justify-between">
            <span>DANH MỤC HẠNG MỤC DỰ TOÁN ({constItems.length} HẠNG MỤC)</span>
            <button type="button" onClick={handleAddConstItem} className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm hạng mục</span>
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="p-2">STT</th>
                  <th className="p-2">HẠNG MỤC CÔNG VIỆC</th>
                  <th className="p-2 text-center">ĐVT</th>
                  <th className="p-2 text-center">KHỐI LƯỢNG</th>
                  <th className="p-2 text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="p-2 text-right">THÀNH TIỀN (VNĐ)</th>
                  <th className="p-2">GHI CHÚ</th>
                  <th className="p-2 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {constItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <input type="text" value={item.name} onChange={e => {
                        const next = [...constItems]; next[idx].name = e.target.value; setConstItems(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="text" value={item.unit} onChange={e => {
                        const next = [...constItems]; next[idx].unit = e.target.value; setConstItems(next);
                      }} className={`w-16 rounded-lg p-1 text-center ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="number" step="0.1" value={item.quantity} onChange={e => {
                        const next = [...constItems]; next[idx].quantity = Number(e.target.value) || 0; setConstItems(next);
                      }} className={`w-16 rounded-lg p-1 text-center font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-right">
                      <input type="number" min={0} value={item.price} onChange={e => {
                        const next = [...constItems]; next[idx].price = Number(e.target.value) || 0; setConstItems(next);
                      }} className={`w-24 rounded-lg p-1 text-right font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                      {(item.quantity * item.price).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-2">
                      <input type="text" value={item.note} onChange={e => {
                        const next = [...constItems]; next[idx].note = e.target.value; setConstItems(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setConstItems(constItems.filter(i => i.id !== item.id))} className="text-rose-500 hover:text-rose-700">
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

  if (selectedTemplate === 'sale_contract') {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm">
            THÔNG TIN HỢP ĐỒNG MUA BÁN HÀNG HÓA & DANH MỤC SẢN PHẨM
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN MUA (BÊN A)</div>
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

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-emerald-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">BÊN BÁN (BÊN B)</div>
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

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="font-bold text-amber-500 text-[11px] uppercase">HÌNH THỨC NHẬN THANH TOÁN CỦA BÊN BÁN</div>
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
                  <input type="text" value={saleBankAccNo} onChange={e => setSaleBankAccNo(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`} />
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

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-amber-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">THỜI GIAN & TIẾN ĐỘ THANH TOÁN</div>
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
              <input type="text" value={salePaymentStage1} onChange={e => setSalePaymentStage1(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
            </div>
          </div>
        </div>

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

  if (selectedTemplate === 'payment_request_sale' || selectedTemplate === 'payment_request_const') {
    const isSale = selectedTemplate === 'payment_request_sale';
    const recipientName = isSale ? saleBuyerName : constPartyAName;
    const setRecipientName = isSale ? setSaleBuyerName : setConstPartyAName;

    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-sm">
            THÔNG TIN GIẤY ĐỀ NGHỊ THANH TOÁN ({isSale ? 'HĐ MUA BÁN HÀNG HÓA' : 'HĐ THI CÔNG NHÀ Ở'})
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="font-bold text-sky-500 text-xs uppercase border-b pb-1 border-slate-200 dark:border-slate-800">NGƯỜI NHẬN ĐỀ NGHỊ & HỢP ĐỒNG CĂN CỨ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Kính gửi (Người nhận thanh toán)</label>
              <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày ký Hợp Đồng căn cứ</label>
              <DateInput
                value={isSale ? saleContractDate : constContractDate}
                onChange={isSale ? setSaleContractDate : setConstContractDate}
                className={`w-full rounded-xl p-2 ${styles.inputStyle}`}
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="font-bold text-amber-600 dark:text-amber-400 text-xs uppercase border-b pb-1 border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
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
                className="w-4 h-4 text-sky-600"
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
                className="w-4 h-4 text-sky-600"
              />
              <span>🏦 2. Thanh toán Chuyển Khoản</span>
            </label>
          </div>

          {payMethodType === 'cash' ? (
            <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
              <div className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                💡 Thông tin tiền mặt hiển thị trên biểu mẫu (mỗi thông tin 1 dòng): Họ tên, CCCD số, Ngày cấp, Nơi cấp.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên người nhận tiền mặt</label>
                  <input type="text" value={payCashName || ''} onChange={e => setPayCashName && setPayCashName(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Số CCCD</label>
                  <input type="text" value={payCashCccd || ''} onChange={e => setPayCashCccd && setPayCashCccd(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Ngày cấp CCCD</label>
                  <input type="text" value={payCashCccdDate || ''} onChange={e => setPayCashCccdDate && setPayCashCccdDate(e.target.value)} className={`w-full rounded-xl p-2 font-mono ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Nơi cấp CCCD</label>
                  <select value={payCashCccdPlace || ''} onChange={e => setPayCashCccdPlace && setPayCashCccdPlace(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`}>
                    {CCCD_ISSUE_PLACES.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
              <div className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                💡 Thông tin chuyển khoản hiển thị trên biểu mẫu (mỗi thông tin 1 dòng): Họ tên chủ tài khoản, Số tài khoản, Ngân hàng, Chi nhánh.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Họ tên Chủ tài khoản</label>
                  <input type="text" value={payBankOwner || ''} onChange={e => setPayBankOwner && setPayBankOwner(e.target.value)} className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Số tài khoản (STK)</label>
                  <input type="text" value={payBankAccNo || ''} onChange={e => setPayBankAccNo && setPayBankAccNo(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 ${styles.inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Ngân hàng</label>
                  <select value={payBankName || ''} onChange={e => setPayBankName && setPayBankName(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`}>
                    {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${styles.labelStyle}`}>Chi nhánh Ngân hàng</label>
                  <input type="text" value={payBankBranch || ''} onChange={e => setPayBankBranch && setPayBankBranch(e.target.value)} className={`w-full rounded-xl p-2 ${styles.inputStyle}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-900 font-bold flex items-center justify-between">
            <span>DANH SÁCH CÁC ĐỢT THANH TOÁN (THANH TOÁN NHIỀU ĐỢT)</span>
            <button type="button" onClick={handleAddPayStage} className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm đợt thanh toán</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="p-2">STT</th>
                  <th className="p-2">TÊN ĐỢT THANH TOÁN</th>
                  <th className="p-2">TRẠNG THÁI</th>
                  <th className="p-2 text-right">SỐ TIỀN (VNĐ)</th>
                  <th className="p-2">GHI CHÚ</th>
                  <th className="p-2 text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(payStages || []).map((stage, idx) => (
                  <tr key={stage.id}>
                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <input type="text" value={stage.stageName} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].stageName = e.target.value; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2">
                      <select value={stage.status} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].status = e.target.value as any; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 font-bold ${styles.inputStyle}`}>
                        <option value="paid">Đã thanh toán đợt này</option>
                        <option value="current">Đề nghị thanh toán đợt này</option>
                        <option value="future">Chờ thanh toán sau</option>
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <input type="text" value={stage.amount} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const digits = e.target.value.replace(/\D/g, '');
                        const next = [...payStages]; next[idx].amount = digits ? Number(digits).toLocaleString('vi-VN') : ''; setPayStages(next);
                      }} className={`w-28 rounded-lg p-1 text-right font-mono font-bold ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2">
                      <input type="text" value={stage.note || ''} onChange={e => {
                        if (!setPayStages || !payStages) return;
                        const next = [...payStages]; next[idx].note = e.target.value; setPayStages(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => {
                        if (!setPayStages || !payStages) return;
                        setPayStages(payStages.filter(s => s.id !== stage.id));
                      }} className="text-rose-500 hover:text-rose-700">
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
