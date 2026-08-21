import React from 'react';
import { Building2, Plus, Save, ChevronUp, ChevronDown } from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import type { UiClasses } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { fmtMoney, parseMoneyInput } from '../../lib/utils';
import { defaultLtvForAssetType, maxLoanFromCollateral } from '../../lib/collateralMath';

interface CollateralFormProps {
  styles: UiClasses;
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
  const numericAppraisedValue = parseMoneyInput(inputAppraisedValue);
  const parsedLtv = parseFloat(inputLtvPercent);
  const ltvVal = Number.isNaN(parsedLtv) ? defaultLtvForAssetType(inputAssetType) : parsedLtv;
  const maxLoanCapacity = maxLoanFromCollateral({
    AppraisedValue: numericAppraisedValue,
    LtvPercent: ltvVal,
    AssetType: inputAssetType,
  });

  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-5 sm:p-6 space-y-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150`}>
      <div className="flex items-center justify-between pb-3 border-b border-line/60">
        <h3 className="font-bold flex items-center space-x-2 text-xs tracking-tight text-accent">
          <div className="p-1 rounded-md bg-accent-soft text-accent">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span className="uppercase tracking-wider text-[11px]">{selectedCollateral ? `CẬP NHẬT TÀI SẢN BẢO ĐẢM #${selectedCollateral.Id}` : 'TẠO MỚI TÀI SẢN BẢO ĐẢM'}</span>
        </h3>
        <div className="flex items-center space-x-2">
          {selectedCollateral && (
            <button type="button" onClick={handleReset}
              className="text-xs text-accent hover:underline font-semibold mr-2 cursor-pointer">
              + Tạo TSBĐ mới
            </button>
          )}
          <button type="button" onClick={() => setFormCollapsed(f => !f)}
            className="p-1.5 rounded-lg border border-line/60 text-ink-faint hover:text-ink hover:bg-surface transition-colors cursor-pointer">
            {formCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!formCollapsed && (
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Khách hàng sở hữu / CIF *</label>
              <select required value={inputCustomerId}
                onChange={e => setInputCustomerId(e.target.value ? Number(e.target.value) : '')}
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}>
                <option value="">-- Chọn Khách hàng --</option>
                {customers.map(c => (
                  <option key={c.Id} value={c.Id}>{c.FullName} ({c.CifKh})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Mã TSBĐ / Số Giấy Chứng Nhận</label>
              <input type="text" value={inputAssetCode} onChange={e => setInputAssetCode(e.target.value)}
                placeholder="GCN-2026-001..."
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Phân loại Tài sản bảo đảm *</label>
              <select required value={inputAssetType}
                onChange={e => {
                  const newType = e.target.value;
                  setInputAssetType(newType);
                  setInputLtvPercent(String(defaultLtvForAssetType(newType)));
                }}
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}>
                <option value="Bất động sản đất ở">Bất động sản đất ở (LTV chuẩn 75%)</option>
                <option value="Bất động sản khác">Bất động sản khác (LTV chuẩn 70%)</option>
                <option value="Phương tiện vận tải">Phương tiện vận tải (LTV chuẩn 60%)</option>
                <option value="Tiền gửi / STK">Tiền gửi / Sổ tiết kiệm (LTV chuẩn 95%)</option>
                <option value="Máy móc thiết bị">Máy móc thiết bị (LTV chuẩn 50%)</option>
                <option value="Khác">Tài sản khác (LTV chuẩn 40%)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Địa chỉ / Vị trí / Mô tả tài sản</label>
              <input type="text" value={inputAddress} onChange={e => setInputAddress(e.target.value)}
                placeholder="123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM..."
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Giá trị định giá (VNĐ) *</label>
              <input type="text" required value={inputAppraisedValue}
                onChange={e => setInputAppraisedValue(e.target.value)}
                placeholder="3.000.000.000..."
                className={`w-full rounded-xl p-2.5 font-mono font-bold border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Tỷ lệ LTV áp dụng (%) *</label>
              <input type="number" step="0.1" min="1" max="100" required value={inputLtvPercent}
                onChange={e => setInputLtvPercent(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-mono font-bold border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Ngày định giá gần nhất</label>
              <DateInput value={inputAppraisalDate} onChange={val => setInputAppraisalDate(val)}
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`}>Thời hạn định giá (Tháng)</label>
              <input type="number" min={1} max={120} value={inputAppraisalTenorMonths}
                onChange={e => setInputAppraisalTenorMonths(Number(e.target.value) || 12)}
                className={`w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`} />
            </div>
          </div>

          <div className={`p-4 rounded-xl border border-line/60 flex flex-wrap items-center justify-between gap-3 bg-surface/75 backdrop-blur-md shadow-2xs`}>
            <div>
              <div className="text-[11px] text-ink-faint">Hạn mức cho cấp tín dụng tối đa tính theo LTV ({ltvVal}%):</div>
              <div className="text-sm font-mono font-extrabold text-accent mt-0.5">
                {fmtMoney(maxLoanCapacity)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-faint">Ngày hết hạn định giá (Tự động):</div>
              <div className="text-sm font-mono font-bold text-warn mt-0.5">
                {inputAppraisalExpiryDate || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs">
              {selectedCollateral ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Đang lưu...' : selectedCollateral ? 'CẬP NHẬT TÀI SẢN' : '+ LƯU TÀI SẢN BẢO ĐẢM MỚI'}</span>
            </button>
            {selectedCollateral && (
              <button type="button" onClick={handleReset}
                className="bg-surface/80 hover:bg-surface border border-line/70 text-ink-muted hover:text-ink font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-2xs">
                Hủy
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
