import React from 'react';
import { Building2, Plus, Save, ChevronUp, ChevronDown } from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import type { ThemeStyles } from '../../lib/themeStyles';
import { DateInput } from '../DateInput';
import { fmtMoney } from '../../lib/utils';

interface CollateralFormProps {
  styles: ThemeStyles;
  isLight: boolean;
  selectedCollateral: Collateral | null;
  formCollapsed: boolean;
  setFormCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  customers: Customer[];
  inputCustomerId: number | '';
  setInputCustomerId: (val: number | '') => void;
  inputAssetCode: string;
  setInputAssetCode: (val: string) => void;
  inputAssetType: string;
  setInputAssetType: (val: string) => void;
  inputAddress: string;
  setInputAddress: (val: string) => void;
  inputAppraisedValue: string;
  setInputAppraisedValue: (val: string) => void;
  inputLtvPercent: string;
  setInputLtvPercent: (val: string) => void;
  inputAppraisalDate: string;
  setInputAppraisalDate: (val: string) => void;
  inputAppraisalTenorMonths: number;
  setInputAppraisalTenorMonths: (val: number) => void;
  inputAppraisalExpiryDate: string;
  handleSave: (e: React.FormEvent) => void;
  handleReset: () => void;
  loading: boolean;
}

export const CollateralForm: React.FC<CollateralFormProps> = ({
  styles,
  isLight,
  selectedCollateral,
  formCollapsed,
  setFormCollapsed,
  customers,
  inputCustomerId,
  setInputCustomerId,
  inputAssetCode,
  setInputAssetCode,
  inputAssetType,
  setInputAssetType,
  inputAddress,
  setInputAddress,
  inputAppraisedValue,
  setInputAppraisedValue,
  inputLtvPercent,
  setInputLtvPercent,
  inputAppraisalDate,
  setInputAppraisalDate,
  inputAppraisalTenorMonths,
  setInputAppraisalTenorMonths,
  inputAppraisalExpiryDate,
  handleSave,
  handleReset,
  loading,
}) => {
  const numericAppraisedValue = parseFloat(inputAppraisedValue.replace(/\D/g, '')) || 0;
  const ltvVal = parseFloat(inputLtvPercent) || 80;
  const maxLoanCapacity = numericAppraisedValue * ltvVal / 100;

  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-5 space-y-4 border shadow-xl`}>
      <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <h3 className="font-bold flex items-center space-x-2 text-xs uppercase tracking-wider text-sky-500">
          <Building2 className="w-4 h-4" />
          <span>{selectedCollateral ? `CẬP NHẬT TÀI SẢN BẢO ĐẢM #${selectedCollateral.Id}` : 'TẠO MỚI TÀI SẢN BẢO ĐẢM'}</span>
        </h3>
        <div className="flex items-center space-x-2">
          {selectedCollateral && (
            <button type="button" onClick={handleReset}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold mr-2">
              + Tạo TSBĐ mới
            </button>
          )}
          <button type="button" onClick={() => setFormCollapsed(f => !f)}
            className="text-slate-400 hover:text-slate-200 transition-colors">
            {formCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!formCollapsed && (
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Khách hàng sở hữu / CIF *</label>
              <select required value={inputCustomerId}
                onChange={e => setInputCustomerId(e.target.value ? Number(e.target.value) : '')}
                className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}>
                <option value="">-- Chọn Khách hàng --</option>
                {customers.map(c => (
                  <option key={c.Id} value={c.Id}>{c.FullName} ({c.CifKh})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Mã TSBĐ / Số Giấy Chứng Nhận</label>
              <input type="text" value={inputAssetCode} onChange={e => setInputAssetCode(e.target.value)}
                placeholder="GCN-2026-001..."
                className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Phân loại Tài sản bảo đảm *</label>
              <select required value={inputAssetType} onChange={e => setInputAssetType(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}>
                <optgroup label="🏠 BẤT ĐỘNG SẢN & TÀI SẢN BẢO ĐẢM">
                  <option value="Loại 1">Loại 1 (LTV 80%)</option>
                  <option value="Loại 2">Loại 2 (LTV 70%)</option>
                  <option value="Loại 3">Loại 3 (LTV 60%)</option>
                  <option value="Loại 4">Loại 4 (LTV 55%)</option>
                  <option value="Hạn chế nhận TS">Hạn chế nhận TS (LTV 0%)</option>
                  <option value="Tùy chỉnh LTV">Tùy chỉnh LTV</option>
                </optgroup>
                <optgroup label="🚗 PHƯƠNG TIỆN VẬN TẢI & HÀNG HÓA">
                  <option value="Phương tiện vận tải (Ô tô, Xe nâng...)">Phương tiện vận tải (LTV 70%)</option>
                  <option value="Máy móc thiết bị, Dây chuyền sản xuất">Máy móc thiết bị (LTV 60%)</option>
                  <option value="Hàng hóa, Vật tư kho">Hàng hóa, Vật tư kho (LTV 50%)</option>
                </optgroup>
                <optgroup label="📜 GIẤY TỜ CÓ GIÁ & SỔ TIẾT KIỆM">
                  <option value="Sổ tiết kiệm / Tiền gửi nội bộ">Sổ tiết kiệm nội bộ (LTV 100%)</option>
                  <option value="STK khác ngân hàng / Trái phiếu CP">STK khác / Trái phiếu CP (LTV 90%)</option>
                  <option value="Giấy tờ có giá khác">Giấy tờ có giá khác (LTV 80%)</option>
                </optgroup>
                <optgroup label="📦 TÀI SẢN KHÁC & QUYỀN TÀI SẢN">
                  <option value="Quyền tài sản / Quyền đòi nợ">Quyền tài sản / Quyền đòi nợ (LTV 50%)</option>
                  <option value="Tài sản khác (Tùy chỉnh LTV)">Tài sản khác (Tùy chỉnh LTV)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa chỉ / Mô tả chi tiết TSBĐ *</label>
            <input type="text" required value={inputAddress} onChange={e => setInputAddress(e.target.value)}
              placeholder="Thửa đất số..., Tờ bản đồ số..., Số nhà..."
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Giá trị định giá (VNĐ) *</label>
              <input type="text" required value={inputAppraisedValue}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setInputAppraisedValue(digits ? Number(digits).toLocaleString('vi-VN') : '');
                }}
                placeholder="1.000.000.000"
                className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Tỉ lệ LTV tối đa (%)</label>
              <input type="number" min={1} max={100} value={inputLtvPercent}
                onChange={e => setInputLtvPercent(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Ngày định giá</label>
              <DateInput value={inputAppraisalDate} onChange={val => setInputAppraisalDate(val)}
                className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Thời hạn định giá (Tháng)</label>
              <input type="number" min={1} max={120} value={inputAppraisalTenorMonths}
                onChange={e => setInputAppraisalTenorMonths(Number(e.target.value) || 12)}
                className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${styles.sectionBoxBg}`}>
            <div>
              <div className="text-[11px] text-slate-400">Hạn mức cho cấp tín dụng tối đa tính theo LTV ({ltvVal}%):</div>
              <div className="text-sm font-mono font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                {fmtMoney(maxLoanCapacity)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Ngày hết hạn định giá (Tự động):</div>
              <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {inputAppraisalExpiryDate || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2">
              {selectedCollateral ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Đang lưu...' : selectedCollateral ? 'CẬP NHẬT TÀI SẢN' : '+ LƯU TÀI SẢN BẢO ĐẢM MỚI'}</span>
            </button>
            {selectedCollateral && (
              <button type="button" onClick={handleReset}
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl transition-colors">
                Hủy
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
