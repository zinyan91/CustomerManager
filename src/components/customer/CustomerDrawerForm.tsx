import React, { memo } from 'react';
import { UserCheck, X, User, Users, Trash2 } from 'lucide-react';
import type { Customer } from '../../types';
import { UI, BTN_DANGER } from '../../lib/uiClasses';
import { formatNationalId } from '../../lib/utils';

interface CustomerDrawerFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  drawerTab: 'basic' | 'khlq';
  setDrawerTab: (tab: 'basic' | 'khlq') => void;
  formState: {
    inputCif: string; setInputCif: (v: string) => void;
    inputFullName: string; setInputFullName: (v: string) => void;
    inputNationalId: string; setInputNationalId: (v: string) => void;
    inputPhone: string; setInputPhone: (v: string) => void;
    inputEmail: string; setInputEmail: (v: string) => void;
    inputAddress: string; setInputAddress: (v: string) => void;
    inputAccountNumber: string; setInputAccountNumber: (v: string) => void;
    inputMaritalStatus: string; setInputMaritalStatus: (v: string) => void;
    inputCifKhlq: string; setInputCifKhlq: (v: string) => void;
    inputKhlqRelationship: string; setInputKhlqRelationship: (v: string) => void;
    inputSpouseName: string; setInputSpouseName: (v: string) => void;
    inputSpouseNationalId: string; setInputSpouseNationalId: (v: string) => void;
    inputSpousePhone: string; setInputSpousePhone: (v: string) => void;
    inputSpouseAccountNumber: string; setInputSpouseAccountNumber: (v: string) => void;
    inputKhlqAddress: string; setInputKhlqAddress: (v: string) => void;
  };
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
}

