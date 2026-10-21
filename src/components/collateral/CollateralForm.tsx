import React from 'react';
import {
  Building2, Plus, Save, ChevronUp, ChevronDown, Calculator,
  Calendar, UserCheck, ShieldCheck, RefreshCw,
} from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { fmtMoney, parseMoneyInput } from '../../lib/utils';
import { defaultLtvForAssetType, maxLoanFromCollateral, COLLATERAL_ASSET_TYPES } from '../../lib/collateralMath';

interface CollateralFormProps {
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
    <div
      id="collateral-form-panel"
      data-workspace-panel
      className="p-4 space-y-4 border-b border-line bg-panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
        <h3 className="font-bold flex items-center space-x-2 text-xs tracking-tight text-ink">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-[11px]">
            {selectedCollateral
              ? `CẬP NHẬT TÀI SẢN BẢO ĐẢM #${selectedCollateral.Id}`
              : 'TẠO MỚI TÀI SẢN BẢO ĐẢM'}
          </span>
        </h3>
        <div className="flex items-center space-x-2">
          {selectedCollateral && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-accent hover:underline font-bold mr-2 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>+ Tạo TSBĐ mới</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFormCollapsed(f => !f)}
            className="p-1.5 rounded-[var(--r-control)] border border-line/60 bg-surface text-ink-faint hover:text-ink transition-colors cursor-pointer shadow-2xs"
            aria-label={formCollapsed ? 'Mở rộng form' : 'Thu gọn form'}
          >
            {formCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!formCollapsed && (
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Nhóm 1: Khách hàng & Định danh */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-accent" />
              <span>1. KHÁCH HÀNG & MÃ ĐỊNH DANH TÀI SẢN</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Khách hàng sở hữu / CIF *
                </label>
                <select
                  required
                  value={inputCustomerId}
                  onChange={e => setInputCustomerId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                >
                  <option value="">-- Chọn Khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.Id} value={c.Id}>
                      {c.FullName} ({c.CifKh})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Mã TSBĐ / Số Giấy Chứng Nhận
                </label>
                <input
                  type="text"
                  value={inputAssetCode}
                  onChange={e => setInputAssetCode(e.target.value)}
                  placeholder="GCN-2026-001..."
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Phân loại Tài sản bảo đảm *
                </label>
                <select
                  required
                  value={inputAssetType}
                  onChange={e => {
                    const newType = e.target.value;
                    setInputAssetType(newType);
                    setInputLtvPercent(String(defaultLtvForAssetType(newType)));
                  }}
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                >
                  {COLLATERAL_ASSET_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Vị trí & Thẩm định giá */}
          <div className="space-y-2.5 pt-2 border-t border-line/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-accent" />
              <span>2. THÔNG TIN ĐỊA CHỈ & GIÁ TRỊ ĐỊNH GIÁ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div className="md:col-span-2">
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Địa chỉ / Vị trí / Mô tả tài sản
                </label>
                <input
                  type="text"
                  value={inputAddress}
                  onChange={e => setInputAddress(e.target.value)}
                  placeholder="123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM..."
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Giá trị định giá (VNĐ) *
                </label>
                <input
                  type="text"
                  required
                  value={inputAppraisedValue}
                  onChange={e => setInputAppraisedValue(e.target.value)}
                  placeholder="3.000.000.000..."
                  className={`w-full rounded-[var(--r-control)] p-2.5 font-mono font-bold text-pos border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Tỷ lệ LTV áp dụng (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="100"
                  required
                  value={inputLtvPercent}
                  onChange={e => setInputLtvPercent(e.target.value)}
                  className={`w-full rounded-[var(--r-control)] p-2.5 font-mono font-bold text-accent border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
            </div>
          </div>

          {/* Nhóm 3: Thời hạn định giá */}
          <div className="space-y-2.5 pt-2 border-t border-line/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>3. NGÀY ĐỊNH GIÁ & THỜI HẠN HIỆU LỰC</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Ngày định giá gần nhất
                </label>
                <DateInput
                  value={inputAppraisalDate}
                  onChange={val => setInputAppraisalDate(val)}
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] font-semibold text-ink-muted ${UI.labelStyle}`}>
                  Thời hạn định giá (Tháng)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={inputAppraisalTenorMonths}
                  onChange={e => setInputAppraisalTenorMonths(Number(e.target.value) || 12)}
                  className={`w-full rounded-[var(--r-control)] p-2.5 border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
                />
              </div>
            </div>
          </div>

          <div className="py-3 border-y border-line flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--r-control)] bg-accent-soft text-accent shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-ink-faint font-semibold">
                  Hạn mức cấp tín dụng tối đa tính theo LTV ({ltvVal}%):
                </div>
                <div className="text-base sm:text-lg font-mono font-extrabold text-accent mt-0.5 tracking-tight">
                  {fmtMoney(maxLoanCapacity)}
                </div>
              </div>
            </div>

            <div className="border-l border-line/60 pl-4">
              <div className="text-[11px] text-ink-faint font-semibold">
                Ngày hết hạn định giá (Tự động tính):
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-warn mt-0.5">
                {inputAppraisalExpiryDate || '—'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:opacity-95 disabled:opacity-60 text-accent-ink font-bold py-2.5 px-4 rounded-[var(--r-control)] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-accent/25 active:scale-98"
            >
              {selectedCollateral ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {loading
                  ? 'Đang lưu...'
                  : selectedCollateral
                  ? 'CẬP NHẬT TÀI SẢN'
                  : '+ LƯU TÀI SẢN BẢO ĐẢM MỚI'}
              </span>
            </button>
            {selectedCollateral && (
              <button
                type="button"
                onClick={handleReset}
                className="bg-surface hover:bg-surface/80 border border-line/70 text-ink-muted hover:text-ink font-bold py-2.5 px-4 rounded-[var(--r-control)] transition-colors cursor-pointer shadow-2xs"
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

