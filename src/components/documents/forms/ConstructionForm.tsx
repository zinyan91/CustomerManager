import React from 'react';
import { DateInput } from '../../DateInput';
import type { UiClasses } from '../../../lib/uiClasses';

export interface ConstructionFormProps {
  styles: UiClasses;
  constContractDate: string;
  setConstContractDate: (v: string) => void;
  constPartyAName: string;
  setConstPartyAName: (v: string) => void;
  constPartyACccd: string;
  setConstPartyACccd: (v: string) => void;
  constPartyAAddress: string;
  setConstPartyAAddress: (v: string) => void;
  constPartyBName: string;
  setConstPartyBName: (v: string) => void;
  constPartyBCccd: string;
  setConstPartyBCccd: (v: string) => void;
  constSiteAddress: string;
  setConstSiteAddress: (v: string) => void;
  constStartDate: string;
  setConstStartDate: (v: string) => void;
  constEndDate: string;
  setConstEndDate: (v: string) => void;
  constTotalPrice: string;
  setConstTotalPrice: (v: string) => void;
  constDepositStage1: string;
  setConstDepositStage1: (v: string) => void;
  constStage2Amount: string;
  setConstStage2Amount: (v: string) => void;
  constWarrantyMonths: string;
  setConstWarrantyMonths: (v: string) => void;
}

export const ConstructionForm: React.FC<ConstructionFormProps> = ({
  styles,
  constContractDate,
  setConstContractDate,
  constPartyAName,
  setConstPartyAName,
  constPartyACccd,
  setConstPartyACccd,
  constPartyAAddress,
  setConstPartyAAddress,
  constPartyBName,
  setConstPartyBName,
  constPartyBCccd,
  setConstPartyBCccd,
  constSiteAddress,
  setConstSiteAddress,
  constStartDate,
  setConstStartDate,
  constEndDate,
  setConstEndDate,
  constTotalPrice,
  setConstTotalPrice,
  constDepositStage1,
  setConstDepositStage1,
  constStage2Amount,
  setConstStage2Amount,
  constWarrantyMonths,
  setConstWarrantyMonths,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 text-xs font-app animate-in fade-in duration-150`}>
      <div className="flex items-center justify-between border-b pb-2.5 border-line/60">
        <div className="font-bold text-accent uppercase tracking-wider text-xs">
          THÔNG TIN HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-accent text-xs uppercase border-b pb-1.5 border-line/60">BÊN A (CHỦ ĐẦU TƯ)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên Chủ Đầu Tư</label>
            <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Số CCCD Bên A</label>
            <input type="text" value={constPartyACccd} onChange={e => setConstPartyACccd(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
          </div>
        </div>
        <div>
          <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Địa chỉ Bên A</label>
          <input type="text" value={constPartyAAddress} onChange={e => setConstPartyAAddress(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-pos text-xs uppercase border-b pb-1.5 border-line/60">BÊN B (NHÀ THẦU THI CÔNG)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên Đại Diện Bên B</label>
            <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Số STK / CCCD Bên B</label>
            <input type="text" value={constPartyBCccd} onChange={e => setConstPartyBCccd(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
          </div>
        </div>
        <div>
          <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Địa điểm công trình thi công</label>
          <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-warn text-xs uppercase border-b pb-1.5 border-line/60">THỜI GIAN THI CÔNG & TIẾN ĐỘ THANH TOÁN</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày ký HĐ</label>
            <DateInput value={constContractDate} onChange={setConstContractDate} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày khởi công</label>
            <DateInput value={constStartDate} onChange={setConstStartDate} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày hoàn thành</label>
            <DateInput value={constEndDate} onChange={setConstEndDate} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Tổng giá trị (VNĐ)</label>
            <input type="text" value={constTotalPrice} onChange={e => setConstTotalPrice(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Đặt cọc Đợt 1 (VNĐ)</label>
            <input type="text" value={constDepositStage1} onChange={e => setConstDepositStage1(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-pos ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Thanh toán Đợt 2 (VNĐ)</label>
            <input type="text" value={constStage2Amount} onChange={e => setConstStage2Amount(e.target.value)} className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Thời gian bảo hành</label>
            <input type="text" value={constWarrantyMonths} onChange={e => setConstWarrantyMonths(e.target.value)} placeholder="06 tháng" className={`w-full rounded-xl p-2.5 font-mono ${styles.inputStyle}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