export const CustomerDrawerForm = memo<CustomerDrawerFormProps>(({
  isOpen,
  onClose,
  selectedCustomer,
  drawerTab,
  setDrawerTab,
  formState,
  onSave,
  onDelete,
}) => {
  if (!isOpen) return null;

  const inputStyle = UI.inputStyle;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-panel border-l border-line-strong shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200 text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div className="p-4 border-b border-line bg-panel-muted/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-soft border border-accent/30 text-accent">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                {selectedCustomer ? `HỒ SƠ KHÁCH HÀNG: ${selectedCustomer.FullName}` : 'TẠO HỒ SƠ KHÁCH HÀNG MỚI'}
              </h3>
              <p className="text-[11px] text-ink-faint">
                {selectedCustomer ? `Mã CIF: ${selectedCustomer.CifKh}` : 'Nhập đầy đủ thông tin cá nhân & người liên quan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-panel transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Drawer */}
        <div className="flex items-center border-b border-line px-4 bg-panel">
          <button
            type="button"
            onClick={() => setDrawerTab('basic')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all ${
              drawerTab === 'basic'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Thông Tin Cá Nhân & Liên Lạc</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('khlq')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all ${
              drawerTab === 'khlq'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Hôn Nhân & Người Liên Quan (KHLQ)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {drawerTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-ink">Mã CIF KH *</label>
                  <input
                    type="text"
                    required
                    placeholder="005299617..."
                    value={formState.inputCif}
                    onChange={(e) => formState.setInputCif(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-ink">Số CCCD / CMND</label>
                  <input
                    type="text"
                    placeholder="0700 9100..."
                    inputMode="numeric"
                    value={formatNationalId(formState.inputNationalId)}
                    onChange={(e) => formState.setInputNationalId(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-mono font-semibold ${inputStyle}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Họ và Tên Khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="ĐỊNH TIÊN HOÀNG..."
                  value={formState.inputFullName}
                  onChange={(e) => formState.setInputFullName(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-bold text-sm text-ink ${inputStyle}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-ink">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="0909123456 / 0912345678..."
                    value={formState.inputPhone}
                    onChange={(e) => formState.setInputPhone(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-ink">Số tài khoản (STK) KH</label>
                  <input
                    type="text"
                    placeholder="190333... / 190444..."
                    value={formState.inputAccountNumber}
                    onChange={(e) => formState.setInputAccountNumber(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Địa chỉ email</label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com..."
                  value={formState.inputEmail}
                  onChange={(e) => formState.setInputEmail(e.target.value)}
                  className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Địa chỉ liên lạc thường trú</label>
                <textarea
                  rows={3}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  value={formState.inputAddress}
                  onChange={(e) => formState.setInputAddress(e.target.value)}
                  className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                />
              </div>
            </div>
          )}

          {drawerTab === 'khlq' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-ink">Tình trạng hôn nhân *</label>
                  <select
                    value={formState.inputMaritalStatus}
                    onChange={(e) => formState.setInputMaritalStatus(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-semibold ${inputStyle}`}
                  >
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                    <option value="Ly hôn">Ly hôn</option>
                    <option value="Góa">Góa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-ink">Mối quan hệ KHLQ / Bảo lãnh *</label>
                  <select
                    value={formState.inputKhlqRelationship}
                    onChange={(e) => formState.setInputKhlqRelationship(e.target.value)}
                    className={`w-full rounded-lg p-2.5 font-bold text-accent ${inputStyle}`}
                  >
                    <option value="Vợ / Chồng">Vợ / Chồng</option>
                    <option value="Người bảo lãnh">Người bảo lãnh thanh toán</option>
                    <option value="Bên bảo đảm (Chủ TSĐB)">Bên bảo đảm (Chủ TSĐB)</option>
                    <option value="Bố / Mẹ">Bố / Mẹ</option>
                    <option value="Con cái">Con cái</option>
                    <option value="Đại diện pháp luật">Đại diện pháp luật / Chủ DN</option>
                    <option value="Khác">Khác / Người liên quan</option>
                    <option value="Không có KHLQ">Không có KHLQ</option>
                  </select>
                </div>
              </div>

              {formState.inputKhlqRelationship !== 'Không có KHLQ' && (
                <div className="space-y-4 pt-3 border-t border-line">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Mã CIF KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="005236684..."
                        value={formState.inputCifKhlq}
                        onChange={(e) => formState.setInputCifKhlq(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Họ tên KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Họ tên Vợ/Chồng hoặc Người bảo lãnh..."
                        value={formState.inputSpouseName}
                        onChange={(e) => formState.setInputSpouseName(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-bold text-ink ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Số CCCD KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số CCCD..."
                        inputMode="numeric"
                        value={formatNationalId(formState.inputSpouseNationalId)}
                        onChange={(e) => formState.setInputSpouseNationalId(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">SĐT KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="SĐT, nhiều số cách nhau bằng /"
                        value={formState.inputSpousePhone}
                        onChange={(e) => formState.setInputSpousePhone(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">STK KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số tài khoản..."
                        value={formState.inputSpouseAccountNumber}
                        onChange={(e) => formState.setInputSpouseAccountNumber(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Địa chỉ KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Địa chỉ..."
                        value={formState.inputKhlqAddress}
                        onChange={(e) => formState.setInputKhlqAddress(e.target.value)}
                        className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Sticky Actions */}
          <div className="border-t border-line pt-4 flex items-center justify-between gap-3 sticky bottom-0 bg-panel">
            {selectedCustomer && (
              <button
                type="button"
                onClick={onDelete}
                className={`${BTN_DANGER} text-xs py-2.5 px-4 rounded-lg flex items-center space-x-1.5`}
              >
                <Trash2 className="w-4 h-4" />
                <span>XOÁ KHÁCH HÀNG</span>
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-line bg-panel-muted text-ink-muted hover:text-ink font-semibold text-xs transition-colors"
              >
                HỦY BỎ
              </button>
              <button
                type="submit"
                className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2.5 px-5 rounded-lg transition-all shadow-xs"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ' : 'LƯU HỒ SƠ MỚI'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});

CustomerDrawerForm.displayName = 'CustomerDrawerForm';
