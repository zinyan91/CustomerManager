import React, { memo, useState } from 'react';
import { UserCheck, User, Users, Trash2, Sparkles, Plus, Check, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import type { Customer } from '../../types';
import { UI, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER } from '../../lib/uiClasses';
import { formatNationalId } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { CCCD_ISSUE_PLACES } from '../../lib/documentOptions';

interface CustomerDrawerFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  drawerTab?: 'basic' | 'khlq';
  setDrawerTab?: (tab: 'basic' | 'khlq') => void;
  formState: {
    inputCif: string; setInputCif: (v: string) => void;
    inputFullName: string; setInputFullName: (v: string) => void;
    inputNationalId: string; setInputNationalId: (v: string) => void;
    inputIdCardIssueDate: string; setInputIdCardIssueDate: (v: string) => void;
    inputIdCardIssuePlace: string; setInputIdCardIssuePlace: (v: string) => void;
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
  onSave: (e?: React.FormEvent, options?: { continueAdding?: boolean }) => void;
  onDelete: () => void;
  onParseSnippet?: (raw: string) => void;
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';

export const CustomerDrawerForm = memo<CustomerDrawerFormProps>(({
  isOpen,
  onClose,
  selectedCustomer,
  formState,
  onSave,
  onDelete,
  onParseSnippet,
}) => {
  const [smartPasteOpen, setSmartPasteOpen] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [showKhlqManualToggle, setShowKhlqManualToggle] = useState(false);


  const handleApplySmartPaste = () => {
    if (onParseSnippet && smartPasteText.trim()) {
      onParseSnippet(smartPasteText);
      setSmartPasteText('');
      setSmartPasteOpen(false);
    }
  };

  const isMarried = formState.inputMaritalStatus === 'Đã kết hôn';
  const hasKhlqRelation = formState.inputKhlqRelationship !== 'Không có KHLQ';
  const shouldShowKhlqSection = isMarried || hasKhlqRelation || showKhlqManualToggle;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="p-0 overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:px-6 bg-surface/40 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft border border-accent/30 text-accent shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-ink uppercase tracking-tight flex items-center gap-2">
                <span>{selectedCustomer ? `HỒ SƠ KHÁCH HÀNG: ${selectedCustomer.FullName}` : 'TẠO HỒ SƠ KHÁCH HÀNG MỚI'}</span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-ink-faint">
                {selectedCustomer ? `Mã CIF: ${selectedCustomer.CifKh}` : 'Điền thông tin hoặc dùng tính năng Dán nhanh để tự động nhận diện'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            {!selectedCustomer && onParseSnippet && (
              <button
                type="button"
                onClick={() => setSmartPasteOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  smartPasteOpen
                    ? 'bg-accent text-accent-ink border-accent shadow-xs'
                    : 'bg-panel-muted text-accent border-accent/30 hover:bg-accent-soft'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dán nhanh</span>
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Smart Paste Expandable Area */}
        {smartPasteOpen && (
          <div className="p-4 bg-accent-soft/20 border-b border-accent/20 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-[11px] text-accent font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Dán chuỗi văn bản (Email, tin nhắn, ghi chú CIF/CCCD/SĐT/Tên...) để tự động bóc tách:
              </span>
              <button
                type="button"
                onClick={() => setSmartPasteOpen(false)}
                className="text-ink-faint hover:text-ink"
              >
                Đóng
              </button>
            </div>
            <textarea
              rows={3}
              value={smartPasteText}
              onChange={e => setSmartPasteText(e.target.value)}
              placeholder="Ví dụ: CIF: 005299617 - KH: NGUYEN VAN AN - CCCD: 079090001234 - SDT: 0909123456 - STK: 190333444555 - ĐC: 123 Lê Lợi, Q1, TPHCM"
              className={`w-full p-2.5 rounded-lg text-xs font-mono border ${UI.inputStyle}`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSmartPasteText('')}
                className="px-3 py-1 rounded-md text-[11px] text-ink-faint hover:text-ink"
              >
                Xóa văn bản
              </button>
              <button
                type="button"
                onClick={handleApplySmartPaste}
                disabled={!smartPasteText.trim()}
                className={`${BTN_PRIMARY} px-3.5 py-1.5 text-xs flex items-center gap-1.5`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Nhận diện & Tự điền</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body - Single Flow */}
        <form
          onSubmit={(e) => onSave(e)}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs custom-scrollbar"
        >
          {/* Section 1: Định danh chính */}
          <div className="bg-panel-muted/30 border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-wider text-[11px] border-b border-line pb-2">
              <User className="w-4 h-4 text-accent" />
              <span>1. Thông tin Định danh Khách hàng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-ink">
                  Mã CIF Khách hàng <span className="text-neg">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus={!selectedCustomer}
                  placeholder="005299617..."
                  value={formState.inputCif}
                  onChange={(e) => formState.setInputCif(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${UI.inputStyle}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1 text-ink">
                  Họ và Tên Khách hàng (Tự động viết HOA) <span className="text-neg">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="NGUYỄN VĂN AN..."
                  value={formState.inputFullName}
                  onChange={(e) => formState.setInputFullName(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-bold text-sm text-ink ${UI.inputStyle}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-ink">Số CCCD / CMND (12 số / 9 số)</label>
                <input
                  type="text"
                  placeholder="0790 9200 1234..."
                  inputMode="numeric"
                  value={formatNationalId(formState.inputNationalId)}
                  onChange={(e) => formState.setInputNationalId(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-mono font-semibold ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Ngày cấp CCCD</label>
                <DateInput
                  value={formState.inputIdCardIssueDate}
                  onChange={formState.setInputIdCardIssueDate}
                  placeholder="DD/MM/YYYY"
                  className={`w-full rounded-lg p-2.5 font-semibold ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Nơi cấp CCCD</label>
                <input
                  type="text"
                  list="cccd-places-list"
                  placeholder="Chọn hoặc nhập nơi cấp..."
                  value={formState.inputIdCardIssuePlace}
                  onChange={(e) => formState.setInputIdCardIssuePlace(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-semibold ${UI.inputStyle}`}
                />
                <datalist id="cccd-places-list">
                  {CCCD_ISSUE_PLACES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-ink">Tình trạng hôn nhân</label>
              <select
                value={formState.inputMaritalStatus}
                onChange={(e) => formState.setInputMaritalStatus(e.target.value)}
                className={`w-full rounded-lg p-2.5 font-semibold ${UI.inputStyle}`}
              >
                <option value="Độc thân">Độc thân</option>
                <option value="Đã kết hôn">Đã kết hôn (Kèm thông tin Vợ/Chồng)</option>
                <option value="Ly hôn">Ly hôn</option>
                <option value="Góa">Góa</option>
              </select>
            </div>
          </div>

          {/* Section 2: Liên hệ & Tài khoản */}
          <div className="bg-panel-muted/30 border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-wider text-[11px] border-b border-line pb-2">
              <Phone className="w-4 h-4 text-accent" />
              <span>2. Thông tin Liên lạc & Tài khoản Ngân hàng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-ink">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0909123456..."
                  value={formState.inputPhone}
                  onChange={(e) => formState.setInputPhone(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-mono ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Số tài khoản (STK)</label>
                <input
                  type="text"
                  placeholder="190333444555..."
                  value={formState.inputAccountNumber}
                  onChange={(e) => formState.setInputAccountNumber(e.target.value)}
                  className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${UI.inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-ink">Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com..."
                  value={formState.inputEmail}
                  onChange={(e) => formState.setInputEmail(e.target.value)}
                  className={`w-full rounded-lg p-2.5 ${UI.inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-ink">Địa chỉ liên lạc thường trú</label>
              <textarea
                rows={2}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                value={formState.inputAddress}
                onChange={(e) => formState.setInputAddress(e.target.value)}
                className={`w-full rounded-lg p-2.5 ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Section 3: Người liên quan & Vợ / Chồng */}
          <div className="bg-panel-muted/30 border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-wider text-[11px]">
                <Users className="w-4 h-4 text-accent" />
                <span>3. Người liên quan (KHLQ) / Vợ Chồng / Người bảo lãnh</span>
              </div>

              {!isMarried && (
                <button
                  type="button"
                  onClick={() => setShowKhlqManualToggle(prev => !prev)}
                  className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1"
                >
                  {shouldShowKhlqSection ? (
                    <><span>Thu gọn</span><ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <><span>+ Thêm người bảo lãnh/KHLQ</span><ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </div>

            {shouldShowKhlqSection ? (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-ink">Mối quan hệ KHLQ / Bảo lãnh</label>
                    <select
                      value={formState.inputKhlqRelationship}
                      onChange={(e) => formState.setInputKhlqRelationship(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-bold text-accent ${UI.inputStyle}`}
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

                  <div>
                    <label className="block font-semibold mb-1 text-ink">
                      Họ tên KHLQ / Vợ Chồng {isMarried && <span className="text-neg">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="NGUYỄN THỊ MAI..."
                      value={formState.inputSpouseName}
                      onChange={(e) => formState.setInputSpouseName(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-bold text-ink ${UI.inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-ink">Mã CIF KHLQ</label>
                    <input
                      type="text"
                      placeholder="005236684..."
                      value={formState.inputCifKhlq}
                      onChange={(e) => formState.setInputCifKhlq(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${UI.inputStyle}`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">Số CCCD KHLQ</label>
                    <input
                      type="text"
                      placeholder="Số CCCD..."
                      inputMode="numeric"
                      value={formatNationalId(formState.inputSpouseNationalId)}
                      onChange={(e) => formState.setInputSpouseNationalId(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-mono ${UI.inputStyle}`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">SĐT KHLQ</label>
                    <input
                      type="text"
                      placeholder="0912345678..."
                      value={formState.inputSpousePhone}
                      onChange={(e) => formState.setInputSpousePhone(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-mono ${UI.inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-ink">STK Ngân hàng KHLQ</label>
                    <input
                      type="text"
                      placeholder="Số tài khoản..."
                      value={formState.inputSpouseAccountNumber}
                      onChange={(e) => formState.setInputSpouseAccountNumber(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${UI.inputStyle}`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">Địa chỉ KHLQ</label>
                    <input
                      type="text"
                      placeholder="Địa chỉ..."
                      value={formState.inputKhlqAddress}
                      onChange={(e) => formState.setInputKhlqAddress(e.target.value)}
                      className={`w-full rounded-lg p-2.5 ${UI.inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-faint italic py-1">
                Khách hàng độc thân hoặc không có người liên quan/bảo lãnh. Bấm nút phía trên nếu cần bổ sung.
              </p>
            )}
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-panel -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:px-6 z-10 shadow-lg">
            {selectedCustomer ? (
              <button
                type="button"
                onClick={onDelete}
                className={`${BTN_DANGER} text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>XOÁ KHÁCH HÀNG</span>
              </button>
            ) : (
              <div className="text-[11px] text-ink-faint hidden sm:block">
                Mẹo: Nhấn <kbd className="px-1.5 py-0.5 rounded bg-panel-muted border border-line font-mono font-bold text-ink">Ctrl + Enter</kbd> để lưu nhanh
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-line bg-panel-muted text-ink-muted hover:text-ink font-semibold text-xs transition-colors"
              >
                HỦY BỎ
              </button>

              {!selectedCustomer && (
                <button
                  type="button"
                  onClick={() => onSave(undefined, { continueAdding: true })}
                  className={`${BTN_SECONDARY} px-4 py-2 text-xs flex items-center gap-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>LƯU & TIẾP TỤC THÊM</span>
                </button>
              )}

              <button
                type="submit"
                className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-5 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ' : 'LƯU HỒ SƠ KH'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CustomerDrawerForm.displayName = 'CustomerDrawerForm';
