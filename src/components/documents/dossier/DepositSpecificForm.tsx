import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { DepositSpecific } from '../registry/templates/deposit';
import { DateInput } from '../../DateInput';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const DepositSpecificForm: React.FC<{
  common: DossierCommon;
  specific: DepositSpecific;
  patch: (p: Partial<DepositSpecific>) => void;
}> = ({ specific, patch }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <div className="font-bold text-accent text-xs uppercase tracking-wider">
          Xưng hô các bên
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Xưng hô Bên A (Bên Mua)</label>
            <select className={INPUT} value={specific.buyerTitle} onChange={e => patch({ buyerTitle: e.target.value })}>
              <option value="Ông">Ông</option>
              <option value="Bà">Bà</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Xưng hô Bên B (Bên Bán)</label>
            <select className={INPUT} value={specific.sellerTitle} onChange={e => patch({ sellerTitle: e.target.value })}>
              <option value="Ông">Ông</option>
              <option value="Bà">Bà</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="font-bold text-accent text-xs uppercase tracking-wider">
          Thông tin thửa đất
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Thửa đất số</label>
            <input className={`${INPUT} font-mono font-bold text-accent`} value={specific.parcelNo}
              onChange={e => patch({ parcelNo: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Tờ bản đồ số</label>
            <input className={`${INPUT} font-mono font-bold text-accent`} value={specific.mapSheetNo}
              onChange={e => patch({ mapSheetNo: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Diện tích (m²)</label>
            <input className={`${INPUT} font-mono font-bold text-accent`} value={specific.area}
              onChange={e => patch({ area: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className={LABEL}>Diện tích bằng chữ</label>
            <input className={INPUT} value={specific.areaInWords}
              onChange={e => patch({ areaInWords: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className={LABEL}>Địa chỉ thửa đất</label>
            <input className={INPUT} value={specific.parcelAddress}
              onChange={e => patch({ parcelAddress: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Đất ở đô thị (m²)</label>
            <input className={`${INPUT} font-mono`} value={specific.urbanResidentialArea}
              onChange={e => patch({ urbanResidentialArea: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Đất trồng cây lâu năm (m²)</label>
            <input className={`${INPUT} font-mono`} value={specific.perennialCropArea}
              onChange={e => patch({ perennialCropArea: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Ngày cấp GCN</label>
            <input className={`${INPUT} font-mono`} value={specific.certificateDate} placeholder="VD: 05/12/2024"
              onChange={e => patch({ certificateDate: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Số giấy CNQSDĐ</label>
            <input className={`${INPUT} font-mono`} value={specific.certificateNo}
              onChange={e => patch({ certificateNo: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Số vào sổ cấp GCN</label>
            <input className={`${INPUT} font-mono`} value={specific.certificateBookNo}
              onChange={e => patch({ certificateBookNo: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Cơ quan cấp GCN</label>
            <input className={INPUT} value={specific.certificateIssuer}
              onChange={e => patch({ certificateIssuer: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="font-bold text-accent text-xs uppercase tracking-wider">
          Giá cả & Thanh toán
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Giá chuyển nhượng (VNĐ)</label>
            <input className={`${INPUT} font-mono font-bold text-accent text-right`} value={specific.transferPrice}
              onChange={e => patch({ transferPrice: formatMoneyInput(e.target.value) })} />
          </div>
          <div>
            <label className={LABEL}>Đặt cọc lần 1 (VNĐ)</label>
            <input className={`${INPUT} font-mono font-bold text-pos text-right`} value={specific.deposit1}
              onChange={e => patch({ deposit1: formatMoneyInput(e.target.value) })} />
          </div>
          <div>
            <label className={LABEL}>Thanh toán lần 2 (VNĐ)</label>
            <input className={`${INPUT} font-mono font-bold text-ink text-right`} value={specific.payment2}
              onChange={e => patch({ payment2: formatMoneyInput(e.target.value) })} />
          </div>
          <div>
            <label className={LABEL}>Thuế TNCN do bên</label>
            <select className={INPUT} value={specific.incomeTaxBy} onChange={e => patch({ incomeTaxBy: e.target.value })}>
              <option value="A">Bên A (Bên Mua)</option>
              <option value="B">Bên B (Bên Bán)</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Thuế trước bạ do bên</label>
            <select className={INPUT} value={specific.registrationTaxBy} onChange={e => patch({ registrationTaxBy: e.target.value })}>
              <option value="A">Bên A (Bên Mua)</option>
              <option value="B">Bên B (Bên Bán)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="font-bold text-ink-muted text-xs uppercase tracking-wider">
          Ký kết
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Địa điểm ký</label>
            <input className={INPUT} value={specific.signPlace} onChange={e => patch({ signPlace: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Ngày ký</label>
            <DateInput value={specific.signDate} onChange={iso => patch({ signDate: iso })} className={INPUT} />
          </div>
        </div>
      </div>
    </div>
  );
};
