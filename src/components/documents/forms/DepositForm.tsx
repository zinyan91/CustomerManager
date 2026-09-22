import React from 'react';
import { DateInput } from '../../DateInput';
import type { DepositContractData } from '../../../types/documents';
import type { UiClasses } from '../../../lib/uiClasses';

export interface DepositFormProps {
  styles: UiClasses;
  deposit: DepositContractData;
  setDeposit: React.Dispatch<React.SetStateAction<DepositContractData>>;
}

export const DepositForm: React.FC<DepositFormProps> = ({
  styles,
  deposit,
  setDeposit,
}) => {
  const set = (k: keyof DepositContractData) => (v: string) =>
    setDeposit(prev => ({ ...prev, [k]: v }));

  const Text = ({ label, field, mono }: { label: string; field: keyof DepositContractData; mono?: boolean }) => (
    <div>
      <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>{label}</label>
      <input
        type="text"
        value={deposit[field]}
        onChange={e => set(field)(e.target.value)}
        className={`w-full rounded-xl p-2.5 ${mono ? 'font-mono font-bold text-accent' : ''} ${styles.inputStyle}`}
      />
    </div>
  );

  const partyBlock = (who: 'buyer' | 'seller', title: string, colorClass: string) => (
    <div className="space-y-2.5 pb-4 border-b border-line/40">
      <div className={`font-bold ${colorClass} text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorClass === 'text-accent' ? 'bg-accent' : 'bg-pos'}`}></span>
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Xưng hô</label>
          <select
            value={deposit[`${who}Title` as keyof DepositContractData]}
            onChange={e => set(`${who}Title` as keyof DepositContractData)(e.target.value)}
            className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
          >
            <option value="Ông">Ông</option>
            <option value="Bà">Bà</option>
          </select>
        </div>
        <Text label="Họ và tên" field={`${who}Name` as keyof DepositContractData} />
        <Text label="Năm sinh" field={`${who}BirthYear` as keyof DepositContractData} mono />
        <Text label="Số CCCD" field={`${who}Cccd` as keyof DepositContractData} mono />
        <Text label="Ngày cấp" field={`${who}CccdDate` as keyof DepositContractData} mono />
        <Text label="Nơi cấp" field={`${who}CccdPlace` as keyof DepositContractData} />
      </div>
      <Text label="Hộ khẩu thường trú" field={`${who}Address` as keyof DepositContractData} />
    </div>
  );

  return (
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b pb-2 border-line/60">
        <div className="font-bold text-accent uppercase tracking-wider text-xs">
          THÔNG TIN HỢP ĐỒNG ĐẶT CỌC (CHUYỂN NHƯỢNG QSDĐ)
        </div>
      </div>

      {partyBlock('buyer', 'BÊN MUA (BÊN A)', 'text-accent')}
      {partyBlock('seller', 'BÊN BÁN (BÊN B)', 'text-pos')}

      <div className="space-y-2.5 pb-4 border-b border-line/40">
        <div className="font-bold text-warn text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warn"></span>
          <span>THÔNG TIN THỬA ĐẤT</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Text label="Thửa đất số" field="parcelNo" mono />
          <Text label="Tờ bản đồ số" field="mapSheetNo" mono />
          <Text label="Diện tích (m²)" field="area" mono />
          <Text label="Đất ở tại đô thị (m²)" field="urbanResidentialArea" mono />
          <Text label="Đất trồng cây lâu năm (m²)" field="perennialCropArea" mono />
          <Text label="Ngày cấp GCN" field="certificateDate" mono />
        </div>
        <Text label="Diện tích bằng chữ" field="areaInWords" />
        <Text label="Địa chỉ thửa đất" field="parcelAddress" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Text label="Số giấy CNQSDĐ" field="certificateNo" mono />
          <Text label="Số vào sổ cấp GCN" field="certificateBookNo" mono />
        </div>
        <Text label="Cơ quan cấp GCN" field="certificateIssuer" />
      </div>

      <div className="space-y-2.5 pb-4 border-b border-line/40">
        <div className="font-bold text-accent text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span>GIÁ CẢ & THANH TOÁN</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Text label="Giá chuyển nhượng (VNĐ)" field="transferPrice" mono />
          <Text label="Đặt cọc lần 1 (VNĐ)" field="deposit1" mono />
          <Text label="Thanh toán lần 2 (VNĐ)" field="payment2" mono />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Thuế TNCN do bên</label>
            <select value={deposit.incomeTaxBy} onChange={e => set('incomeTaxBy')(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}>
              <option value="A">Bên A (bên mua)</option>
              <option value="B">Bên B (bên bán)</option>
            </select>
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Thuế trước bạ do bên</label>
            <select value={deposit.registrationTaxBy} onChange={e => set('registrationTaxBy')(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}>
              <option value="A">Bên A (bên mua)</option>
              <option value="B">Bên B (bên bán)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pb-2">
        <div className="font-bold text-ink-faint text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint"></span>
          <span>KÝ KẾT</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Text label="Địa điểm ký" field="signPlace" />
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày ký</label>
            <DateInput value={deposit.signDate} onChange={set('signDate')} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
