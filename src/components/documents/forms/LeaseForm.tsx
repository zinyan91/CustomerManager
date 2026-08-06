import React from 'react';
import { DateInput } from '../../DateInput';
import type { UiClasses } from '../../../lib/uiClasses';
import type { TemplateType } from '../TemplateSelector';

export interface LeaseFormProps {
  styles: UiClasses;
  selectedTemplate: TemplateType;
  mbContractDate: string;
  setMbContractDate: (v: string) => void;
  mbPartyAName: string;
  setMbPartyAName: (v: string) => void;
  mbPartyACccd: string;
  setMbPartyACccd: (v: string) => void;
  mbPartyACccdDate: string;
  setMbPartyACccdDate: (v: string) => void;
  mbPartyAAddress: string;
  setMbPartyAAddress: (v: string) => void;
  mbPartyBName: string;
  setMbPartyBName: (v: string) => void;
  mbPartyBCccd: string;
  setMbPartyBCccd: (v: string) => void;
  mbPartyBCccdDate: string;
  setMbPartyBCccdDate: (v: string) => void;
  mbPartyBAddress: string;
  setMbPartyBAddress: (v: string) => void;
  mbLocation: string;
  setMbLocation: (v: string) => void;
  mbStartDate: string;
  setMbStartDate: (v: string) => void;
  mbEndDate: string;
  setMbEndDate: (v: string) => void;
  mbMonthlyPrice: string;
  setMbMonthlyPrice: (v: string) => void;
  mbDepositAmount: string;
  setMbDepositAmount: (v: string) => void;
  lhFloors: string;
  setLhFloors: (v: string) => void;
  lhLandArea: string;
  setLhLandArea: (v: string) => void;
  lhHouseArea: string;
  setLhHouseArea: (v: string) => void;
  lhHandoverDate: string;
  setLhHandoverDate: (v: string) => void;
  lhPaymentDay: string;
  setLhPaymentDay: (v: string) => void;
}

export const LeaseForm: React.FC<LeaseFormProps> = ({
  styles,
  selectedTemplate,
  mbContractDate,
  setMbContractDate,
  mbPartyAName,
  setMbPartyAName,
  mbPartyACccd,
  setMbPartyACccd,
  mbPartyACccdDate,
  setMbPartyACccdDate,
  mbPartyAAddress,
  setMbPartyAAddress,
  mbPartyBName,
  setMbPartyBName,
  mbPartyBCccd,
  setMbPartyBCccd,
  mbPartyBCccdDate,
  setMbPartyBCccdDate,
  mbPartyBAddress,
  setMbPartyBAddress,
  mbLocation,
  setMbLocation,
  mbStartDate,
  setMbStartDate,
  mbEndDate,
  setMbEndDate,
  mbMonthlyPrice,
  setMbMonthlyPrice,
  mbDepositAmount,
  setMbDepositAmount,
  lhFloors,
  setLhFloors,
  lhLandArea,
  setLhLandArea,
  lhHouseArea,
  setLhHouseArea,
  lhHandoverDate,
  setLhHandoverDate,
  lhPaymentDay,
  setLhPaymentDay,
}) => {
    return (
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4 text-xs shadow-sm`}>
        <div className="flex items-center justify-between border-b pb-2 border-line">
          <div className="font-bold text-accent uppercase tracking-wider text-sm">
            THÔNG TIN HỢP ĐỒNG THUÊ MẶT BẰNG / NHÀ Ở
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-accent text-xs uppercase border-b pb-1 border-line">BÊN A (CHO THUÊ)</div>
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

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-pos text-xs uppercase border-b pb-1 border-line">BÊN B (BÊN THUÊ)</div>
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

        <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-warn text-xs uppercase border-b pb-1 border-line">THÔNG TIN MẶT BẰNG & GIÁ THUÊ</div>
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
              <input type="text" value={mbMonthlyPrice} onChange={e => setMbMonthlyPrice(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-accent ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Tiền đặt cọc (VNĐ)</label>
              <input type="text" value={mbDepositAmount} onChange={e => setMbDepositAmount(e.target.value)} className={`w-full rounded-xl p-2 font-mono font-bold text-pos ${styles.inputStyle}`} />
            </div>
          </div>
        </div>

        {selectedTemplate === 'lease_house' && (
          <div className="p-3.5 rounded-xl border border-line  bg-panel-muted  space-y-2.5">
            <div className="font-bold text-accent text-xs uppercase border-b pb-1 border-line">
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
};
